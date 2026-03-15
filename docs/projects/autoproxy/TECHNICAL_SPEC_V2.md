---
title: 'AutoProxy: Technical Specification v2 — On-Site + Corporate'
description: >-
  Extended technical specification adding corporate/HQ capabilities including
  cross-property intelligence, executive digests, and portfolio-scope
  processing.
date: 2025-03-14T00:00:00.000Z
group: projects/autoproxy
type: doc
id: projects/autoproxy/TECHNICAL_SPEC_V2
---

# AutoProxy Technical Specification v2: On-Site + Corporate

## Status: Draft

## Revision Context

v1 of this spec designed AutoProxy exclusively for on-site operations — single-property message classification, routing, filtering, and auto-response. This revision extends the architecture to serve **corporate/HQ use cases** where regional managers and executives oversee multiple properties through a single pane of glass.

The core principle remains: AutoProxy is asynchronous, transparent, and degrades gracefully. The extension is that it now operates at two scopes — **property scope** (on-site, where it already worked) and **portfolio scope** (corporate, which is new).

---

## 1. Revised System Architecture

### 1.1 Two Scopes, One System

AutoProxy does NOT become two systems. It remains a single processing pipeline with scope-aware branching. Every message still enters through the same Ash Notifier and Oban job. The difference is what happens after classification.

```
Message Created (any channel)
        |
        v
  [Oban] ProcessMessage
        |
   Classify (intent, urgency, scope)
        |
   +----+----+
   |         |
   v         v
Property   Portfolio
 Scope      Scope
   |         |
   v         v
Route      Aggregate
Filter     Detect patterns
Suggest    Triage reports
Auto-respond  Generate digests
             Smart broadcast
```

**Scope detection** is determined by the channel and the sender:

| Signal | Scope |
|--------|-------|
| Channel has `property_id` set | Property |
| Sender has roles at exactly one property | Property |
| Channel is a cross-property channel (property_id is null, multiple property members) | Portfolio |
| Message is a report ingestion (system-generated) | Portfolio |
| Sender has roles at multiple properties (regional/exec) | Portfolio (for broadcasts and digests) |

The scope is recorded on the MessageClassification so downstream processors know which pipeline to follow.

### 1.2 Domain Placement: Revisited

v1 proposed AutoProxy as an extension of Comms (`Amos.Comms.AutoProxy.*`). The Roadmap countered with a separate `Amos.Proxy` domain. With the corporate expansion, the separate domain becomes the stronger choice.

**Decision: `Amos.Proxy` as a separate Ash domain.**

Rationale for the change:
- Corporate features (digests, broadcasts, report triage) are NOT messaging behaviors. They are intelligence behaviors that happen to use Comms as an output channel.
- The knowledge base (campaigns, property knowledge, org knowledge) is a first-class data concern that does not belong in Comms.
- Report ingestion is a data pipeline, not a messaging flow. It reads from Payments, Reservations, and Tasks — putting that in Comms would violate the dependency direction rule (Comms should not depend on Payments).
- The domain boundary is now clear: **Comms owns channels and messages. Proxy owns intelligence, classification, knowledge, and orchestration.** Proxy reads from Comms and writes to Comms. No cycle — Comms does not depend on Proxy.

**The notifier lives on Comms (Message resource) but enqueues jobs into the Proxy domain's Oban queue.** This is the same pattern as an event: Comms emits, Proxy reacts. No dependency from Comms to Proxy at the module level — the notifier enqueues a generic Oban job by module name string or via a well-known queue.

```
ADR-AP-001 (revised): AutoProxy as Separate Domain

Status: Proposed (supersedes v1 ADR-AP-001)

Context: Corporate features require cross-domain reads (Payments, Reservations,
Tasks, Property) and introduce non-messaging resources (knowledge bases, digests,
broadcasts, escalation chains). Keeping these in Comms would bloat the domain
and create dependency violations.

Decision: AutoProxy lives in `Amos.Proxy` as its own Ash domain. It depends on
Comms, Identity, Property, Staff, Tasks, Reservations, and Payments (read-only).
Comms does not depend on Proxy.

Consequences:
- Easier: Clean boundary, independent evolution, no Comms bloat. Corporate
  features have a natural home.
- Harder: Cross-domain reads require explicit domain calls. Code interfaces
  spread across two domains.
- Reversible: Merging back into Comms is straightforward (move modules, re-register
  resources). Splitting is the hard direction; we do it now while the codebase is small.
```

### 1.3 Architectural Layers (Revised)

```
                    +-----------------------+
                    |   Message Notifier    |
                    | (on Comms.Message)    |
                    +----------+------------+
                               |
                    +----------v------------+
                    |  Proxy.Dispatcher     |
                    |  (Oban: ProcessMessage)|
                    +----------+------------+
                               |
                     Classify + Detect Scope
                               |
          +--------+-----------+-----------+--------+
          |        |           |           |        |
     +----v---+ +--v----+ +---v----+ +----v---+ +--v--------+
     | Router | |Filter | |Respond | |Aggreg. | |Broadcast  |
     | (P1)   | | (P2)  | | (P3+4) | | (P5)   | |Engine(P6) |
     +--------+ +-------+ +--------+ +--------+ +-----------+
          |        |           |           |           |
          +--------+-----------+-----------+-----------+
                               |
                    +----------v------------+
                    |   Knowledge Base      |    +-------------------+
                    | (Property + Org +     |<---| Report Ingestion  |
                    |  Campaign scopes)     |    | (Oban cron)       |
                    +-----------+-----------+    +-------------------+
                               |
                    +----------v------------+
                    |    LLM Gateway        |
                    |    (GenServer)         |
                    +-----------------------+
```

### 1.4 OTP Process Architecture

```
Amos.Supervisor
  |
  +-- Amos.Repo
  +-- Amos.Endpoint
  +-- Oban
  |     |
  |     +-- Queue :proxy (concurrency: 5)          # Message processing
  |     +-- Queue :proxy_batch (concurrency: 2)     # Focus mode batches
  |     +-- Queue :proxy_embeddings (concurrency: 3) # Embedding generation
  |     +-- Queue :proxy_digest (concurrency: 2)    # Digest generation
  |     +-- Queue :proxy_reports (concurrency: 2)   # Report ingestion/triage
  |     +-- Queue :proxy_broadcast (concurrency: 1) # Broadcast processing (serial)
  |
  +-- Amos.Proxy.LLMGateway (GenServer)
  +-- Amos.Proxy.PatternDetector (GenServer)        # NEW: Cross-property dedup
  +-- Amos.Proxy.DigestScheduler (GenServer)         # NEW: Manages digest timing
```

**PatternDetector** is a new GenServer that maintains a sliding window of recent message classifications across properties. When it detects N similar questions from different properties within a time window, it triggers a consolidated response flow. Details in Section 3.1.

**DigestScheduler** manages per-user digest timing. Unlike the simple cron approach in v1, corporate digests have variable schedules (daily at 7am in the exec's timezone, weekly on Mondays for regionals). This GenServer tracks schedules and enqueues digest generation jobs at the right times.

---

## 2. Revised Data Model

### 2.1 Unchanged Resources from v1

These resources carry forward with no structural changes:

| Resource | Purpose |
|----------|---------|
| `Proxy.Config` | Per-property AutoProxy settings (kill switches, thresholds) |
| `Proxy.MessageClassification` | Immutable classification record per message |
| `Proxy.RoutingRule` | Declarative routing rules per property |
| `Proxy.Feedback` | Human corrections on AutoProxy actions |
| `Proxy.UserPreference` | Per-user focus mode, quiet hours, opt-in |

### 2.2 Modified Resources

#### 2.2.1 MessageClassification (Extended)

Add the following attributes to the v1 spec:

```
# New attributes for corporate scope
attribute :scope, Amos.Proxy.Types.ProxyScope, allow_nil?: false
  # :property, :portfolio
attribute :property_id, :uuid_v7, allow_nil?: true
  # The property this message relates to (null for truly cross-property messages)
attribute :pattern_group_id, :uuid_v7, allow_nil?: true
  # If this message was grouped with similar messages from other properties
attribute :source_type, Amos.Proxy.Types.SourceType, allow_nil?: false, default: :message
  # :message, :report, :broadcast, :digest, :system
```

The `scope` attribute is the critical addition. It determines which downstream processors handle this classification.

#### 2.2.2 KnowledgeEntry (Extended with Scoping)

The v1 KnowledgeEntry was property-scoped only. Corporate needs three knowledge scopes:

```
Amos.Proxy.KnowledgeEntry

Table: knowledge_entries

Attributes:
  uuid_v7_primary_key :id
  attribute :scope, Amos.Proxy.Types.KnowledgeScope, allow_nil?: false
    # :property, :organization, :campaign
  attribute :category, Amos.Proxy.Types.KnowledgeCategory, allow_nil?: false
    # Extended: add :campaign_brief, :report_template, :escalation_policy
  attribute :title, :string, allow_nil?: false, max_length: 255
  attribute :body, :string, allow_nil?: false, max_length: 16384
    # Increased from 8192 — campaign briefs can be longer
  attribute :tags, {:array, :string}, default: []
  attribute :active, :boolean, default: true
  attribute :effective_from, :date, allow_nil?: true
  attribute :effective_until, :date, allow_nil?: true
  attribute :embedding, {:array, :float}, allow_nil?: true
  update_timestamp :updated_at

Relationships:
  belongs_to :property, Amos.Property.Property, allow_nil?: true
    # NULL for org-wide and campaign-scoped entries
  belongs_to :campaign, Amos.Proxy.Campaign, allow_nil?: true
    # Set for campaign-scoped entries
  belongs_to :created_by, Amos.Identity.User, allow_nil?: false
```

**Retrieval precedence:** When answering a question, knowledge is searched in order:
1. Campaign knowledge (if a campaign is active and relevant)
2. Property knowledge (specific to the property in question)
3. Organization knowledge (applies to all properties)

Results are merged and deduplicated before being fed to the LLM. If a property entry contradicts an org entry on the same topic, the property entry wins (local override).

### 2.3 New Resources

#### 2.3.1 Campaign

Represents a corporate initiative with an associated knowledge base and lifecycle. When corporate launches a "Summer Pool Hours Extension" campaign, the brief and all related knowledge become available to AutoProxy at every relevant property.

```
Amos.Proxy.Campaign

Table: proxy_campaigns

Attributes:
  uuid_v7_primary_key :id
  attribute :name, :string, allow_nil?: false, max_length: 255
  attribute :description, :string, allow_nil?: true, max_length: 4096
  attribute :status, Amos.Proxy.Types.CampaignStatus, allow_nil?: false, default: :draft
    # :draft, :active, :paused, :expired, :archived
  attribute :starts_at, :utc_datetime, allow_nil?: true
  attribute :ends_at, :utc_datetime, allow_nil?: true
  attribute :target_property_ids, {:array, :uuid_v7}, default: []
    # Empty = all properties. Populated = only these properties.
  attribute :target_property_attributes, :map, default: %{}
    # Filter properties by attributes: %{"has_pool" => true, "villa_count_gte" => 10}
    # See Section 3.5 for how this interacts with smart broadcast.
  update_timestamp :updated_at

Relationships:
  belongs_to :created_by, Amos.Identity.User, allow_nil?: false
  has_many :knowledge_entries, Amos.Proxy.KnowledgeEntry

Identities:
  identity :unique_name, [:name]
```

**State machine:**
- `draft` -- being authored, knowledge entries being added. Not visible to AutoProxy.
- `active` -- knowledge entries are included in RAG retrieval for target properties.
- `paused` -- temporarily excluded from RAG. Useful for "we announced this too early."
- `expired` -- `ends_at` has passed. Auto-transitioned by a cron job. Knowledge excluded.
- `archived` -- soft-deleted.

**Why not just use KnowledgeEntry date ranges?** Campaigns are a grouping and lifecycle concern. A campaign has 5-20 knowledge entries that share a lifecycle. Managing them individually via date ranges would be operationally painful and error-prone.

#### 2.3.2 PatternGroup

Records cross-property question clusters detected by the PatternDetector.

```
Amos.Proxy.PatternGroup

Table: proxy_pattern_groups

Attributes:
  uuid_v7_primary_key :id
  attribute :status, Amos.Proxy.Types.PatternGroupStatus, allow_nil?: false, default: :detected
    # :detected, :responded, :dismissed
  attribute :canonical_question, :string, allow_nil?: false, max_length: 1024
    # The "representative" question distilled from the cluster
  attribute :property_ids, {:array, :uuid_v7}, allow_nil?: false
    # Which properties the pattern spans
  attribute :message_count, :integer, allow_nil?: false
    # How many messages are in this cluster
  attribute :response, :string, allow_nil?: true, max_length: 8192
    # The consolidated response (once generated)
  attribute :response_distributed, :boolean, default: false
    # Whether the response has been sent to all properties
  attribute :detected_at, :utc_datetime, allow_nil?: false

Relationships:
  has_many :classifications, Amos.Proxy.MessageClassification
    # via pattern_group_id
```

**Lifecycle:** Detected -> LLM generates a canonical question and consolidated answer -> Regional manager reviews -> Distributed as a knowledge entry or direct response to all pending askers.

#### 2.3.3 ReportIngestion

Represents a report that has entered the Proxy pipeline for triage and routing.

```
Amos.Proxy.ReportIngestion

Table: proxy_report_ingestions

Attributes:
  uuid_v7_primary_key :id
  attribute :report_type, Amos.Proxy.Types.ReportType, allow_nil?: false
    # :financial_daily, :financial_monthly, :occupancy, :maintenance_summary,
    # :staff_schedule, :guest_satisfaction, :revenue_forecast, :custom
  attribute :title, :string, allow_nil?: false, max_length: 255
  attribute :summary, :string, allow_nil?: true, max_length: 4096
    # LLM-generated summary
  attribute :anomalies, {:array, :map}, default: []
    # Structured anomaly records: [%{field: "occupancy", expected: 0.85, actual: 0.62, severity: :high}]
  attribute :status, Amos.Proxy.Types.ReportIngestionStatus, allow_nil?: false, default: :pending
    # :pending, :summarized, :triaged, :acknowledged
  attribute :triaged_to_user_id, :uuid_v7, allow_nil?: true
  attribute :raw_data, :map, allow_nil?: true
    # The report payload (or a reference to it)

Relationships:
  belongs_to :property, Amos.Property.Property, allow_nil?: false
  belongs_to :message, Amos.Comms.Message, allow_nil?: true
    # The message created in the executive channel to deliver this report
```

**Why not make reports a message type?** Reports are structured data with typed fields, anomaly detection, and a triage lifecycle. Forcing them into the Message schema would require either a massive JSON blob or losing all queryability. Reports enter the Comms pipeline as messages only at the delivery stage -- when a summary is posted to an executive channel. The structured data lives here.

#### 2.3.4 DigestConfig

Per-user digest configuration. Separate from UserPreference because digests have complex scheduling that does not belong on a preference record.

```
Amos.Proxy.DigestConfig

Table: proxy_digest_configs

Attributes:
  uuid_v7_primary_key :id
  attribute :frequency, Amos.Proxy.Types.DigestFrequency, allow_nil?: false
    # :daily, :weekly, :shift_end
  attribute :delivery_time, :time, allow_nil?: true
    # For daily: what time (in user's timezone). For weekly: what time on delivery_day.
  attribute :delivery_day, :integer, allow_nil?: true
    # For weekly: 1=Monday..7=Sunday. Null for daily/shift_end.
  attribute :timezone, :string, allow_nil?: false
    # User's preferred timezone for digest timing
  attribute :include_sections, {:array, Amos.Proxy.Types.DigestSection}, default: [:exceptions, :summary, :action_items]
    # :exceptions, :summary, :action_items, :metrics, :pattern_alerts, :staff_highlights
  attribute :property_ids, {:array, :uuid_v7}, default: []
    # Which properties to include. Empty = all properties the user has roles at.
  attribute :exception_only, :boolean, default: false
    # If true, skip the digest entirely when there are no exceptions/anomalies
  attribute :enabled, :boolean, default: true
  update_timestamp :updated_at

Relationships:
  belongs_to :user, Amos.Identity.User, allow_nil?: false

Identities:
  identity :unique_user_frequency, [:user_id, :frequency]
```

**Exception-based by default.** The `exception_only` flag is the key design decision. Corporate execs do not want a daily email that says "everything is fine." They want silence when things are fine and a ping when something is off. The default flow is: generate digest -> check for exceptions -> if none and `exception_only` is true, skip delivery.

#### 2.3.5 EscalationChain

Configurable escalation paths per property. Replaces the ad-hoc "route to channel owner" fallback in v1 with a structured chain.

```
Amos.Proxy.EscalationChain

Table: proxy_escalation_chains

Attributes:
  uuid_v7_primary_key :id
  attribute :name, :string, allow_nil?: false, max_length: 255
  attribute :trigger_type, Amos.Proxy.Types.EscalationTrigger, allow_nil?: false
    # :unresolved_after_timeout, :urgency_threshold, :explicit_escalation, :pattern_detected
  attribute :steps, {:array, Amos.Proxy.Types.EscalationStep}
    # Embedded resource array. Ordered.
  attribute :timeout_minutes, :integer, default: 30
    # For :unresolved_after_timeout trigger: how long before escalating
  attribute :active, :boolean, default: true
  update_timestamp :updated_at

Relationships:
  belongs_to :property, Amos.Property.Property, allow_nil?: true
    # NULL = org-wide default chain
```

**EscalationStep** (embedded resource):

```
Amos.Proxy.Types.EscalationStep

Attributes:
  attribute :level, :integer, allow_nil?: false
    # 1 = first responder, 2 = department head, etc.
  attribute :target_type, :atom, allow_nil?: false
    # :role, :user, :on_call
  attribute :target_role, Amos.Identity.Types.Role, allow_nil?: true
  attribute :target_user_id, :uuid_v7, allow_nil?: true
  attribute :timeout_minutes, :integer, default: 15
    # How long at this level before escalating to next
  attribute :notify_method, :atom, default: :message
    # :message, :message_and_push, :push_only
```

**Resolution principle:** AutoProxy attempts resolution at the lowest level. If a housekeeper can answer it, it should never reach the GM. The chain encodes this: level 1 is peers, level 2 is department lead, level 3 is GM, level 4 is regional. Each level has a timeout -- if no response within N minutes, escalate.

#### 2.3.6 Broadcast

A message authored by corporate and distributed to multiple properties with optional filtering.

```
Amos.Proxy.Broadcast

Table: proxy_broadcasts

Attributes:
  uuid_v7_primary_key :id
  attribute :subject, :string, allow_nil?: false, max_length: 255
  attribute :body, :string, allow_nil?: false, max_length: 8192
  attribute :status, Amos.Proxy.Types.BroadcastStatus, allow_nil?: false, default: :draft
    # :draft, :scheduled, :sending, :sent, :cancelled
  attribute :scheduled_at, :utc_datetime, allow_nil?: true
  attribute :target_property_ids, {:array, :uuid_v7}, default: []
    # Explicit list. Empty = use attribute filter.
  attribute :target_property_filter, :map, default: %{}
    # Property attribute filter. See Section 3.5.
  attribute :target_roles, {:array, Amos.Identity.Types.Role}, default: []
    # Which roles should see this. Empty = all roles.
  attribute :target_channel_type, Amos.Comms.Types.ChannelType, allow_nil?: true
    # Deliver to an existing channel type (e.g. :department) or create a broadcast channel
  attribute :delivery_results, {:array, :map}, default: []
    # [%{property_id: "...", channel_id: "...", message_id: "...", delivered_at: "..."}]
  attribute :filtered_property_ids, {:array, :uuid_v7}, default: []
    # Properties excluded by the filter (for audit: "why didn't property X get this?")
  update_timestamp :updated_at

Relationships:
  belongs_to :created_by, Amos.Identity.User, allow_nil?: false
  belongs_to :campaign, Amos.Proxy.Campaign, allow_nil?: true
    # Optional link to a campaign
```

### 2.4 New Enum Types

```elixir
# Scope detection
defmodule Amos.Proxy.Types.ProxyScope do
  use Ash.Type.Enum, values: [:property, :portfolio]
end

# Source of a classification
defmodule Amos.Proxy.Types.SourceType do
  use Ash.Type.Enum, values: [:message, :report, :broadcast, :digest, :system]
end

# Knowledge scoping
defmodule Amos.Proxy.Types.KnowledgeScope do
  use Ash.Type.Enum, values: [:property, :organization, :campaign]
end

# Campaign lifecycle
defmodule Amos.Proxy.Types.CampaignStatus do
  use Ash.Type.Enum, values: [:draft, :active, :paused, :expired, :archived]
end

# Pattern group lifecycle
defmodule Amos.Proxy.Types.PatternGroupStatus do
  use Ash.Type.Enum, values: [:detected, :responded, :dismissed]
end

# Report types
defmodule Amos.Proxy.Types.ReportType do
  use Ash.Type.Enum,
    values: [
      :financial_daily, :financial_monthly, :occupancy,
      :maintenance_summary, :staff_schedule, :guest_satisfaction,
      :revenue_forecast, :custom
    ]
end

# Report ingestion lifecycle
defmodule Amos.Proxy.Types.ReportIngestionStatus do
  use Ash.Type.Enum, values: [:pending, :summarized, :triaged, :acknowledged]
end

# Digest frequency
defmodule Amos.Proxy.Types.DigestFrequency do
  use Ash.Type.Enum, values: [:daily, :weekly, :shift_end]
end

# Digest sections
defmodule Amos.Proxy.Types.DigestSection do
  use Ash.Type.Enum,
    values: [:exceptions, :summary, :action_items, :metrics, :pattern_alerts, :staff_highlights]
end

# Escalation triggers
defmodule Amos.Proxy.Types.EscalationTrigger do
  use Ash.Type.Enum,
    values: [:unresolved_after_timeout, :urgency_threshold, :explicit_escalation, :pattern_detected]
end

# Broadcast lifecycle
defmodule Amos.Proxy.Types.BroadcastStatus do
  use Ash.Type.Enum, values: [:draft, :scheduled, :sending, :sent, :cancelled]
end

# Extended knowledge categories (from v1 + new)
defmodule Amos.Proxy.Types.KnowledgeCategory do
  use Ash.Type.Enum,
    values: [
      :policy, :faq, :procedure, :contact_info, :hours, :pricing,
      :amenity, :location, :campaign_brief, :report_template, :escalation_policy
    ]
end
```

### 2.5 Modifications to Existing Resources

**Channel** -- Add optional property_id (resolves v1 Open Question #2):

```elixir
# In Amos.Comms.Channel
attribute :property_id, :uuid_v7, allow_nil?: true, public?: true
  # Set for property-scoped channels (department, task, reservation).
  # NULL for cross-property channels, direct DMs, and broadcast channels.

belongs_to :property, Amos.Property.Property, allow_nil?: true
```

This is a schema change to Channel, not a multitenancy change. Channels remain global resources. The `property_id` is a hint that AutoProxy uses for scope detection and knowledge base selection. It does NOT make Channel a tenant-scoped resource.

**Message** -- Add auto-proxy provenance flag (unchanged from v1):

```elixir
attribute :sent_via_auto_proxy, :boolean, default: false
```

**Property** -- Add property attributes for broadcast filtering:

```elixir
attribute :attributes, :map, default: %{}
  # Freeform property attributes: %{"has_pool" => true, "villa_count" => 24, "region" => "western"}
  # Used by broadcast filtering and campaign targeting.
```

This is deliberately a map, not a structured schema. Property attributes vary wildly between operations. One operation cares about pool presence, another about altitude or cuisine type. A rigid schema would require migrations for every new attribute. The map is validated at write time via a custom validation that checks keys against a configurable allowlist.

---

## 3. Message Flows

### 3.1 Cross-Property Pattern Detection

**Problem:** Three GMs at three different properties all ask "What are the new check-in hours under the summer schedule?" within 24 hours of a policy change. Without pattern detection, AutoProxy answers each independently -- or worse, fails to answer because no property has updated its knowledge base yet.

**Flow:**

```
1. GM at Property A sends: "What are the new check-in hours for summer?"
   -> Classified: intent=question, scope=property, topics=["check_in", "summer", "hours"]
   -> No matching knowledge entry -> suggestion not generated
   -> Classification recorded

2. GM at Property B sends: "Can you confirm the summer check-in time change?"
   -> Classified: intent=question, scope=property, topics=["check_in", "summer", "hours"]
   -> PatternDetector.report_classification/1 called

3. PatternDetector (GenServer) detects:
   - 2 messages with topic overlap > 0.7 within 24h window
   - From different properties
   - Both unresolved (no auto-response, no suggestion)
   - Below threshold (3 required) -- hold

4. GM at Property C sends: "What time is check-in starting this summer?"
   -> Same classification
   -> PatternDetector now has 3 matches -> threshold met

5. PatternDetector creates a PatternGroup:
   - canonical_question: "What are the new summer check-in hours?"
   - property_ids: [A, B, C]
   - message_count: 3
   - status: :detected

6. PatternDetector enqueues Oban job: Proxy.Jobs.HandlePatternGroup
   - Notifies the user responsible for the relevant knowledge area
     (found via EscalationChain or fallback to org admin)
   - Creates a message in the regional/corporate channel:
     "Pattern detected: 3 properties are asking about summer check-in hours.
      No knowledge entry exists. [Add Knowledge Entry] [Respond to All] [Dismiss]"

7. Regional manager responds:
   Option A: Adds a knowledge entry (org-scoped) -> auto-distributed
   Option B: Types a response -> distributed as messages to all 3 original channels
   Option C: Dismisses -> pattern recorded but no action
```

**PatternDetector implementation (GenServer state):**

```elixir
defmodule Amos.Proxy.PatternDetector do
  use GenServer

  # State: sliding window of recent classifications
  # %{
  #   window: [%{classification_id, property_id, topics, intent, inserted_at}],
  #   window_size_hours: 24,
  #   min_cluster_size: 3,
  #   topic_similarity_threshold: 0.7
  # }

  # Public API
  def report_classification(classification)
  def get_active_patterns()
  def dismiss_pattern(pattern_group_id)
end
```

**Topic similarity** uses Jaccard similarity on the extracted topic tags. This is intentionally simple -- no embeddings, no LLM call. Topic tags are already normalized by the classification prompt. If "check_in" and "check-in" both appear, the LLM normalizes them during classification. Jaccard on 3-5 tags is a set intersection, not a vector operation.

**Why a GenServer instead of a database query?** The sliding window is hot data -- every classification writes to it, and pattern detection reads from it every few seconds. Keeping this in-process avoids database round-trips on the hot path. The GenServer state is ephemeral and reconstructable from MessageClassification records on restart.

### 3.2 Report Triage Pipeline

**Problem:** Multiple properties generate daily financial reports, occupancy reports, and maintenance summaries. These arrive as data (from internal cron jobs or external integrations), not as chat messages. An executive needs: anomalies surfaced, routine reports filed, and only exceptions routed to their attention.

**Flow:**

```
1. Report Generation (Oban cron: Proxy.Jobs.GenerateReports)
   - Runs daily at configurable time (per property timezone)
   - Queries domain data:
     - Payments: daily revenue, outstanding balances, failed transactions
     - Reservations: occupancy rate, check-ins, check-outs, cancellations
     - Tasks: open tasks by department, overdue tasks, completion rate
     - Staff: schedule coverage, overtime, no-shows
   - Creates a ReportIngestion record with raw_data

2. Report Summarization (Oban: Proxy.Jobs.SummarizeReport)
   - Loads ReportIngestion + property context
   - Calls LLM Gateway with report data + report template (from KnowledgeEntry)
   - LLM generates:
     - summary: 2-3 sentence overview
     - anomalies: structured list of deviations from expected values
   - Updates ReportIngestion: status -> :summarized

3. Anomaly Detection (deterministic, not LLM):
   - Compare current values against:
     a. Same day last week (week-over-week)
     b. Same day last year (year-over-year, if data exists)
     c. Property-specific thresholds (from Proxy.Config)
   - Deviation > threshold = anomaly
   - Example thresholds:
     - Occupancy drop > 15% WoW = :high anomaly
     - Revenue drop > 20% WoW = :critical anomaly
     - Overdue tasks > 10 = :medium anomaly
     - Failed transactions > 0 = :high anomaly

4. Triage (Oban: Proxy.Jobs.TriageReport)
   - If anomalies with severity :critical or :high:
     - Route to GM (property-level) via Comms message in property channel
     - Route to regional manager via cross-property executive channel
     - Include anomaly details and suggested actions
   - If anomalies with severity :medium:
     - Include in next executive digest (do not send immediately)
   - If no anomalies:
     - File silently (status -> :triaged, no message sent)
     - Available in digest if user has exception_only: false

5. Report message format in Comms:
   "[Report] Property: Sunset Villas | Type: Daily Financial
    Summary: Revenue $12,340 (down 18% WoW). 2 failed transactions.
    Anomalies:
    - Revenue down 18% WoW (threshold: 15%) [HIGH]
    - 2 failed Stripe transactions [HIGH]
    Action: Review failed transactions in Payments dashboard."
```

**Anomaly detection is intentionally NOT LLM-based.** Numerical comparisons are deterministic. Thresholds are configurable. The LLM is used for summarization (turning numbers into readable prose), not for deciding what is anomalous. This keeps the critical path (alerting) fast, cheap, and predictable.

### 3.3 Campaign Q&A

**Problem:** Corporate launches a campaign ("Summer Wellness Package"). Property staff have implementation questions ("Do we include the welcome drink?" "What's the discount for returning guests?"). The answers are in the campaign brief, but staff do not read 10-page PDFs.

**Flow:**

```
1. Campaign created with status :draft
   - Corporate user creates Campaign via Amos.Proxy
   - Adds KnowledgeEntry records scoped to the campaign:
     - "Summer Wellness Package - Overview" (campaign_brief)
     - "Summer Wellness Package - Pricing Tiers" (pricing)
     - "Summer Wellness Package - FAQ" (faq)
   - Sets target_property_ids or target_property_filter
   - Embeddings computed asynchronously for each entry

2. Campaign activated (status -> :active)
   - KnowledgeEntries become available in RAG retrieval for target properties
   - Optional: broadcast notification sent to target properties
     ("New campaign: Summer Wellness Package. Ask AutoProxy any questions.")

3. Staff member at Property A asks: "What's included in the summer wellness package?"
   -> Classified: intent=question, topics=["summer_wellness", "package", "inclusions"]
   -> RAG retrieval searches:
      a. Campaign knowledge (scope=:campaign, campaign.status=:active,
         property_id in campaign.target_property_ids) -- MATCH
      b. Property knowledge -- no match
      c. Org knowledge -- no match
   -> Top entries from campaign knowledge feed into response generation
   -> Suggested response: "The Summer Wellness Package includes: daily spa credit,
      welcome drink, late checkout, and a wellness amenity basket. Pricing tiers
      are Standard ($299/night) and Premium ($449/night) which adds a private
      yoga session."
   -> Source citations: ["Summer Wellness Package - Overview", "Pricing Tiers"]

4. If confidence > auto_response_threshold and property has auto_response_enabled:
   -> Auto-response sent
   -> Attribution: "Answered from: Summer Wellness Package campaign brief"
```

**Campaign expiration:** When `ends_at` passes or status is set to `:expired`, knowledge entries remain in the database but are excluded from RAG retrieval. This is a filter on the query, not a deletion. Historical entries remain available for audit ("what did we tell staff about that campaign?").

### 3.4 Executive Digest Generation

**Problem:** A regional manager overseeing 8 properties does not want 8 separate report messages. They want one consolidated briefing at 7am that says "here is what needs your attention today across your portfolio."

**Flow:**

```
1. DigestScheduler (GenServer) checks schedules every minute:
   - For each enabled DigestConfig:
     - Convert delivery_time to UTC using config.timezone
     - If current UTC time matches (within 1-minute window):
       - Enqueue Proxy.Jobs.GenerateDigest with user_id + config_id

2. GenerateDigest Oban worker:
   a. Load user's DigestConfig
   b. Determine property set:
      - If config.property_ids is populated: use those
      - Else: query UserRole for all properties the user has roles at
   c. For each property in set:
      - Load recent ReportIngestions (since last digest)
      - Load recent PatternGroups
      - Load recent high-urgency MessageClassifications
      - Load recent escalation events
      - Load key metrics (occupancy, revenue, task completion)
   d. Call LLM Gateway with structured prompt:
      - "Generate an executive briefing for {user_name} covering {N} properties.
         Focus on exceptions and items requiring attention.
         Format: brief overview, then property-by-property exceptions,
         then action items."
      - Input: all collected data as structured JSON
   e. LLM generates digest
   f. Check exception_only:
      - If true and no exceptions found: skip delivery, log "digest suppressed (no exceptions)"
      - If false, or if exceptions exist: deliver
   g. Deliver:
      - Create a Message in the user's executive digest channel
        (a special channel type, created on first digest)
      - Optionally: deliver via email (when mailer is available, Layer 4)

3. Digest format:
   "Good morning, Sarah. Here's your portfolio briefing for March 13.

    ATTENTION REQUIRED (2 properties):

    Sunset Villas:
    - Occupancy dropped to 62% (was 85% last week). 3 cancellations yesterday.
    - 2 failed Stripe transactions totaling $1,240. [View in Payments]
    - Maintenance backlog: 7 overdue tasks (up from 2 last week)

    Oceanfront Resort:
    - Staff no-show: Maria Rodriguez (housekeeper) did not clock in for AM shift.
      No coverage arranged. [View Schedule]

    ALL CLEAR (6 properties):
    Palm Grove, Mountain Lodge, City Center, Riverside, Harbor View, Garden Suites
    -- No exceptions flagged.

    CROSS-PROPERTY PATTERNS:
    - 3 properties asked about new summer check-in hours. [Add Knowledge Entry]

    ACTION ITEMS:
    1. Review failed transactions at Sunset Villas
    2. Arrange housekeeping coverage at Oceanfront Resort
    3. Address summer check-in hours knowledge gap"
```

**Why not just aggregate individual reports?** Raw aggregation produces information, not insight. The LLM's job is to turn "occupancy_rate: 0.62, prev_week: 0.85" into "Occupancy dropped to 62% (was 85% last week). 3 cancellations yesterday." The intelligence is in the framing, prioritization, and action item extraction.

**Digest channel:** Each user with an active DigestConfig gets a dedicated Channel (type could be extended to `:digest` or we reuse `:direct` with a system user). This keeps digest history browsable in the Comms UI without polluting operational channels.

### 3.5 Smart Broadcast

**Problem:** Corporate sends "Update pool hours to 7am-9pm for summer." Three of eight properties do not have pools. Sending it to all eight wastes attention and erodes trust in corporate communications.

**Flow:**

```
1. Corporate user creates a Broadcast:
   - subject: "Summer Pool Hours Update"
   - body: "Effective June 1, all pool facilities should operate 7am-9pm daily..."
   - target_property_filter: %{"has_pool" => true}
   - target_roles: [:manager, :front_desk, :maintenance]
   - status: :draft

2. Preview (before send):
   - Proxy evaluates the filter against all properties' `attributes` map
   - Returns: "This broadcast will reach 5 of 8 properties:
     Sunset Villas, Oceanfront Resort, Palm Grove, Harbor View, Garden Suites.
     Excluded (no pool): Mountain Lodge, City Center, Riverside."
   - Corporate user reviews and confirms

3. Send (status -> :sending):
   - Oban job: Proxy.Jobs.SendBroadcast
   - For each matching property:
     a. Find or create the target channel:
        - If target_channel_type is set: find the property's channel of that type
          (e.g., the property's :department channel for operations)
        - If no target_channel_type: create a broadcast-specific channel
     b. Create a Message in that channel:
        - sender: the corporate user (real person, not system)
        - body: broadcast body
        - sent_via_auto_proxy: true (for attribution)
     c. Record in delivery_results
   - Update filtered_property_ids for audit
   - Status -> :sent

4. Campaign linkage (optional):
   - If broadcast.campaign_id is set, the broadcast body is also indexed
     as a KnowledgeEntry under that campaign
   - Future questions about pool hours get answered from this entry
```

**Property attribute filtering implementation:**

```elixir
defmodule Amos.Proxy.PropertyFilter do
  @moduledoc "Evaluates a property filter map against a property's attributes."

  def matches?(property, filter) when filter == %{}, do: true

  def matches?(property, filter) do
    Enum.all?(filter, fn {key, value} ->
      case {key, value} do
        {k, v} when is_boolean(v) ->
          Map.get(property.attributes, k) == v

        {k, v} when is_binary(k) and String.ends_with?(k, "_gte") ->
          field = String.trim_trailing(k, "_gte")
          (Map.get(property.attributes, field) || 0) >= v

        {k, v} when is_binary(k) and String.ends_with?(k, "_lte") ->
          field = String.trim_trailing(k, "_lte")
          (Map.get(property.attributes, field) || 0) <= v

        {k, v} ->
          Map.get(property.attributes, k) == v
      end
    end)
  end
end
```

Simple, deterministic, no LLM. The filter language supports equality, `_gte`, and `_lte` suffixes. This covers the realistic use cases (has_pool, villa_count >= 10, region == "western") without inventing a query DSL.

### 3.6 Escalation Chains

**Flow:**

```
1. Message classified with urgency :high or :critical
   -> Route to level 1 target (per EscalationChain.steps)
   -> Start timeout timer (Oban scheduled job)

2. Timeout fires (Proxy.Jobs.CheckEscalation):
   -> Check if original message received a reply in its channel
   -> If yes: escalation resolved, cancel remaining jobs
   -> If no: escalate to level 2

3. Level 2 notification:
   -> Message in level 2 target's channel:
     "Escalated from {level 1 target}: {original message summary}.
      No response after {timeout} minutes. [View Thread]"
   -> Start next timeout

4. Continue until:
   -> Someone responds (detected by monitoring the channel for replies)
   -> Top of chain reached (final notification to org admin)
   -> Sender manually resolves ("/resolved" command in channel)
```

**Escalation timeout tracking:** Each escalation step enqueues a delayed Oban job (`scheduled_at: now + timeout_minutes`). When the job fires, it checks whether a reply exists. This is more reliable than a GenServer timer -- Oban jobs survive restarts and are visible in the job dashboard.

---

## 4. Multi-Property Authorization

This is the most architecturally sensitive section. Amos uses Property as the multitenancy boundary. A regional manager needs to see data from multiple properties without breaking this boundary.

### 4.1 The Problem

UserRole connects users to properties. A user can have roles at multiple properties:

```
User: Sarah (Regional Manager)
  UserRole: {role: :admin, property_id: sunset_villas}
  UserRole: {role: :admin, property_id: oceanfront_resort}
  UserRole: {role: :admin, property_id: palm_grove}
  ...
```

When AutoProxy generates a digest for Sarah, it needs to read:
- Reservations from 8 properties
- Payment data from 8 properties
- Task completion from 8 properties
- Staff schedules from 8 properties

All of these resources are tenant-scoped (multi-tenancy via `property_id` attribute).

### 4.2 The Solution: Actor-Scoped Aggregate Reads

AutoProxy does NOT bypass multitenancy. It performs N reads, one per property, using the actor's existing authorization.

```elixir
defmodule Amos.Proxy.PortfolioReader do
  @moduledoc "Reads operational data across all properties an actor has access to."

  def read_portfolio(user, opts \\ []) do
    property_ids = opts[:property_ids] || user_property_ids(user)

    property_ids
    |> Task.async_stream(fn property_id ->
      property = Amos.Property.get_property_by_id!(property_id, actor: user)
      {property_id, read_property_data(property, user)}
    end, max_concurrency: 5, timeout: 10_000)
    |> Enum.reduce(%{}, fn {:ok, {pid, data}}, acc ->
      Map.put(acc, pid, data)
    end)
  end

  defp read_property_data(property, user) do
    %{
      reservations: read_reservations(property, user),
      payments: read_payments(property, user),
      tasks: read_tasks(property, user),
      staff: read_staff(property, user)
    }
  end

  defp user_property_ids(user) do
    user
    |> Ash.load!([:roles])
    |> Map.get(:roles, [])
    |> Enum.map(& &1.property_id)
    |> Enum.uniq()
  end
end
```

**Why N reads instead of a cross-tenant query?**

1. **Respects authorization.** Each read passes `actor: user` and `tenant: property`. If Sarah loses access to a property, she immediately stops seeing its data. No cache invalidation, no stale permissions.

2. **No special-case query paths.** The same `list_reservations` action that a property-level user calls is the same one the portfolio reader calls. No "admin backdoor" that bypasses policies.

3. **Bounded blast radius.** If one property's data is corrupted or the query is slow, the other 7 still return. `Task.async_stream` with timeouts handles this naturally.

4. **Scales to the actual use case.** A regional manager has 5-15 properties. 15 parallel reads, each hitting an indexed tenant query, complete in < 1 second. This is not a scaling problem.

**Trade-off acknowledged:** This generates N database queries instead of 1. For 50 properties, that is 50 reservation queries + 50 payment queries + etc. At the scales Amos operates (single deployment, not SaaS), this is fine. If it becomes a problem (> 100 properties in a single deployment), the solution is a materialized view or a read replica, not a cross-tenant query hack.

### 4.3 Channel Visibility for Corporate Users

Channels are global (no multitenancy). A corporate user can already see any channel they are a member of. The question is: how do they get added to the right channels?

**Approach:**

1. **Digest channels** are created automatically when a DigestConfig is set up. One per user.

2. **Executive channels** are group channels created by the system (or by an admin) that include all GMs + the regional manager. These already work with the existing Channel/ChannelMember model.

3. **Property channels** remain property-scoped by convention (their `property_id` attribute is set). A regional manager is added as a ChannelMember to any property channel they want to monitor. This is a human decision, not an AutoProxy decision -- AutoProxy should not auto-subscribe executives to every property channel (information overload).

4. **Broadcast channels** are created per-broadcast delivery. The corporate sender becomes a member automatically.

**No new authorization model needed.** The existing Comms policies (channel membership check) already handle this. The only addition is the `property_id` attribute on Channel for scope detection.

---

## 5. AI/ML Architecture Updates

### 5.1 Model Selection (Revised)

| Task | Model | Latency Budget | Notes |
|------|-------|---------------|-------|
| Classification | Claude Haiku | < 500ms | Unchanged from v1 |
| Routing decision | Claude Haiku | < 500ms | Unchanged |
| Response generation | Claude Sonnet | < 2000ms | Unchanged |
| **Report summarization** | Claude Sonnet | < 5000ms | **New.** Reports can be large. Async, no user waiting. |
| **Digest generation** | Claude Sonnet | < 10000ms | **New.** Digests aggregate data from multiple properties. Larger context window needed. |
| **Pattern canonical question** | Claude Haiku | < 1000ms | **New.** Distill N questions into one representative question. |
| **Broadcast relevance check** | None (deterministic) | < 10ms | Property attribute filter is pure code, no LLM. |
| Embedding generation | text-embedding-3-small | < 200ms | Unchanged |

### 5.2 LLM Gateway (Extended)

The v1 LLM Gateway gets two new methods:

```elixir
# New in v2
def summarize_report(report_data, report_template, opts \\ [])
def generate_digest(portfolio_data, digest_config, opts \\ [])
```

**Token budget management changes:** Corporate operations consume more tokens than on-site operations. The daily token budget becomes two-tiered:

| Tier | Budget | What it covers |
|------|--------|----------------|
| Property | Configurable per property (default: 100K tokens/day) | Classification, routing, suggestions, auto-response for that property |
| Portfolio | Separate budget (default: 500K tokens/day) | Digests, report summaries, pattern detection responses |

When the property budget is exhausted, property-scope features degrade per v1 spec (auto-response off first, then suggestions, then LLM classification). When the portfolio budget is exhausted, digests switch to template-based (no LLM summarization, just structured data) and report summaries are deferred.

### 5.3 Knowledge Base Architecture (Revised for Multi-Scope)

**Retrieval pipeline (updated):**

```
1. Receive query (message text or question from classification)
2. Determine scope:
   - If property_id is known: search property + org + active campaigns targeting that property
   - If portfolio scope: search org-level only
3. Generate embedding via LLM Gateway
4. Query:
   SELECT * FROM knowledge_entries
   WHERE active = true
     AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
     AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
     AND (
       (scope = 'property' AND property_id = $property_id)
       OR (scope = 'organization' AND property_id IS NULL)
       OR (scope = 'campaign' AND campaign_id IN (
         SELECT id FROM proxy_campaigns
         WHERE status = 'active'
           AND ($property_id = ANY(target_property_ids) OR target_property_ids = '{}')
       ))
     )
   ORDER BY embedding <=> $embedding
   LIMIT 10
5. Re-rank: property entries first, then campaign, then org
6. Deduplicate: if property and org entries cover the same topic, keep property
7. Feed top 5 to LLM prompt
```

### 5.4 Cross-Property Pattern Matching

Pattern detection does NOT use embeddings or LLM. It uses topic tag overlap (Jaccard similarity) on the MessageClassification.topics array. This is a deliberate simplicity choice.

**Why not embeddings for pattern detection?** Embedding similarity would catch semantic duplicates that differ in wording. But at the cost of an embedding call per message and a nearest-neighbor search across all recent classifications. The volume does not justify it. Topic tags, extracted during classification (already happening), provide 80% of the detection capability at 0% additional cost.

**When to graduate to embeddings:** If the false-negative rate on pattern detection exceeds 30% (measured by patterns that humans identify but the system misses), add an embedding-based similarity search as a second pass. This is a Phase 6+ concern.

---

## 6. Scalability Considerations

### 6.1 Message Volume Profile

| Deployment | Properties | Staff | Messages/Day | Classifications/Day | Reports/Day |
|------------|-----------|-------|-------------|--------------------:|------------:|
| Boutique | 1 | 20 | 200-500 | 200-500 | 1-3 |
| Mid-size | 5-10 | 100-200 | 1,000-5,000 | 1,000-5,000 | 5-30 |
| Enterprise | 20-50 | 500+ | 5,000-25,000 | 5,000-25,000 | 20-150 |

### 6.2 What Changes at Scale

**Oban queue sizing:**

| Queue | Boutique | Mid-size | Enterprise |
|-------|----------|----------|------------|
| :proxy | concurrency: 2 | concurrency: 5 | concurrency: 10 |
| :proxy_batch | concurrency: 1 | concurrency: 2 | concurrency: 3 |
| :proxy_embeddings | concurrency: 1 | concurrency: 3 | concurrency: 5 |
| :proxy_digest | concurrency: 1 | concurrency: 2 | concurrency: 5 |
| :proxy_reports | concurrency: 1 | concurrency: 2 | concurrency: 5 |
| :proxy_broadcast | concurrency: 1 | concurrency: 1 | concurrency: 2 |

These are runtime configuration values, not code changes. Set via `config/runtime.exs` based on deployment size.

**PatternDetector memory:** The sliding window holds classifications from the last 24 hours. At 25,000 classifications/day, each ~200 bytes of essential data, that is ~5MB in-process. Acceptable. If this grows beyond 50MB, move to an ETS table with TTL-based expiry.

**LLM API costs:**

| Deployment | Classification Cost | Response Cost | Digest Cost | Total Daily |
|------------|-------------------|---------------|-------------|-------------|
| Boutique | ~$0.50 | ~$0.30 | ~$0.10 | ~$1 |
| Mid-size | ~$2.50 | ~$1.50 | ~$0.50 | ~$5 |
| Enterprise | ~$12.50 | ~$7.50 | ~$5.00 | ~$25 |

All within operational budget. The enterprise tier at $25/day is $750/month -- less than a single staff member's daily wage.

**Database considerations:**

- MessageClassification table grows linearly. At 25K/day, that is ~9M rows/year. Index on `(message_id)` and `(property_id, inserted_at)` handles the query patterns. Partition by month if needed after year 1.
- KnowledgeEntry with pgvector: even at enterprise scale, total entries will be < 10K (hundreds per property, plus org + campaign). pgvector is trivially fast at this scale.
- ReportIngestion: 150/day = 55K/year. No concern.

**Digest generation parallelism:** An enterprise digest for a regional manager covering 50 properties requires reading data from 50 properties and generating a summary. The PortfolioReader uses `Task.async_stream` with `max_concurrency: 5`, so 50 properties = ~10 sequential batches of 5. At ~200ms per property read, that is ~2 seconds for data collection. LLM summarization of the aggregated data adds 5-10 seconds. Total: < 15 seconds per digest. Acceptable for a scheduled background job.

### 6.3 What Does NOT Change

- **Message delivery path.** Message creation remains synchronous and fast. AutoProxy processing is always async via Oban. No matter the scale, sending a message never gets slower.
- **Authorization model.** N parallel reads per property, not cross-tenant queries. The approach scales linearly with property count, which is bounded by the business (nobody manages 1000 properties from a single deployment).
- **Knowledge retrieval.** pgvector with < 10K entries does not need a dedicated vector DB at any realistic scale.

---

## 7. Build Phases (Revised)

The original 5 phases (0-4) remain unchanged. Corporate features are Phases 5-8, added after the on-site foundation is proven.

| Phase | Name | Size | New Resources | New Workers | Dependencies |
|-------|------|------|---------------|-------------|-------------|
| 0 | Infrastructure & Spike | L | 2 | 0 | Layer 3+4 |
| 1 | Intelligent Routing | XL | 1 | 1 | Phase 0 |
| 2 | Priority Filtering | L | 2 | 1 | Phase 1 |
| 3 | Suggested Responses | XL | 1 | 1 | Phase 1 |
| 4 | Auto-Response | XL | 1 | 1 | Phase 3 |
| **5** | **Knowledge Base Expansion + Campaigns** | **L** | **1 (Campaign)** | **1** | **Phase 3** |
| **6** | **Cross-Property Pattern Detection** | **M** | **1 (PatternGroup)** | **1** | **Phase 1** |
| **7** | **Report Triage + Executive Digest** | **XL** | **2 (ReportIngestion, DigestConfig)** | **3** | **Phase 5** |
| **8** | **Smart Broadcast + Escalation Chains** | **L** | **2 (Broadcast, EscalationChain)** | **2** | **Phase 1** |

**Sequencing:**

```
Phase 0 --> Phase 1 --> Phase 2
                |
                +--> Phase 3 --> Phase 4
                |         |
                |         +--> Phase 5 --> Phase 7
                |
                +--> Phase 6
                |
                +--> Phase 8
```

- Phases 5-8 are independent of each other (can be built in any order after their dependencies)
- Phase 7 depends on Phase 5 because digests pull from campaign knowledge and report summaries
- Phase 6 depends only on Phase 1 (classification must exist for pattern detection)
- Phase 8 depends only on Phase 1 (routing must exist for escalation chains to extend)

**Total estimated effort (all phases):** 14-22 weeks.

### Phase 5: Knowledge Base Expansion + Campaigns

**Deliverables:**
- Campaign resource with lifecycle state machine
- Org-scoped and campaign-scoped KnowledgeEntry support
- Multi-scope RAG retrieval pipeline
- Campaign activation/deactivation with knowledge entry lifecycle
- `property_id` attribute added to Channel

**Acceptance criteria:**
- Org-wide knowledge entry is returned when querying any property
- Campaign knowledge entry is returned only for target properties
- Campaign expiration removes entries from RAG retrieval
- Property-specific entry takes precedence over org entry on same topic
- Channel.property_id correctly detected for scope assignment

### Phase 6: Cross-Property Pattern Detection

**Deliverables:**
- PatternDetector GenServer
- PatternGroup resource
- Pattern notification in corporate channels
- "Add Knowledge Entry" and "Respond to All" actions from pattern alerts

**Acceptance criteria:**
- 3 similar questions from different properties within 24h creates a PatternGroup
- Regional manager is notified in corporate channel
- Response to pattern group distributes answer to all original channels
- Dismissed patterns are not re-detected within 7 days

### Phase 7: Report Triage + Executive Digest

**Deliverables:**
- ReportIngestion resource
- DigestConfig resource
- Report generation cron worker (per-property)
- Report summarization worker
- Anomaly detection (deterministic thresholds)
- Report triage worker
- DigestScheduler GenServer
- Digest generation worker
- PortfolioReader module (multi-property data aggregation)
- Digest channel creation

**Acceptance criteria:**
- Daily reports generated per property on schedule
- Anomalies detected when metrics deviate beyond thresholds
- High-severity anomalies routed immediately to GM and regional
- Executive digest generated at configured time in user's timezone
- Digest suppressed when exception_only=true and no exceptions exist
- Digest covers all properties the user has roles at
- Portfolio reads respect authorization (user only sees data from their properties)

### Phase 8: Smart Broadcast + Escalation Chains

**Deliverables:**
- Broadcast resource with lifecycle
- Property attribute filter evaluation
- Broadcast preview (which properties will receive)
- Broadcast send worker
- EscalationChain resource with embedded EscalationStep
- Escalation timeout tracking via delayed Oban jobs
- Escalation resolution detection (reply monitoring)

**Acceptance criteria:**
- Broadcast with property filter delivers only to matching properties
- Broadcast preview accurately lists included/excluded properties
- Excluded properties recorded for audit
- Escalation chain fires level 1, waits for timeout, escalates to level 2
- Reply to escalated message resolves the chain (cancels further timeouts)
- Escalation reaches top of chain if all levels time out

---

## 8. Trade-offs and Decisions (New/Revised ADRs)

### ADR-AP-001 (revised): Separate Proxy Domain

See Section 1.2. Supersedes v1 ADR-AP-001.

### ADR-AP-006: N Reads Over Cross-Tenant Queries

```
Status: Proposed

Context: Corporate features need to read operational data from multiple
properties. The multitenancy model scopes data by property_id. A cross-tenant
query would bypass this boundary.

Decision: PortfolioReader performs N parallel reads (one per property), each
passing actor and tenant. No cross-tenant query path exists.

Consequences:
- Easier: Authorization is automatically enforced. No special admin paths.
  Revoking access to a property immediately removes it from digests.
- Harder: N database queries instead of 1. Slower for large N.
- Acceptable: N is bounded by business reality (5-50 properties per manager).
  Parallel execution keeps latency under 2 seconds for N=50.
```

### ADR-AP-007: Deterministic Anomaly Detection

```
Status: Proposed

Context: Report triage needs to detect anomalies in financial and operational
data. Options: LLM-based detection, statistical models, or simple threshold
comparison.

Decision: Anomaly detection uses configurable thresholds with week-over-week
and year-over-year comparison. No LLM or statistical model.

Consequences:
- Easier: Predictable, fast, zero cost, debuggable. Thresholds are visible
  in config. False positives are fixable by adjusting the threshold.
- Harder: Cannot detect novel anomalies that do not match a threshold pattern
  (e.g., "revenue is normal but the mix is unusual").
- Acceptable for Phase 7. Revisit with a statistical model (Prophet, simple
  z-score) if threshold-based detection misses more than 20% of anomalies
  that humans catch.
```

### ADR-AP-008: Topic Tags Over Embeddings for Pattern Detection

```
Status: Proposed

Context: Cross-property pattern detection needs to group similar questions.
Options: embedding similarity (semantic), topic tag overlap (lexical), or
LLM comparison (expensive).

Decision: Jaccard similarity on classification topic tags. No embeddings.

Consequences:
- Easier: Zero additional LLM cost. Zero additional latency. Simple set
  intersection math. Topic tags are already extracted during classification.
- Harder: Misses semantic similarity when questions use very different
  vocabulary. "What time is checkout?" and "When do guests need to leave?"
  would only match if topics normalize to the same tags.
- Acceptable because: The classification prompt already normalizes topics.
  Both questions above get topics ["checkout", "hours"]. The LLM does the
  normalization; Jaccard does the grouping.
```

### ADR-AP-009: Property Attributes as Freeform Map

```
Status: Proposed

Context: Broadcast filtering needs to match properties by attributes
(has_pool, region, villa_count). Options: structured columns on Property,
freeform map, or a separate PropertyAttribute resource.

Decision: Freeform :map attribute on Property with a configurable key allowlist
validated at write time.

Consequences:
- Easier: No migrations when new attributes are added. Operations vary wildly;
  a fixed schema would never cover all cases.
- Harder: No database-level type enforcement. No indexed queries on attributes
  (filter happens in application code after loading all properties).
- Acceptable: Property count is small (< 100 even in enterprise). Loading all
  properties and filtering in-memory is negligible. The allowlist validation
  prevents typo-based bugs.
```

### ADR-AP-010: Digest Channels Over Email-First

```
Status: Proposed

Context: Executive digests need a delivery mechanism. Options: email-only,
Comms channel-only, or both.

Decision: Deliver to a dedicated Comms channel first. Email delivery added
later when mailer infrastructure exists (Layer 4).

Consequences:
- Easier: No external dependency. Digest history is browsable in Amos.
  Consistent with "Amos is the single source of truth" product vision.
- Harder: Executives must open Amos to see digests (not pushed to inbox).
  This limits reach for execs who live in email.
- Acceptable for Phase 7. Email delivery is a Layer 4 integration concern.
  The digest content is generated regardless of delivery channel.
```

---

## 9. Open Questions (Revised)

### Resolved from v1

1. **System user for auto-responses** -- Resolved: Send as recipient with `sent_via_auto_proxy: true` and clear attribution in message body. (v1 lean confirmed.)

2. **Channel-property association** -- Resolved: Add optional `property_id` to Channel. (v1 lean confirmed, made concrete in this spec.)

### New Open Questions

3. **Property attributes schema** -- Should the freeform map on Property have a formal schema registry (an Ash resource listing valid keys and types), or is a simple module-level config list sufficient? The former is more flexible but adds a resource. The latter is simpler but requires a code deployment to add new attribute keys.

   **Current lean:** Module-level config list in `Amos.Proxy.PropertyFilter`. Add a registry resource only if non-developer users need to define new attribute keys.

4. **Digest channel type** -- Should we add a `:digest` value to ChannelType, or reuse `:direct` between the user and a system user? A dedicated type is cleaner but requires a schema migration and changes to channel-type-specific logic. A direct channel with a system user works with existing code but muddies the DM concept.

   **Current lean:** Add `:digest` to ChannelType. It is a distinct concept and the migration cost is trivial.

5. **Pattern detection across message types** -- Should pattern detection include messages sent in different channel types (e.g., one GM asks in their property channel, another asks in a DM with the regional manager)? The current design only examines classified messages in non-DM channels.

   **Current lean:** Include DMs in pattern detection. The classification exists regardless of channel type. DMs should not be invisible to pattern detection just because they are private. The pattern group notification goes to the regional manager, not to the DM participants.

6. **Report data freshness** -- Report generation queries live domain data. If a report is generated at 6am but the GM reads the digest at 9am, the data could be 3 hours stale. Should digests include a "data as of" timestamp, and should they support refresh?

   **Current lean:** Yes to "data as of" timestamp. No to refresh -- the digest is a snapshot, not a live dashboard. If the GM wants current data, they look at the domain directly.

7. **Escalation chain vs. existing channel routing** -- If an escalation chain routes to a user who is already in the channel, should it still send an explicit escalation notification? Or trust that channel membership means they see the message?

   **Current lean:** Always send explicit notification. Channel membership does not guarantee attention. The escalation notification says "this has been waiting {N} minutes with no response" -- that context is the value, not just the message visibility.

---

## 10. File Structure (Revised)

```
lib/amos/proxy.ex                                    # Domain module + code interfaces
lib/amos/proxy/llm.ex                                # LLM behaviour
lib/amos/proxy/llm/anthropic.ex                      # Anthropic adapter
lib/amos/proxy/llm/mock.ex                           # Test mock adapter
lib/amos/proxy/types/
  proxy_scope.ex
  source_type.ex
  knowledge_scope.ex
  campaign_status.ex
  pattern_group_status.ex
  report_type.ex
  report_ingestion_status.ex
  digest_frequency.ex
  digest_section.ex
  escalation_trigger.ex
  broadcast_status.ex
  message_intent.ex                                  # (from v1)
  urgency.ex                                         # (from v1)
  action_taken.ex                                    # (from v1)
  knowledge_category.ex                              # (extended)
  feedback_type.ex                                   # (from v1)
  escalation_step.ex                                 # Embedded resource
lib/amos/proxy/config.ex                             # Proxy.Config resource
lib/amos/proxy/message_classification.ex             # (extended)
lib/amos/proxy/routing_rule.ex                       # (from v1)
lib/amos/proxy/knowledge_entry.ex                    # (extended)
lib/amos/proxy/feedback.ex                           # (from v1)
lib/amos/proxy/user_preference.ex                    # (from v1)
lib/amos/proxy/campaign.ex                           # NEW
lib/amos/proxy/pattern_group.ex                      # NEW
lib/amos/proxy/report_ingestion.ex                   # NEW
lib/amos/proxy/digest_config.ex                      # NEW
lib/amos/proxy/broadcast.ex                          # NEW
lib/amos/proxy/escalation_chain.ex                   # NEW
lib/amos/proxy/notifier.ex                           # Ash.Notifier on Comms.Message
lib/amos/proxy/llm_gateway.ex                        # GenServer
lib/amos/proxy/pattern_detector.ex                   # GenServer (NEW)
lib/amos/proxy/digest_scheduler.ex                   # GenServer (NEW)
lib/amos/proxy/classifier.ex                         # Classification logic
lib/amos/proxy/router.ex                             # Routing logic
lib/amos/proxy/responder.ex                          # Response generation (RAG)
lib/amos/proxy/context_builder.ex                    # Cross-domain context assembly
lib/amos/proxy/portfolio_reader.ex                   # Multi-property data reader (NEW)
lib/amos/proxy/property_filter.ex                    # Broadcast property matching (NEW)
lib/amos/proxy/anomaly_detector.ex                   # Threshold-based anomaly detection (NEW)
lib/amos/proxy/jobs/
  process_message.ex                                 # Main pipeline
  deliver_batch.ex                                   # Focus mode batches
  compute_embedding.ex                               # Async embeddings
  handle_pattern_group.ex                            # Pattern group processing (NEW)
  generate_reports.ex                                # Report generation cron (NEW)
  summarize_report.ex                                # LLM report summary (NEW)
  triage_report.ex                                   # Report triage + routing (NEW)
  generate_digest.ex                                 # Digest generation (NEW)
  send_broadcast.ex                                  # Broadcast delivery (NEW)
  check_escalation.ex                                # Escalation timeout check (NEW)
test/amos/proxy_test.exs
test/amos/proxy/pattern_detector_test.exs
test/amos/proxy/portfolio_reader_test.exs
test/amos/proxy/property_filter_test.exs
test/amos/proxy/anomaly_detector_test.exs
plans/phases/LAYER_05_PHASE_0.md through LAYER_05_PHASE_8.md
```

---

## 11. Risk Register (Revised)

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| 1-8 | (v1 risks unchanged) | | | |
| 9 | Pattern detection false positives | Corporate gets "pattern detected" alerts for unrelated questions | Medium | Require 3+ matches, Jaccard > 0.7. Regional manager reviews before distribution. |
| 10 | Digest generation LLM cost at scale | 50-property digest consumes significant tokens | Low | Token budget per-tier. Template-based fallback when budget exhausted. |
| 11 | Report anomaly threshold tuning | Too sensitive = alert fatigue. Too loose = missed issues. | High | Ship with conservative defaults (high thresholds). Provide per-property override. Dashboard showing anomaly rate + acknowledgment rate. |
| 12 | PortfolioReader latency for large portfolios | Digest generation slow for 50+ properties | Low | Parallel reads with bounded concurrency. Pre-aggregate data via cron (materialized daily snapshot) if needed. |
| 13 | Property attributes map drift | Different properties use different keys for the same concept | Medium | Key allowlist with validation. Admin UI for managing the allowlist. Documentation of standard keys. |
| 14 | Escalation chain misconfiguration | Escalation loops or dead-ends (no one at level N) | Medium | Validate chain completeness on save: every chain must have a terminal level. Warn if any level has an unresolvable target. |
| 15 | Campaign knowledge conflicts with property knowledge | Campaign says one thing, property says another | Low | Property knowledge takes precedence (documented in retrieval pipeline). LLM prompt explicitly states "property-specific information overrides general information." |
