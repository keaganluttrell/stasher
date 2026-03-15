---
title: 'AutoProxy: Technical Specification'
description: >-
  On-site system architecture, data model, message processing flow, OTP process
  design, and Ash framework integration for AutoProxy.
date: 2025-03-14T00:00:00.000Z
group: projects/autoproxy
type: doc
id: projects/autoproxy/TECHNICAL_SPEC
---

# AutoProxy Technical Specification

## Status: Draft

## Problem Statement

Hospitality operations suffer from constant "shoulder tapping" -- staff interrupt each other with questions that could be answered from existing knowledge, routed to the right person automatically, or batched until a natural break. The result is fragmented attention, delayed responses, and operational overhead that scales linearly with headcount.

AutoProxy is an intelligent message proxy layer that sits inside Amos's Comms domain. It analyzes messages in real time to route them to the right recipient, filter by urgency, suggest responses, and -- at high confidence -- respond automatically to factual queries. The goal is to free human time for work that matters.

---

## 1. System Architecture

### 1.1 Domain Placement: Extension of Comms, Not a New Domain

AutoProxy is NOT a separate domain. It is a new module namespace within the existing Comms domain (`Amos.Comms.AutoProxy.*`) with its own Ash resources registered on `Amos.Comms`.

**Rationale:**
- AutoProxy's lifecycle is tightly coupled to Message creation -- it intercepts, classifies, routes, and potentially responds within the same message flow.
- A separate domain would introduce a cross-domain dependency cycle: Comms depends on AutoProxy for routing, AutoProxy depends on Comms for message creation. Keeping them in one domain avoids this.
- The authorization model is identical -- channel membership governs who AutoProxy can act on behalf of.
- A separate domain would be architecture astronautics. AutoProxy is a behavior layer on messages, not a distinct bounded context.

**What this means concretely:**
- New resources live at `lib/amos/comms/auto_proxy/` (e.g. `routing_rule.ex`, `message_classification.ex`)
- New Ash resources are registered in `Amos.Comms` under its `resources` block
- OTP processes (GenServers, Oban workers) live at `lib/amos/comms/auto_proxy/`
- The `Amos.Comms` domain module gets new code interface definitions for AutoProxy actions

### 1.2 Architectural Layers

```
                         Message Create Action
                                |
                    +-----------v-----------+
                    |   Ash.Notifier        |
                    |   (MessageCreated)     |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |  AutoProxy.Dispatcher  |
                    |  (Oban Worker)         |
                    +-----------+-----------+
                                |
              +-----------------+-----------------+
              |                 |                 |
     +--------v------+ +-------v-------+ +-------v-------+
     |  Classifier   | |   Router      | |  Responder    |
     |  (Phase 1+2)  | |   (Phase 1)   | |  (Phase 3+4)  |
     +---------+------+ +-------+-------+ +-------+-------+
              |                 |                 |
              +--------+--------+---------+-------+
                       |                  |
              +--------v--------+ +-------v-------+
              |  Knowledge Base | |  LLM Gateway  |
              |  (Ash Resources)| |  (GenServer)  |
              +----------------+ +----------------+
```

**Key constraint:** AutoProxy is asynchronous to message creation. The `create_message` action completes normally, the message is persisted, and AutoProxy processes it in the background via an Oban job. Users never wait for AI inference during message send.

### 1.3 Why Oban (Not Inline GenServer)

The Comms domain already defers several features to "when Oban is introduced" (DEFERRED.md). AutoProxy is the forcing function. Reasons:

1. **Reliability** -- LLM API calls fail. Oban gives us retries with backoff, dead-letter visibility, and job-level telemetry out of the box.
2. **Observability** -- Every AutoProxy decision is an Oban job with a queryable lifecycle. No hidden GenServer state.
3. **Rate limiting** -- LLM APIs have rate limits. Oban queues with concurrency limits handle this natively.
4. **Ordering guarantees** -- Messages within a channel should be processed in order. Oban's `unique` constraint per channel_id prevents concurrent processing of the same channel.

**Exception:** The LLM Gateway (Section 5) is a GenServer because it manages connection pooling, circuit breaking, and token budget tracking across all Oban workers. It is stateful infrastructure, not a job.

---

## 2. Data Model

### 2.1 New Resources

All new resources are registered in the `Amos.Comms` domain. None use multi-tenancy (Comms is global, membership-scoped).

#### 2.1.1 AutoProxyConfig

Per-property AutoProxy configuration. Property-scoped.

```
Amos.Comms.AutoProxy.Config

Table: auto_proxy_configs

Attributes:
  uuid_v7_primary_key :id
  attribute :enabled, :boolean, default: false            # Kill switch
  attribute :routing_enabled, :boolean, default: false    # Phase 1
  attribute :filtering_enabled, :boolean, default: false  # Phase 2
  attribute :suggestions_enabled, :boolean, default: false # Phase 3
  attribute :auto_response_enabled, :boolean, default: false # Phase 4
  attribute :auto_response_confidence_threshold, :decimal, default: 0.95
  attribute :focus_mode_default, :boolean, default: false
  attribute :excluded_channel_ids, {:array, :uuid_v7}, default: []
  update_timestamp :updated_at

Relationships:
  belongs_to :property, Amos.Property.Property, allow_nil?: false

Identities:
  identity :unique_property, [:property_id]
```

**Design note:** This is NOT multi-tenanted via Ash multitenancy because it is one-per-property, not many-per-property. A simple `belongs_to :property` with a unique identity is cleaner. Queried as `Amos.Comms.get_auto_proxy_config_for_property(property_id)`.

#### 2.1.2 MessageClassification

Immutable classification record attached to each processed message. This is the audit trail.

```
Amos.Comms.AutoProxy.MessageClassification

Table: message_classifications

Attributes:
  uuid_v7_primary_key :id
  attribute :intent, Amos.Comms.AutoProxy.Types.MessageIntent, allow_nil?: false
    # :question, :request, :update, :complaint, :greeting, :acknowledgment, :escalation
  attribute :urgency, Amos.Comms.AutoProxy.Types.Urgency, allow_nil?: false
    # :critical, :high, :normal, :low, :batch
  attribute :department, Amos.Identity.Types.Role, allow_nil?: true
    # Which department this message concerns (nullable if ambiguous)
  attribute :confidence, :decimal, allow_nil?: false
    # 0.0 - 1.0 confidence in the classification
  attribute :topics, {:array, :string}, default: []
    # Free-form topic tags extracted from content: ["pool_hours", "checkout", "towels"]
  attribute :action_taken, Amos.Comms.AutoProxy.Types.ActionTaken, allow_nil?: false
    # :none, :routed, :filtered, :suggested, :auto_responded
  attribute :routed_to_user_id, :uuid_v7, allow_nil?: true
    # If routed, who it was routed to
  attribute :suggested_response, :string, allow_nil?: true
    # The suggested/auto response text (null if none)
  attribute :auto_response_sent, :boolean, default: false
  attribute :escalated, :boolean, default: false
  attribute :escalation_reason, :string, allow_nil?: true
  attribute :llm_model, :string, allow_nil?: false
    # Which model produced this classification (for debugging/auditing)
  attribute :llm_latency_ms, :integer, allow_nil?: true
  attribute :token_count, :integer, allow_nil?: true

Relationships:
  belongs_to :message, Amos.Comms.Message, allow_nil?: false

Identities:
  identity :unique_message, [:message_id]
```

**Immutable by design.** No update actions. If a classification is wrong, the human override creates an `AutoProxyFeedback` record (Section 2.1.5), not a mutation.

#### 2.1.3 RoutingRule

Declarative routing rules that supplement LLM inference. These encode operational knowledge that should not depend on LLM quality -- e.g., "messages mentioning 'broken' in a maintenance context always go to the on-duty maintenance worker."

```
Amos.Comms.AutoProxy.RoutingRule

Table: routing_rules

Attributes:
  uuid_v7_primary_key :id
  attribute :name, :string, allow_nil?: false, max_length: 255
  attribute :description, :string, allow_nil?: true, max_length: 1024
  attribute :priority, :integer, allow_nil?: false, default: 100
    # Lower number = higher priority. Rules evaluated in priority order.
  attribute :active, :boolean, default: true

  # Match conditions (all must match for rule to fire)
  attribute :match_channel_types, {:array, Amos.Comms.Types.ChannelType}, default: []
    # Empty = match all
  attribute :match_intents, {:array, Amos.Comms.AutoProxy.Types.MessageIntent}, default: []
  attribute :match_keywords, {:array, :string}, default: []
    # Simple keyword presence check (case-insensitive). OR logic within array.
  attribute :match_department, Amos.Identity.Types.Role, allow_nil?: true

  # Route target
  attribute :route_to_role, Amos.Identity.Types.Role, allow_nil?: true
    # Route to the on-duty person with this role
  attribute :route_to_user_id, :uuid_v7, allow_nil?: true
    # Route to a specific user (overrides role-based routing)
  attribute :route_to_channel_id, :uuid_v7, allow_nil?: true
    # Forward to a specific channel

  update_timestamp :updated_at

Relationships:
  belongs_to :property, Amos.Property.Property, allow_nil?: false

Identities:
  identity :unique_name_property, [:name, :property_id]
```

**Why declarative rules AND LLM?** Rules handle the 80% case deterministically -- no LLM latency, no token cost, predictable behavior. The LLM handles the 20% that requires understanding nuance. Rules are evaluated first; if no rule matches, the LLM classifies and routes.

#### 2.1.4 KnowledgeEntry

Property-specific knowledge that AutoProxy can draw from when generating responses. This is the RAG corpus.

```
Amos.Comms.AutoProxy.KnowledgeEntry

Table: knowledge_entries

Attributes:
  uuid_v7_primary_key :id
  attribute :category, Amos.Comms.AutoProxy.Types.KnowledgeCategory, allow_nil?: false
    # :policy, :faq, :procedure, :contact_info, :hours, :pricing, :amenity, :location
  attribute :title, :string, allow_nil?: false, max_length: 255
  attribute :body, :string, allow_nil?: false, max_length: 8192
  attribute :tags, {:array, :string}, default: []
    # Searchable tags: ["pool", "hours", "summer"]
  attribute :active, :boolean, default: true
  attribute :effective_from, :date, allow_nil?: true
  attribute :effective_until, :date, allow_nil?: true
    # Seasonal knowledge (summer pool hours vs winter)
  attribute :embedding, {:array, :float}, allow_nil?: true
    # Vector embedding for semantic search. Nullable until computed.
  update_timestamp :updated_at

Relationships:
  belongs_to :property, Amos.Property.Property, allow_nil?: false
  belongs_to :created_by, Amos.Identity.User, allow_nil?: false
```

**Embedding storage:** Postgres `pgvector` extension for vector similarity search. The embedding is computed asynchronously via an Oban job when a KnowledgeEntry is created or updated. This avoids blocking the write path on an LLM embedding call.

**Why not fine-tuning?** Fine-tuning is expensive, slow to iterate, and hard to audit. RAG with property-specific knowledge entries gives us:
- Instant updates (change a knowledge entry, next query uses it)
- Full traceability (the response cites which entries it used)
- Per-property isolation (no cross-contamination between properties)
- Simple correctness testing (entry says X, response should say X)

#### 2.1.5 AutoProxyFeedback

Human feedback on AutoProxy actions. Drives the learning loop.

```
Amos.Comms.AutoProxy.Feedback

Table: auto_proxy_feedback

Attributes:
  uuid_v7_primary_key :id
  attribute :feedback_type, Amos.Comms.AutoProxy.Types.FeedbackType, allow_nil?: false
    # :approved, :rejected, :corrected, :escalated_manually
  attribute :correction_text, :string, allow_nil?: true, max_length: 4096
    # If corrected, what the right answer was
  attribute :correct_route_to_user_id, :uuid_v7, allow_nil?: true
    # If routing was wrong, who should it have gone to
  attribute :notes, :string, allow_nil?: true, max_length: 1024

Relationships:
  belongs_to :classification, Amos.Comms.AutoProxy.MessageClassification, allow_nil?: false
  belongs_to :submitted_by, Amos.Identity.User, allow_nil?: false

Identities:
  identity :unique_classification_user, [:classification_id, :submitted_by_id]
```

#### 2.1.6 UserProxyPreference

Per-user AutoProxy preferences (focus mode, auto-response opt-in).

```
Amos.Comms.AutoProxy.UserPreference

Table: auto_proxy_user_preferences

Attributes:
  uuid_v7_primary_key :id
  attribute :focus_mode, :boolean, default: false
  attribute :focus_mode_until, :utc_datetime, allow_nil?: true
    # Temporary focus mode with auto-expire
  attribute :batch_urgency_below, Amos.Comms.AutoProxy.Types.Urgency, default: :low
    # In focus mode, batch messages below this urgency
  attribute :auto_response_opt_in, :boolean, default: false
    # User consents to AutoProxy sending responses on their behalf
  attribute :quiet_hours_start, :time, allow_nil?: true
  attribute :quiet_hours_end, :time, allow_nil?: true
  update_timestamp :updated_at

Relationships:
  belongs_to :user, Amos.Identity.User, allow_nil?: false

Identities:
  identity :unique_user, [:user_id]
```

### 2.2 Enum Types

```elixir
# lib/amos/comms/auto_proxy/types/message_intent.ex
defmodule Amos.Comms.AutoProxy.Types.MessageIntent do
  use Ash.Type.Enum,
    values: [:question, :request, :update, :complaint, :greeting, :acknowledgment, :escalation]
end

# lib/amos/comms/auto_proxy/types/urgency.ex
defmodule Amos.Comms.AutoProxy.Types.Urgency do
  use Ash.Type.Enum,
    values: [:critical, :high, :normal, :low, :batch]
end

# lib/amos/comms/auto_proxy/types/action_taken.ex
defmodule Amos.Comms.AutoProxy.Types.ActionTaken do
  use Ash.Type.Enum,
    values: [:none, :routed, :filtered, :suggested, :auto_responded]
end

# lib/amos/comms/auto_proxy/types/knowledge_category.ex
defmodule Amos.Comms.AutoProxy.Types.KnowledgeCategory do
  use Ash.Type.Enum,
    values: [:policy, :faq, :procedure, :contact_info, :hours, :pricing, :amenity, :location]
end

# lib/amos/comms/auto_proxy/types/feedback_type.ex
defmodule Amos.Comms.AutoProxy.Types.FeedbackType do
  use Ash.Type.Enum,
    values: [:approved, :rejected, :corrected, :escalated_manually]
end
```

### 2.3 Modifications to Existing Resources

**Message** -- Add an optional relationship (no schema change, just a `has_one`):
```elixir
has_one :classification, Amos.Comms.AutoProxy.MessageClassification
```

**Message** -- Add a new `message_type` attribute to distinguish AutoProxy-generated messages:
```elixir
# Extend the existing message to track provenance
attribute :sent_via_auto_proxy, :boolean, default: false
```

This boolean is simpler than a new enum value. AutoProxy-sent messages are still real messages from a real sender (the system user or the person AutoProxy acts on behalf of). The flag lets the UI annotate them.

**Channel** -- No changes. AutoProxy operates on existing channels. It does not create synthetic channels.

---

## 3. Message Flow

### 3.1 Phase 1: Intelligent Routing

**Trigger:** A message is created in a channel where the property has `routing_enabled: true` in its AutoProxyConfig.

**Flow:**

```
1. User sends message via Comms.create_message/3
2. Message persisted normally (Ash action completes)
3. Ash.Notifier fires AutoProxy.Notifier
4. Notifier enqueues Oban job: AutoProxy.Jobs.ProcessMessage
   - queue: :auto_proxy, priority: 1
   - args: %{message_id: message_id}
   - unique: [keys: [:message_id]]

5. Oban worker executes:
   a. Load message + channel + sender context
   b. Load AutoProxyConfig for the channel's property
      - If channel has no property context (direct DM), skip
      - If channel_id is in excluded_channel_ids, skip
   c. Check RoutingRules (deterministic, fast path):
      - Load active rules for property, sorted by priority
      - Evaluate match conditions against message content + classification
      - If rule matches -> route per rule, record classification, done
   d. If no rule matched, call LLM Gateway:
      - Build prompt with message body, channel context, sender role
      - Request: classify intent, urgency, department, suggest route
      - Parse structured response
   e. Persist MessageClassification
   f. Execute routing decision:
      - If routed_to_user_id is set:
        - Check if target user is on-duty (Staff.StaffSchedule query)
        - If on-duty: add user to channel (if not already member), send system message "Routed to {name} by AutoProxy"
        - If off-duty: find next on-duty person with same role, route there
        - If nobody on-duty: escalate to channel owner with system message
      - If route_to_role is set (no specific user):
        - Query on-duty staff with that role at the property
        - Pick the one with fewest active channel memberships (load balance)
        - Same add-to-channel + system message pattern
```

**How routing physically works:**

AutoProxy does NOT move messages between channels. Instead, it ensures the right person is a member of the channel where the message was sent, and optionally sends a notification (system message or push notification via Phase 13 PubSub). The message stays where it was sent.

For cross-channel routing (message sent in #general but should be handled by maintenance), AutoProxy:
1. Creates a thread reply on the original message: "Routing to maintenance"
2. Sends a new message in the department channel (or the assignee's DM) linking back to the original: "New request in #general from {sender}: {summary}. [Link to message]"

This preserves conversation context in both places.

**Fallback behavior:**
- If LLM call fails (timeout, rate limit, error): log the failure, set classification to `action_taken: :none`, do nothing. The message was already delivered normally.
- If routing target cannot be determined: set `escalated: true`, send system message in channel "AutoProxy could not determine a route. Channel members have been notified."

### 3.2 Phase 2: Priority Filtering

**Trigger:** A message is classified (Phase 1 output) AND any recipient has `focus_mode: true` in their UserProxyPreference.

**Flow:**

```
1. Classification complete (from Phase 1 flow, step 5e)
2. For each channel member who is a potential recipient:
   a. Load UserProxyPreference
   b. If focus_mode is false, or focus_mode_until has passed: deliver normally
   c. If focus_mode is true:
      - Compare message urgency against user's batch_urgency_below
      - If urgency >= threshold: deliver immediately (PubSub notification, push)
      - If urgency < threshold: suppress real-time notification, add to batch
3. Batch delivery:
   - Oban cron job: AutoProxy.Jobs.DeliverBatch
   - Runs every 15 minutes (configurable per property)
   - For each user in focus mode:
     - Collect all suppressed messages since last batch
     - Group by channel
     - Send a single digest notification: "While you were focused: 3 messages in #housekeeping, 1 in DM from Maria"
```

**Critical vs non-critical heuristics (LLM-assisted):**

| Urgency | Examples | Focus Mode Behavior |
|---------|----------|---------------------|
| critical | Guest injury, security issue, system down | Always deliver immediately. Override focus mode. |
| high | Guest complaint, checkout issue, blocked task | Deliver immediately unless user set threshold to :critical |
| normal | Standard request, status update | Batch in focus mode |
| low | FYI, acknowledgment, social | Batch in focus mode |
| batch | Automated notifications, system messages | Always batch |

**Quiet hours:** If a user has `quiet_hours_start` and `quiet_hours_end` set, and the current time (in the property's timezone) falls within that window, treat all non-critical messages as batch. Critical messages still deliver immediately -- safety overrides convenience.

### 3.3 Phase 3: Suggested Responses

**Trigger:** A message is classified as `intent: :question` or `intent: :request` AND the property has `suggestions_enabled: true`.

**Flow:**

```
1. After classification (Phase 1, step 5e), if intent is question/request:
   a. Query KnowledgeEntry for relevant entries:
      - Semantic search via pgvector embedding similarity (top 5 entries)
      - Filter by property_id, active: true, effective date range
   b. Build response prompt:
      - System: "You are a hospitality assistant for {property.name}. Generate a suggested response."
      - Context: Top knowledge entries, message thread context (last 5 messages), sender profile
      - Message: The classified message
      - Constraint: "Respond in under 200 words. Be warm but professional. If unsure, say so."
   c. Call LLM Gateway
   d. Store suggested response in MessageClassification.suggested_response
   e. Deliver suggestion to the recipient:
      - NOT as a message in the channel
      - As a transient UI element (delivered via PubSub/Phoenix Channel)
      - Recipient sees: "AutoProxy suggestion: {text}" with [Send] [Edit] [Dismiss] buttons
   f. If recipient clicks [Send]:
      - Create a new Message with the suggested text, sender = the human recipient
      - Set sent_via_auto_proxy: true
   g. If recipient clicks [Edit]:
      - Open message composer pre-filled with suggestion text
   h. If recipient clicks [Dismiss]:
      - Record as AutoProxyFeedback with feedback_type: :rejected
```

**Why suggestions are NOT messages:** A suggestion is a UI affordance, not a conversation artifact. Storing it as a message would pollute the channel history with unconfirmed content. The suggestion lives on the MessageClassification record until the human acts on it.

### 3.4 Phase 4: Auto-Response

**Trigger:** All of the following must be true:
- Property has `auto_response_enabled: true`
- Classification confidence >= property's `auto_response_confidence_threshold` (default 0.95)
- Message intent is `:question` (not `:request` -- requests require human action)
- The suggested response is sourced entirely from KnowledgeEntry content (no hallucination)
- The channel is not in `excluded_channel_ids`
- The intended recipient has `auto_response_opt_in: true`

**Flow:**

```
1. After suggestion generated (Phase 3, step 3d):
   a. Evaluate auto-response eligibility (all conditions above)
   b. If eligible:
      - Verify response against source knowledge entries (citation check)
      - If all claims in the response can be traced to a KnowledgeEntry: proceed
      - If any claim cannot be traced: downgrade to suggestion (Phase 3 flow)
   c. Create Message:
      - body: "{response}\n\n-- Sent by AutoProxy on behalf of {recipient_name}"
      - sender: the recipient (AutoProxy acts on their behalf)
      - sent_via_auto_proxy: true
      - channel: same channel as the original message
      - parent_id: the original message (threaded reply)
   d. Update MessageClassification:
      - auto_response_sent: true
      - action_taken: :auto_responded
   e. Notify the recipient that AutoProxy responded on their behalf:
      - PubSub notification: "AutoProxy answered a question from {sender} in {channel}: {summary}"
      - Include [Review] button that shows the full exchange
```

**The 95% threshold is a starting point, not a target.** In practice, auto-response should be limited to a narrow set of question types where the knowledge base is comprehensive and the answers are verifiable:
- "What time is checkout?" (policy)
- "Where are the extra towels?" (procedure)
- "What are the pool hours?" (hours)
- "Is breakfast included?" (policy)

It should NOT auto-respond to:
- Anything involving money or billing
- Complaints (even if the answer is known)
- Anything requiring judgment about a specific guest situation
- Questions about other guests or staff

These exclusions should be encoded as hard rules in the auto-response eligibility check, not left to LLM confidence alone.

---

## 4. Integration Points

### 4.1 Staff Domain (Routing)

AutoProxy queries StaffSchedule to determine who is on-duty when routing messages.

```elixir
# In AutoProxy.Router
defp find_on_duty_staff(property, role, at_time) do
  Amos.Staff.list_schedules(
    tenant: property,
    filter: [
      status: :scheduled,
      start_time: [less_than_or_equal: at_time],
      end_time: [greater_than: at_time],
      user: [roles: [role: role]]  # Join through User -> UserRole
    ]
  )
end
```

**Fallback chain when nobody is on-duty:**
1. Check if anyone with the role has clocked in (clock_in_at set, clock_out_at nil) regardless of schedule
2. Check the most recently off-duty person with that role (shortest time since their shift ended)
3. Route to channel owner / admin

### 4.2 Reservations Domain (Guest Context)

When a message is in a reservation-linked channel (`channel.type == :reservation`), or mentions a confirmation number, AutoProxy enriches the LLM context:

```elixir
# In AutoProxy.ContextBuilder
defp build_reservation_context(message, channel) do
  case channel.type do
    :reservation ->
      # Channel linked to reservation via Task -> Reservation chain
      # or via a future reservation_id on Channel
      load_reservation_details(channel)
    _ ->
      # Try to extract confirmation number from message body
      case extract_confirmation_number(message.body) do
        nil -> %{}
        number -> load_reservation_by_confirmation(number)
      end
  end
end
```

Reservation context fed to LLM includes: guest name, check-in/check-out dates, villa assignment, reservation status, special notes. This lets AutoProxy give contextual responses like "Mr. Smith in Villa 3 is checking out tomorrow" instead of generic answers.

### 4.3 Tasks Domain (Assignment Awareness)

When routing a message that maps to an existing task (e.g., "the AC in Villa 3 is still broken"), AutoProxy checks for open tasks:

```elixir
defp find_related_tasks(property, message_topics, villa_id) do
  Amos.Tasks.list_tasks_for_property(property.id,
    filter: [
      status: [not_in: ["completed", "verified", "cancelled"]],
      villa_id: villa_id
    ]
  )
end
```

If a related task exists, AutoProxy:
- Routes to the task assignee (not just the department)
- Includes task context in the routing notification: "Related task: 'AC Repair Villa 3' assigned to @Carlos (status: in_progress)"
- Avoids creating duplicate work

### 4.4 Property Domain (Operational Knowledge)

The Property resource provides timezone (for quiet hours, schedule queries), and the AutoProxyConfig is property-scoped. Property attributes (name, address, phone) are included in LLM system prompts so responses sound property-specific.

### 4.5 Identity Domain (Role Resolution)

AutoProxy uses UserRole to resolve routing targets by role. The `Profile` resource provides display names for system messages ("Routed to Maria Rodriguez by AutoProxy" instead of "Routed to user_01JABCDEF").

---

## 5. AI/ML Architecture

### 5.1 LLM Integration Strategy

**Model selection: Anthropic Claude (Haiku for classification, Sonnet for response generation).**

| Task | Model | Latency Budget | Why |
|------|-------|---------------|-----|
| Classification (intent, urgency, department) | Claude Haiku | < 500ms | Fast, cheap. Classification is structured output, does not need deep reasoning. |
| Routing decision (when no rule matches) | Claude Haiku | < 500ms | Same rationale. The LLM suggests a route; deterministic code executes it. |
| Response generation (suggestions + auto) | Claude Sonnet | < 2000ms | Needs nuance, warmth, accuracy. Higher quality justifies the latency since it is async to the sender. |
| Embedding generation | text-embedding-3-small (OpenAI) or equivalent | < 200ms | Batch, async. Not on the hot path. |

**Why not self-hosted / local models?** Amos is a single-business deployment, not a platform serving thousands. The operational complexity of hosting and maintaining a local LLM (GPU provisioning, model updates, fine-tuning pipeline) far exceeds the cost of API calls at hospitality message volumes. A busy property might generate 500-2000 messages per day. At Haiku pricing, that is pennies.

### 5.2 LLM Gateway (GenServer)

```elixir
defmodule Amos.Comms.AutoProxy.LLMGateway do
  @moduledoc """
  Connection pool and circuit breaker for LLM API calls.
  Tracks token usage, enforces rate limits, handles failover.
  """
  use GenServer

  # State:
  # - Circuit breaker state (:closed, :open, :half_open)
  # - Failure count and last failure time
  # - Token usage counter (rolling window, per-minute)
  # - Request queue (when rate limited, queue and drain)

  # Public API:
  def classify(message_text, context, opts \\ [])
  def generate_response(message_text, knowledge_entries, context, opts \\ [])
  def generate_embedding(text, opts \\ [])
end
```

**Circuit breaker behavior:**
- After 3 consecutive failures within 60 seconds: open circuit
- Open circuit: all calls immediately return `{:error, :circuit_open}`, Oban workers retry later
- After 30 seconds: half-open, allow one probe request
- If probe succeeds: close circuit, resume normal operation
- If probe fails: re-open for another 30 seconds

**Token budget:** Configurable daily token limit per property. When exceeded, AutoProxy degrades gracefully:
1. First: disable auto-response (Phase 4), keep suggestions
2. Second: disable suggestions (Phase 3), keep classification
3. Third: disable LLM classification, rely only on RoutingRules (Phase 1 deterministic path)
4. Never: disable routing entirely (deterministic rules have zero token cost)

### 5.3 Prompt Engineering

Classification prompt (structured output):

```
System: You are a message classifier for {property.name}, a hospitality property.
Classify the following message sent in a staff communication channel.

Channel: {channel.name} (type: {channel.type})
Sender: {sender.profile.first_name} {sender.profile.last_name} (role: {sender_role})
Thread context: {last_3_messages_if_reply}

Respond with JSON only:
{
  "intent": "question|request|update|complaint|greeting|acknowledgment|escalation",
  "urgency": "critical|high|normal|low|batch",
  "department": "admin|finance|sales|marketing|manager|front_desk|housekeeper|maintenance|dreamweaver|therapist|null",
  "topics": ["topic1", "topic2"],
  "confidence": 0.0-1.0,
  "route_suggestion": "role:<role>|user:<user_name>|none",
  "reasoning": "brief explanation"
}

Message: {message.body}
```

Response generation prompt:

```
System: You are a helpful assistant for {property.name}. You help staff respond
to questions and requests. Use ONLY the provided knowledge entries to form your
response. If the knowledge entries do not contain enough information to answer
fully, say "I don't have enough information to answer this fully" and suggest
the person ask {fallback_contact}.

Be warm, professional, and concise. Under 200 words.

Knowledge entries:
{top_5_entries_formatted}

Conversation context:
{last_5_messages}

Question to answer: {message.body}

Respond with JSON:
{
  "response": "the suggested response text",
  "source_entry_ids": ["id1", "id2"],
  "confidence": 0.0-1.0,
  "needs_human": true|false,
  "reasoning": "why this response is/isn't confident"
}
```

### 5.4 Knowledge Base Architecture (RAG)

**Storage:** KnowledgeEntry resources in Postgres with pgvector embeddings.

**Retrieval pipeline:**

```
1. Receive message text
2. Generate embedding via LLM Gateway
3. Query: SELECT * FROM knowledge_entries
          WHERE property_id = $1
            AND active = true
            AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
            AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
          ORDER BY embedding <=> $2  -- cosine distance
          LIMIT 5
4. Feed top entries as context to response generation prompt
```

**Why pgvector over a dedicated vector DB?** Amos already uses Postgres. The knowledge base for a single property will be at most a few hundred entries. pgvector handles this trivially. A dedicated vector DB (Pinecone, Weaviate) adds operational complexity for zero benefit at this scale.

**Embedding update flow:**
- KnowledgeEntry created/updated -> Ash.Notifier enqueues Oban job
- Job calls LLM Gateway to generate embedding
- Job updates the KnowledgeEntry's embedding attribute

### 5.5 Feedback Loop

AutoProxyFeedback records drive two improvements:

1. **Rule generation:** If staff repeatedly correct a routing decision the same way (e.g., "messages about pool from housekeeping should go to maintenance, not front desk"), surface this as a suggested RoutingRule to the property admin.

2. **Prompt tuning:** Aggregate feedback metrics (approval rate, correction rate per category) are visible in an admin dashboard. Low-performing categories get reviewed and their prompts or knowledge entries get refined. This is a human-in-the-loop process, not automated fine-tuning.

There is no automated model fine-tuning in the initial design. The feedback loop is: measure -> surface to humans -> humans adjust rules and knowledge entries -> measure again.

---

## 6. Safety and Trust

### 6.1 Transparency

Every AutoProxy action is visible to users:

| Action | User Experience |
|--------|----------------|
| Message classified | Hidden (no user impact, audit only) |
| Message routed | System message in channel: "AutoProxy routed this to @Maria (Maintenance)" |
| Message filtered/batched | Batch notification: "While you were focused: 5 messages batched" |
| Response suggested | Transient UI card with [Send] [Edit] [Dismiss] |
| Auto-response sent | Message body includes "-- Sent by AutoProxy on behalf of @Maria" + notification to Maria |

**No silent actions.** If AutoProxy does something, at least one human knows about it.

### 6.2 Override and Escalation

| Mechanism | How It Works |
|-----------|-------------|
| Dismiss suggestion | Recipient clicks [Dismiss], records negative feedback |
| Correct auto-response | Recipient sends a follow-up; AutoProxy detects the correction and records feedback |
| Manual escalation | Any user can type "/escalate" in a channel to bypass AutoProxy and notify the channel owner + all admins |
| Disable per-channel | Admin adds channel_id to Config.excluded_channel_ids |
| Disable per-user | User sets auto_response_opt_in: false in preferences |
| Global kill switch | Admin sets Config.enabled: false for the property |
| Graduated disable | Each phase (routing, filtering, suggestions, auto-response) has an independent toggle |

### 6.3 Audit Logging

The MessageClassification resource IS the audit log. Every message that AutoProxy processes gets an immutable classification record with:
- What the LLM said (intent, urgency, confidence, reasoning)
- What action was taken (routed, filtered, suggested, auto-responded)
- Which model and how long the inference took
- Whether the action was later overridden (via linked Feedback records)

**Queryable analytics:**
- "What percentage of auto-responses were approved vs rejected this week?"
- "Which department gets the most routed messages?"
- "What is the average confidence score for auto-responses?"
- "How many messages were escalated because AutoProxy could not route?"

### 6.4 Privacy Boundaries

**Excluded by default:**
- Direct message channels (type: :direct) -- private 1:1 conversations are never processed by AutoProxy
- Channels explicitly added to `excluded_channel_ids`

**Included by default (when AutoProxy is enabled):**
- Group channels (type: :group)
- Direct group channels (type: :direct_group)
- Department channels
- Reservation channels
- Task channels

**Data retention:**
- MessageClassification records follow the same archival pattern as Messages (AshArchival)
- LLM request/response payloads are NOT stored (only the structured classification output)
- Knowledge entry embeddings are recomputed, not stored permanently (can be regenerated)

### 6.5 Confidence Thresholds and Degradation

| Confidence Range | Behavior |
|-----------------|----------|
| 0.95+ | Eligible for auto-response (if all other conditions met) |
| 0.80 - 0.94 | Suggestion generated, presented to recipient |
| 0.60 - 0.79 | Classification recorded, routing attempted, no suggestion |
| Below 0.60 | Classification recorded as low-confidence, no action taken |

When LLM is unavailable (circuit open):
- RoutingRules still execute (deterministic, no LLM dependency)
- Classification defaults to `intent: :unknown, urgency: :normal, action_taken: :none`
- No suggestions or auto-responses generated
- System message to property admins: "AutoProxy AI is temporarily unavailable. Deterministic routing rules are still active."

---

## 7. Elixir/Ash Implementation Strategy

### 7.1 Process Architecture

```
Amos.Application supervision tree:

  Amos.Supervisor
    |
    +-- Amos.Repo
    +-- Amos.Endpoint
    +-- Oban (new, added for AutoProxy)
    |     |
    |     +-- Queue :auto_proxy (concurrency: 5)
    |     +-- Queue :auto_proxy_batch (concurrency: 2)
    |     +-- Queue :auto_proxy_embeddings (concurrency: 3)
    |
    +-- Amos.Comms.AutoProxy.LLMGateway (GenServer)
```

**Oban configuration** (in `config/config.exs`):

```elixir
config :amos, Oban,
  repo: Amos.Repo,
  queues: [
    auto_proxy: 5,
    auto_proxy_batch: 2,
    auto_proxy_embeddings: 3
  ],
  plugins: [
    {Oban.Plugins.Pruner, max_age: 604_800},  # 7 days
    {Oban.Plugins.Cron, crontab: [
      {"*/15 * * * *", Amos.Comms.AutoProxy.Jobs.DeliverBatch}
    ]}
  ]
```

### 7.2 Ash Integration: Notifier Pattern

AutoProxy hooks into message creation via an Ash Notifier, not a custom Change. This is critical: the message creation must complete and commit before AutoProxy processes it. A Change would make AutoProxy synchronous to message send, which violates the latency constraint.

```elixir
defmodule Amos.Comms.AutoProxy.Notifier do
  @moduledoc "Enqueues AutoProxy processing after message creation."
  use Ash.Notifier

  @impl true
  def notify(%Ash.Notifier.Notification{resource: Amos.Comms.Message, action: %{name: :create}} = notification) do
    message = notification.data

    # Only process if not already an AutoProxy-generated message (prevent loops)
    unless message.sent_via_auto_proxy do
      %{message_id: message.id}
      |> Amos.Comms.AutoProxy.Jobs.ProcessMessage.new()
      |> Oban.insert()
    end

    :ok
  end

  def notify(_), do: :ok
end
```

Register on the Message resource:

```elixir
# In Amos.Comms.Message
resource do
  notifiers [Amos.Comms.AutoProxy.Notifier]
end
```

### 7.3 Oban Workers

#### ProcessMessage (main pipeline)

```elixir
defmodule Amos.Comms.AutoProxy.Jobs.ProcessMessage do
  @moduledoc "Main AutoProxy pipeline: classify, route, suggest, auto-respond."
  use Oban.Worker,
    queue: :auto_proxy,
    max_attempts: 3,
    unique: [keys: [:message_id], period: 60]

  @impl true
  def perform(%Oban.Job{args: %{"message_id" => message_id}}) do
    with {:ok, message} <- load_message_with_context(message_id),
         {:ok, config} <- load_auto_proxy_config(message),
         :ok <- check_eligibility(message, config),
         {:ok, classification} <- classify(message, config),
         :ok <- route(message, classification, config),
         :ok <- maybe_suggest(message, classification, config),
         :ok <- maybe_auto_respond(message, classification, config) do
      :ok
    else
      {:skip, reason} ->
        # Message not eligible (DM, excluded channel, etc.)
        Logger.debug("AutoProxy skipped message #{message_id}: #{reason}")
        :ok

      {:error, :circuit_open} ->
        # LLM unavailable, retry later
        {:snooze, 30}

      {:error, reason} ->
        Logger.warning("AutoProxy failed for message #{message_id}: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
```

#### DeliverBatch (cron)

```elixir
defmodule Amos.Comms.AutoProxy.Jobs.DeliverBatch do
  @moduledoc "Delivers batched message digests to users in focus mode."
  use Oban.Worker, queue: :auto_proxy_batch

  @impl true
  def perform(_job) do
    # For each user with focus_mode: true
    # Collect undelivered classifications since last batch
    # Generate digest notification
    # Deliver via PubSub (Phase 13 infrastructure)
    :ok
  end
end
```

#### ComputeEmbedding (async)

```elixir
defmodule Amos.Comms.AutoProxy.Jobs.ComputeEmbedding do
  @moduledoc "Generates vector embedding for a KnowledgeEntry."
  use Oban.Worker,
    queue: :auto_proxy_embeddings,
    max_attempts: 5

  @impl true
  def perform(%Oban.Job{args: %{"knowledge_entry_id" => id}}) do
    with {:ok, entry} <- Amos.Comms.get_knowledge_entry(id),
         {:ok, embedding} <- Amos.Comms.AutoProxy.LLMGateway.generate_embedding(entry.body) do
      Amos.Comms.update_knowledge_entry_embedding(entry, embedding)
    end
  end
end
```

### 7.4 Module Structure

```
lib/amos/comms/auto_proxy/
  config.ex                          # Ash resource: AutoProxyConfig
  message_classification.ex          # Ash resource: MessageClassification
  routing_rule.ex                    # Ash resource: RoutingRule
  knowledge_entry.ex                 # Ash resource: KnowledgeEntry
  feedback.ex                        # Ash resource: AutoProxyFeedback
  user_preference.ex                 # Ash resource: UserProxyPreference
  notifier.ex                        # Ash.Notifier implementation
  llm_gateway.ex                     # GenServer for LLM API calls
  classifier.ex                      # Classification logic (prompt building, response parsing)
  router.ex                          # Routing logic (rule evaluation, staff lookup, channel operations)
  responder.ex                       # Response generation logic (RAG retrieval, prompt building)
  context_builder.ex                 # Builds LLM context from cross-domain data
  types/
    message_intent.ex
    urgency.ex
    action_taken.ex
    knowledge_category.ex
    feedback_type.ex
  jobs/
    process_message.ex               # Main pipeline Oban worker
    deliver_batch.ex                 # Focus mode batch delivery
    compute_embedding.ex             # Async embedding generation
```

### 7.5 Dependencies (New Hex Packages)

```elixir
# In mix.exs deps
{:oban, "~> 2.18"},           # Background job processing
{:req, "~> 0.5"},             # HTTP client for LLM APIs
{:pgvector, "~> 0.3"},        # Postgres vector extension support
{:jason, "~> 1.2"},           # Already present, used for LLM response parsing
```

`Oban` is the significant new dependency. It has been deferred throughout the project (see DEFERRED.md) and AutoProxy is the forcing function that justifies its introduction.

`Req` is the standard Elixir HTTP client for making LLM API calls. It replaces raw HTTPoison/Tesla with a simpler, more composable API.

`pgvector` requires the `pgvector` Postgres extension to be installed. Add to the initial AutoProxy migration:

```elixir
execute "CREATE EXTENSION IF NOT EXISTS vector", "DROP EXTENSION IF EXISTS vector"
```

---

## 8. Build Phases

### Phase 1: Intelligent Routing (Weeks 1-3)

**Deliverables:**
- Oban infrastructure (dependency, config, migrations)
- AutoProxyConfig resource
- RoutingRule resource
- MessageClassification resource
- LLMGateway GenServer (classify only, no response generation)
- AutoProxy.Notifier on Message
- ProcessMessage Oban worker (classify + route, no suggest/auto-respond)
- Router module with deterministic rule evaluation + LLM fallback
- Staff schedule integration for on-duty routing
- System messages for routing visibility

**Acceptance criteria:**
- Message in a group channel triggers classification
- RoutingRule with keyword match routes to on-duty staff member
- LLM classifies messages when no rule matches
- Routing adds the target user to the channel and posts a system message
- DM channels are excluded
- Kill switch (config.enabled: false) stops all processing
- Circuit breaker prevents cascade failure when LLM is down

### Phase 2: Priority Filtering (Weeks 3-4)

**Deliverables:**
- UserProxyPreference resource
- Focus mode toggle (action on UserPreference)
- DeliverBatch cron job
- Integration with Phase 13 PubSub (or stub if not yet built)

**Acceptance criteria:**
- User enables focus mode
- Low-urgency messages are batched, not notified
- Critical messages always deliver immediately
- Batch digest delivered every 15 minutes
- Focus mode with expiry auto-disables

### Phase 3: Suggested Responses (Weeks 5-7)

**Deliverables:**
- KnowledgeEntry resource with pgvector embeddings
- ComputeEmbedding Oban worker
- Responder module (RAG retrieval + prompt building)
- LLMGateway response generation capability
- PubSub delivery of suggestions (transient, not persisted as messages)
- AutoProxyFeedback resource
- Feedback recording on dismiss/send/edit

**Acceptance criteria:**
- Question-intent messages generate a suggested response
- Suggestions cite KnowledgeEntry sources
- Recipient can send, edit, or dismiss suggestions
- Feedback is recorded for each action
- KnowledgeEntry CRUD includes async embedding generation

### Phase 4: Auto-Response (Weeks 7-8)

**Deliverables:**
- Auto-response eligibility checker (confidence threshold, channel exclusion, user opt-in, intent filter, citation verification)
- Auto-response message creation (with provenance marking)
- Recipient notification of auto-response
- Hard-coded exclusion rules (no financial, no complaints)

**Acceptance criteria:**
- High-confidence factual questions get auto-responded
- Auto-response messages are clearly marked
- Recipient is notified and can review
- Low-confidence questions fall back to suggestion
- Financial and complaint messages never auto-respond
- User with opt_in: false never gets auto-responded

---

## 9. Trade-offs and Decisions

### ADR-AP-001: AutoProxy as Comms Extension, Not Separate Domain

**Status:** Proposed

**Context:** AutoProxy needs deep integration with message creation, channel membership, and authorization. A separate domain would require cross-domain calls for every message.

**Decision:** AutoProxy lives under `Amos.Comms.AutoProxy.*` as an extension of the Comms domain.

**Consequences:**
- Easier: Direct access to Comms internals, no cross-domain coordination.
- Harder: Comms domain grows larger. If AutoProxy becomes very complex, it may need extraction later.
- Reversible: Module extraction to a separate domain is straightforward if needed.

### ADR-AP-002: Asynchronous Processing via Oban

**Status:** Proposed

**Context:** AutoProxy involves LLM API calls with unpredictable latency (100ms - 5s). Synchronous processing would block message creation.

**Decision:** Message creation completes normally. AutoProxy processes messages asynchronously via Oban.

**Consequences:**
- Easier: Message send is never slow. LLM failures do not affect core messaging.
- Harder: Recipients do not see routing/suggestions instantly (100ms - 2s delay). AutoProxy cannot prevent a message from being delivered (it can only add context after the fact).
- Acceptable: In hospitality, a 1-2 second delay before routing is invisible. The alternative (blocking sends on AI inference) is unacceptable.

### ADR-AP-003: Deterministic Rules Before LLM

**Status:** Proposed

**Context:** LLM classification is powerful but expensive, slow, and non-deterministic. Many routing decisions can be encoded as simple rules.

**Decision:** RoutingRules are evaluated first. LLM is called only when no rule matches.

**Consequences:**
- Easier: Predictable, fast, free routing for the common cases. Zero LLM cost for rule-matched messages.
- Harder: Rules must be maintained manually. Rule-LLM interaction (when a rule fires but was wrong) needs clear feedback.
- The right default: Start with rules for known patterns, let LLM handle the long tail.

### ADR-AP-004: RAG Over Fine-Tuning

**Status:** Proposed

**Context:** AutoProxy needs property-specific knowledge (checkout times, pool hours, procedures).

**Decision:** Use RAG with pgvector. No model fine-tuning.

**Consequences:**
- Easier: Instant knowledge updates, full traceability, per-property isolation, simple testing.
- Harder: Response quality depends on knowledge entry quality. Requires property staff to maintain entries.
- Acceptable: A hospitality property has at most a few hundred knowledge items. This is a management task, not a technical scaling problem.

### ADR-AP-005: No Message Interception

**Status:** Proposed

**Context:** AutoProxy could intercept messages before delivery (gate-keeping pattern) or process them after delivery (observer pattern).

**Decision:** Observer pattern. Messages are always delivered normally. AutoProxy processes them after the fact.

**Consequences:**
- Easier: Core messaging is never broken by AutoProxy. Simple mental model ("messages always go through").
- Harder: AutoProxy cannot suppress or redirect a message. It can only add context (route, suggest, respond) after delivery.
- This is the right trade-off for trust: users must never feel that their messages are being silently intercepted or blocked.

---

## 10. Open Questions

1. **System user for auto-responses:** Should auto-responses be sent as the recipient (with a flag) or as a dedicated "AutoProxy" system user? Sending as the recipient preserves conversation naturalness but may feel deceptive. Sending as a system user is transparent but creates an uncanny conversational dynamic.

   **Current lean:** Send as recipient with clear attribution in the message body and the `sent_via_auto_proxy` flag. The recipient opted in and is notified.

2. **Channel-property association:** Channels are global (no property_id). AutoProxy needs to know which property a channel belongs to in order to load the right config and knowledge base. Options:
   - Add optional `property_id` to Channel (simple, but changes the global nature)
   - Infer from channel membership (look up members' UserRoles to determine dominant property)
   - Infer from linked entities (reservation channel -> reservation.property_id)
   - Require explicit opt-in per channel with property association

   **Current lean:** Add optional `property_id` to Channel. Most channels in practice serve a single property. Cross-property channels can set property_id to null, which excludes them from AutoProxy (acceptable).

3. **Multi-language support:** Property staff may communicate in multiple languages. Should AutoProxy detect language and respond accordingly? The LLM handles this natively, but knowledge entries would need to be multilingual.

   **Current lean:** Defer. Start with English-only knowledge entries. The LLM naturally handles mixed-language messages. Multilingual knowledge base is a Phase 5 concern.

4. **Guest-facing channels:** When guest messaging is implemented (Contact promoted to Guest), should AutoProxy process guest channels differently? Guest messages have fundamentally different characteristics (external, less context, higher service expectation).

   **Current lean:** Yes, but defer to the Guest Auth phase. AutoProxy Phase 1-4 is staff-to-staff only.
