---
title: 'AutoProxy: AI Message Intelligence Architecture'
description: >-
  Buildable specification for AutoProxy's AI/ML layer covering model selection,
  prompt design, RAG with pgvector, classification pipeline, cost modeling, and
  Elixir process topology.
date: 2025-03-14T00:00:00.000Z
group: projects/autoproxy
type: doc
id: projects/autoproxy/AI_ARCHITECTURE
---

# AutoProxy: AI Message Intelligence Architecture

## Executive Summary

AutoProxy is a message intelligence layer that intercepts every message in the Amos Comms domain, classifies it, routes it, and optionally generates or suggests responses. It operates in two modes: on-site (single property operations) and corporate/HQ (multi-property oversight). The system is built entirely in Elixir, uses external LLMs via HTTP APIs, and stores all knowledge in Postgres (including pgvector for embeddings).

This document is a buildable specification. It covers model selection, prompt design, data architecture, Elixir process topology, cost modeling, and safety constraints.

---

## 1. LLM Strategy

### Model Selection by Task

| Task | Primary Model | Fallback Model | Final Fallback | Rationale |
|------|--------------|----------------|----------------|-----------|
| Intent classification | Claude 3.5 Haiku | GPT-4o-mini | Rule-based regex | Classification needs speed + structured output. Haiku is $0.25/M input, $1.25/M output. 200ms median latency. |
| Urgency classification | Claude 3.5 Haiku | GPT-4o-mini | Keyword heuristics | Same reasoning as intent. Co-located in the same call to avoid double-billing. |
| Response suggestion | Claude 4 Sonnet | GPT-4o | None (skip suggestion) | Suggestions must be high quality. Sonnet is $3/M input, $15/M output. Acceptable at ~1 suggestion per 5 messages. |
| Auto-response (high confidence) | Claude 4 Sonnet | GPT-4o | None (escalate to human) | Auto-responses are customer-facing. No compromise on quality. |
| Executive digest | Claude 4 Sonnet | GPT-4o | None (skip digest) | Summarization quality matters for exec consumption. Batch job, cost is predictable. |
| Cross-property dedup | Embedding similarity (voyage-3-lite) + Claude 3.5 Haiku confirmation | Text similarity (Levenshtein) | None | Embeddings for fast candidate retrieval, LLM for semantic confirmation. |
| Anomaly detection | Statistical (Elixir-native) + Claude 3.5 Haiku narration | Statistical only | Statistical only | Stats catch the anomaly, LLM explains it in natural language. |

### Structured Output Strategy

All LLM calls use constrained JSON output. The implementation pattern:

1. System prompt includes a JSON schema definition.
2. For Anthropic: use the `tool_use` response format with a single tool whose input schema matches the desired output structure. This forces structured JSON output without the model "choosing" to use a tool.
3. For OpenAI: use `response_format: { type: "json_schema", json_schema: {...} }`.
4. Parse response with Jason.decode!/1, then validate against an Elixir struct using Ecto embedded schema or a simple map validation module.

Example classification output schema:

```json
{
  "intent": "maintenance_request",
  "intent_confidence": 0.92,
  "urgency": "high",
  "urgency_confidence": 0.87,
  "suggested_roles": ["maintenance"],
  "summary": "Broken AC in Villa Sunrise, guest reports no cold air",
  "requires_auto_response": false,
  "auto_response_eligible": true,
  "extracted_entities": {
    "villa_name": "Sunrise",
    "issue_type": "hvac",
    "guest_mentioned": true
  }
}
```

### Fallback Chain Architecture

```
Primary Model (e.g. Haiku)
  |-- Success -> return result
  |-- Timeout (>3s) -> Fallback Model (e.g. GPT-4o-mini)
  |-- HTTP 429/500/503 -> Fallback Model
  |-- Fallback timeout (>5s) -> Deterministic Rules
  |-- Malformed JSON -> Retry once with same model, then Fallback
  |-- All fail -> Tag message as "unclassified", route to default channel, alert ops
```

Each fallback is logged with the reason. The system never blocks message delivery waiting for classification. Messages are delivered immediately; classification happens async and decorates the message post-hoc.

---

## 2. Prompt Engineering

### System Prompt: Classification (Haiku)

```
You are a hospitality operations classifier for {{property_name}}, a {{property_description}} property in {{property_timezone}}.

Your job is to classify incoming staff/operations messages by intent and urgency.

PROPERTY CONTEXT:
- Villas: {{villa_names_and_types}}
- Current occupancy: {{occupied_villa_count}}/{{total_villa_count}} villas occupied
- Staff on shift right now: {{on_shift_staff_summary}}
- Open high-priority tasks: {{open_urgent_tasks_summary}}

INTENT CATEGORIES:
- maintenance_request: Something is broken or needs repair
- guest_inquiry: Question about a specific guest or reservation
- guest_complaint: Guest is unhappy about something
- scheduling: Shift changes, time off, coverage requests
- supplies: Need to order or locate supplies/inventory
- housekeeping: Room cleaning, turnover, linen requests
- food_beverage: Kitchen, restaurant, minibar, dietary requests
- spa: Spa appointments, therapist availability, treatment questions
- billing: Charges, payments, folios, refunds
- general_info: Property policy, hours, procedures
- escalation: Issue requiring management attention
- social: Non-work conversation (greetings, chatter)

URGENCY LEVELS:
- critical: Safety issue, active emergency, guest locked out, medical concern
- high: Guest-facing issue affecting current stay, broken essential amenity
- normal: Standard operational request, can wait 30 minutes
- low: Informational, FYI, can wait hours

Respond with the JSON tool call. Do not add commentary.
```

### System Prompt: Response Generation (Sonnet)

```
You are an AI assistant helping hospitality staff at {{property_name}}.
You suggest responses to operational messages. Your tone is:
- Professional but warm
- Concise (2-3 sentences max for most responses)
- Action-oriented (tell them what to do, not just acknowledge)
- Never condescending or overly formal

RULES:
- Never invent information. Only use facts from the provided context.
- If you don't know, say "I don't have that information — check with [suggested person/resource]."
- Never disclose guest financial details in a channel visible to non-finance staff.
- For maintenance: always include the villa name and a brief description of next steps.
- For guest inquiries: reference the reservation confirmation number if available.
- For scheduling: reference the actual schedule data provided, never guess shift times.

PROPERTY KNOWLEDGE:
{{rag_context_block}}

MESSAGE CONTEXT:
Channel: {{channel_name}} ({{channel_type}})
Sender: {{sender_name}} ({{sender_role}})
Thread context (if reply): {{parent_message_body}}
Message: {{message_body}}
```

### Property Context Injection Strategy

The context window budget for classification is 2,000 tokens (keeping Haiku calls cheap). The budget for response generation is 4,000 tokens. Context is assembled in priority order, truncated when the budget is hit:

1. **Always included** (~200 tokens): Property name, timezone, villa count, occupancy summary.
2. **Included for relevant intents** (~500 tokens): On-shift staff for the relevant role, open tasks matching the intent, relevant reservation details.
3. **RAG results** (~1,000 tokens): Top 3 knowledge base chunks matching the message, if response generation is triggered.
4. **Thread context** (~300 tokens): Parent message and up to 3 prior messages in the thread.

Context assembly is a dedicated module (`Amos.AutoProxy.Context`) that builds the prompt fragment from cached data. Property context is cached in ETS with a 5-minute TTL (staff schedules, villa status, occupancy counts). Per-message context (thread history, sender details) is fetched on demand.

### Prompt Versioning

Prompts live in `priv/autoproxy/prompts/` as plain text files with EEx-style interpolation markers. Each prompt has a version string in its filename: `classification_v3.txt`. The active version is configured in application config:

```elixir
config :amos, Amos.AutoProxy,
  prompts: %{
    classification: "classification_v3",
    response_generation: "response_v2",
    digest: "digest_v1"
  }
```

A/B testing: a percentage split is configured per prompt. During the A/B window, both versions are called (the non-active one in a fire-and-forget Oban job), results are logged, and accuracy is compared. No live traffic sees the B variant unless explicitly promoted.

---

## 3. Knowledge Base Architecture

### Approach: RAG with pgvector

Fine-tuning is rejected for three reasons: (1) property knowledge changes frequently (menu updates, policy changes, seasonal hours), (2) there are too few examples per property to fine-tune effectively, (3) the operational cost of maintaining fine-tuned models per property is prohibitive.

Prompt stuffing is rejected because property knowledge exceeds what fits in a classification prompt budget. A 20-villa property with full FAQs, policies, and procedures would be 15,000+ tokens.

RAG is the correct approach. It retrieves only the relevant knowledge chunks per message, keeping prompt size predictable.

### Embedding Model

**voyage-3-lite** ($0.02 per million tokens). 512-dimensional embeddings. Good for short text similarity. Alternatives: OpenAI text-embedding-3-small ($0.02/M tokens, 1536-dim) if Voyage is unavailable.

For a local/privacy-sensitive deployment: `nomic-embed-text` via Ollama. 768-dim, runs on CPU, adequate quality for operational text.

### Vector Storage

pgvector extension in the existing Postgres database. No separate vector database needed at this scale.

Schema:

```sql
CREATE TABLE knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id),  -- NULL for global knowledge
  category text NOT NULL,  -- 'faq', 'policy', 'procedure', 'campaign', 'amenity'
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(512) NOT NULL,
  source text,  -- 'manual', 'auto_property_sync', 'campaign_import'
  source_id text,  -- reference to the originating record if auto-synced
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,  -- for campaign knowledge with lifecycle
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_chunks_property_id_idx ON knowledge_chunks(property_id);
CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX knowledge_chunks_category_idx ON knowledge_chunks(category);
CREATE INDEX knowledge_chunks_active_idx ON knowledge_chunks(active) WHERE active = true;
```

### Chunking Strategy

- **FAQs/Policies**: One chunk per FAQ entry or policy section. Title = question or section heading. Content = answer or section body. Target 200-400 tokens per chunk.
- **Procedures**: One chunk per step or logical block. Title = procedure name + step number. Content = the step instructions.
- **Campaigns**: One chunk per campaign brief section (objective, timeline, property-specific instructions). Expires when campaign ends.
- **Amenity data**: Auto-generated from property/villa/spa/catalog Ash resources. One chunk per amenity category. Refreshed on resource change via a notifier.

### Knowledge Freshness

An `Amos.AutoProxy.KnowledgeSync` Oban worker runs on two triggers:

1. **Scheduled**: Every 6 hours, re-sync all auto-generated chunks from Ash resources (villas, catalog items, spa services, property details). Diff against existing chunks, update only what changed.
2. **Event-driven**: An Ash notifier on Property, Villa, CatalogItem, SpaService, and SpaRoom triggers an immediate re-sync for the affected property when those resources are created/updated/destroyed.

Manual knowledge (FAQs, policies, procedures) is managed through an admin interface (future Phoenix LiveView) or bulk import from markdown files.

### Retrieval Pipeline

```
Message text
  -> Embed with voyage-3-lite (or cached if identical text seen recently)
  -> Query pgvector: SELECT * FROM knowledge_chunks
       WHERE (property_id = $1 OR property_id IS NULL)
         AND active = true
         AND (expires_at IS NULL OR expires_at > now())
       ORDER BY embedding <=> $2
       LIMIT 5
  -> Re-rank by category relevance (boost 'faq' for guest_inquiry intent, 'procedure' for maintenance)
  -> Take top 3 chunks
  -> Format as context block for response generation prompt
```

---

## 4. Classification Pipeline

### Intent Taxonomy

Two-level taxonomy. Level 1 is the broad category (used for routing). Level 2 is the specific sub-intent (used for response generation and analytics).

| L1 Intent | L2 Sub-intents | Routes to Roles |
|-----------|---------------|-----------------|
| maintenance_request | hvac, plumbing, electrical, structural, appliance, pest, grounds | maintenance |
| guest_inquiry | reservation_details, amenity_hours, directions, checkout_process, special_request | front_desk |
| guest_complaint | noise, cleanliness, amenity_broken, service_quality, billing_dispute | manager, front_desk |
| scheduling | shift_swap, time_off, coverage_needed, schedule_question | manager |
| supplies | order_needed, stock_check, delivery_tracking, vendor_question | manager, housekeeper |
| housekeeping | turnover, deep_clean, linen, amenity_restock, inspection | housekeeper |
| food_beverage | menu_question, dietary_request, order, kitchen_issue, minibar | dreamweaver |
| spa | appointment, availability, therapist_request, treatment_question | therapist, front_desk |
| billing | charge_question, refund_request, payment_issue, folio_inquiry | finance, front_desk |
| general_info | policy, hours, wifi, parking, transportation | front_desk |
| escalation | management_needed, safety_concern, vip_issue, complaint_unresolved | manager, admin |
| social | greeting, thanks, off_topic | (no routing, no classification stored) |

### Urgency Classification Criteria

Encoded directly in the classification prompt with examples:

- **critical**: "Guest locked out of villa", "Water leak flooding hallway", "Medical emergency", "Fire alarm", "Security threat". Auto-escalation: always page on-shift manager immediately regardless of focus mode.
- **high**: "AC broken in occupied villa", "Guest complaint about current stay", "Checkout in 2 hours and room not ready", "VIP arrival today with missing amenity setup". Bypasses focus mode batching.
- **normal**: "Can someone check the pool filter tomorrow?", "We need more towels for Villa 3 by 4pm", "What time does the kitchen close?". Subject to focus mode batching.
- **low**: "FYI the new menu looks good", "Weekly supply order reminder", "Team lunch Thursday?". Batched, delivered in next digest or when focus mode ends.

### Confidence Scoring

LLMs do not produce calibrated probability scores natively. The confidence score is derived from three signals:

1. **LLM self-reported confidence**: The structured output schema includes `intent_confidence` and `urgency_confidence` fields (0.0-1.0). While not calibrated, they provide a relative ranking.
2. **Historical calibration**: After 500+ classified messages per property, fit a Platt scaling function (logistic regression) that maps raw LLM confidence to actual accuracy. Store the calibration parameters per property.
3. **Agreement score**: For high-stakes decisions (auto-response), call the classification model twice with slightly different prompts (original + rephrased). If both agree on intent and urgency, confidence gets a 0.1 boost. If they disagree, confidence is capped at 0.5.

Thresholds:
- Auto-response eligible: calibrated confidence >= 0.90 AND intent is in [general_info, guest_inquiry]
- Suggestion displayed: calibrated confidence >= 0.70
- Below 0.70: classify for analytics but do not suggest or auto-respond

### Cross-Property Pattern Detection

For corporate/HQ mode. Detects when multiple properties send messages about the same topic within a time window.

1. Every classified message generates an embedding (already computed for RAG retrieval).
2. A sliding window (configurable, default 4 hours) of message embeddings is maintained per-property in a Postgres table.
3. An Oban cron job runs every 15 minutes: for each message in the window, find messages from *other* properties with cosine similarity > 0.85.
4. Cluster similar messages using simple single-linkage clustering (no need for DBSCAN at this scale).
5. Clusters with 3+ properties trigger a "cross-property pattern" alert to the HQ channel.
6. The alert includes: the common topic (LLM-generated summary of the cluster), which properties, and message excerpts.

This is lightweight enough to run in Postgres with pgvector. At 200 properties sending 50 messages/day each, the window contains 10,000 * (window_hours/24) messages. A 4-hour window = ~2,000 messages. The similarity query with an IVFFlat index over 2,000 vectors takes <50ms.

### Classification Caching

Key: SHA256(normalized_message_text + property_id). Normalization: lowercase, strip whitespace, remove punctuation.
TTL: 1 hour (same question from same property within an hour gets the same classification).
Storage: Cachex (Elixir-native cache backed by ETS). No Postgres round-trip for cache hits.

Cache hit rate estimate: 15-25% in a typical property (repeated questions about checkout time, wifi password, pool hours).

---

## 5. Report Intelligence

### Report Ingestion

Reports in Amos are structured data, not documents. AutoProxy queries Ash resources directly using code interfaces.

| Report Type | Data Source | Query Pattern |
|-------------|-----------|---------------|
| Occupancy | Reservations domain: count by status, grouped by property | `Amos.Reservations.read!()` with filters |
| Revenue | Payments domain: Transaction aggregates grouped by date | `Amos.Payments.read!()` with aggregates |
| Maintenance | Tasks domain: open tasks by type, age, assignment | `Amos.Tasks.read!()` with filters |
| Staff | Staff domain: schedule coverage, clock-in compliance | `Amos.Staff.read!()` with filters |
| Spa | Spa domain: utilization, booking rate | `Amos.Spa.read!()` with filters |

### Anomaly Detection: Statistical + LLM Hybrid

Phase 1 (statistical, Elixir-native):
- For each metric (occupancy rate, daily revenue, task completion rate, average response time), maintain a 30-day rolling mean and standard deviation per property.
- Flag any day where the metric deviates by more than 2 standard deviations from the rolling mean.
- Store in a `metric_observations` table: `{property_id, metric_name, date, value, rolling_mean, rolling_stddev, z_score}`.

Phase 2 (LLM narration):
- When an anomaly is detected (z_score > 2.0 or < -2.0), include it in the daily digest generation prompt.
- The LLM receives: the metric name, the anomalous value, the historical range, and any correlated anomalies (e.g., low occupancy + low revenue = expected; low occupancy + high maintenance costs = investigate).
- The LLM produces a 1-2 sentence explanation and a recommended action.

This hybrid approach avoids the cost and latency of sending all metrics through an LLM while getting natural language explanations for the anomalies that matter.

### Executive Digest Generation

Daily and weekly digests are Oban cron jobs.

**Daily digest** (runs at 7:00 AM property local time):
- Input: yesterday's metrics for all properties the recipient oversees.
- Structure: property-by-property summary, then cross-property highlights, then anomalies.
- Token budget: ~2,000 tokens input (metrics data) + ~1,000 tokens output (digest text).
- Model: Sonnet.
- Delivery: posted to the recipient's HQ channel as a formatted message.

**Weekly digest** (runs Monday 7:00 AM):
- Input: 7-day metrics + trend direction (up/down/flat vs prior week).
- Structure: top 3 wins, top 3 concerns, action items.
- Token budget: ~4,000 input + ~1,500 output.

### Exception-Based Alerting

Not everything goes in the digest. These trigger immediate alerts:

| Exception | Trigger | Alert Target |
|-----------|---------|-------------|
| Revenue cliff | Daily revenue < 50% of rolling mean | Finance role at property + HQ |
| Occupancy spike | Occupancy > 95% (capacity pressure) | Manager at property |
| Maintenance backlog | > 10 open maintenance tasks older than 48 hours | Manager + Maintenance lead |
| Staff gap | Shift starting in 2 hours with no clock-in and no coverage | Manager at property |
| Guest complaint surge | > 3 guest_complaint intents in 1 hour at one property | Manager + HQ |

Alerts are messages posted to a dedicated `#autoproxy-alerts` channel per property, plus the HQ alerts channel for cross-property exceptions.

---

## 6. Routing Engine

### Staff Routing Algorithm

When a message is classified and needs routing to a specific person (not just a channel):

```
1. Get suggested_roles from classification (e.g. ["maintenance"])
2. For the message's property, query StaffSchedule:
   - WHERE role IN suggested_roles
   - AND start_time <= now()
   - AND end_time >= now()
   - AND status = :scheduled
   - AND clock_in_at IS NOT NULL (actually on shift, not just scheduled)
3. If multiple candidates:
   a. Check current task load (count of open tasks assigned to each)
   b. Check last routed time (avoid always routing to the same person)
   c. Score: lowest_task_count * 0.6 + longest_since_last_routed * 0.4
   d. Route to highest scorer
4. If no on-shift candidates:
   a. Check if anyone with the role is scheduled to start within 1 hour
   b. If yes: hold message, deliver when they clock in
   c. If no: escalate to manager on shift
5. If no manager on shift: post to property's #general channel with @here mention
```

This requires a `routing_events` table to track last-routed-to timestamps per user per property.

### Focus Mode and Batching

Staff can enable "focus mode" via a channel command or UI toggle. When focus mode is active:

- **critical** and **high** urgency messages bypass focus mode entirely.
- **normal** messages are held in a batch queue (Postgres table: `batched_messages`).
- **low** messages are held until focus mode ends or the next natural break point.
- Focus mode auto-expires after a configurable duration (default: 2 hours).
- When focus mode ends, the batch is delivered as a single summary message: "While you were in focus mode, you received 7 messages: [3 housekeeping requests, 2 supply inquiries, 1 scheduling question, 1 social]. Here are the ones that need action: [...]"

The batch summary is generated by Sonnet in a single call with all held messages as input.

---

## 7. Elixir Implementation Architecture

### Process Topology

```
Amos.Application
  |
  +-- Amos.AutoProxy.Supervisor (one_for_one)
  |     |
  |     +-- Amos.AutoProxy.LLM.Pool (Finch connection pool)
  |     |     - Separate pools per provider (Anthropic, OpenAI, Voyage)
  |     |     - Pool size: 10 connections per provider
  |     |
  |     +-- Amos.AutoProxy.RateLimiter (GenServer)
  |     |     - Token bucket per provider
  |     |     - Anthropic: 50 req/min for Haiku, 20 req/min for Sonnet
  |     |     - Backs off on 429 responses
  |     |
  |     +-- Amos.AutoProxy.CircuitBreaker (GenServer)
  |     |     - Per-provider circuit breaker
  |     |     - Opens after 5 consecutive failures in 60 seconds
  |     |     - Half-open after 30 seconds, allows 1 probe request
  |     |     - Closed again after 3 consecutive successes
  |     |
  |     +-- Amos.AutoProxy.ContextCache (Cachex)
  |     |     - Property context: 5-minute TTL
  |     |     - Classification cache: 1-hour TTL
  |     |     - Embedding cache: 24-hour TTL (message text -> vector)
  |     |
  |     +-- Amos.AutoProxy.MetricsCollector (GenServer)
  |           - Aggregates per-minute stats: call count, latency p50/p95/p99, error rate, cost
  |           - Flushes to Postgres every 60 seconds
  |           - Feeds Telemetry events for external monitoring
```

### Oban Job Design

| Job | Queue | Priority | Max Attempts | Unique | Schedule |
|-----|-------|----------|-------------|--------|----------|
| ClassifyMessage | `autoproxy_classify` | 1 | 3 | message_id, 60s | On message create |
| GenerateResponse | `autoproxy_respond` | 2 | 2 | message_id, 60s | After classification (if eligible) |
| AutoRespond | `autoproxy_auto` | 1 | 1 | message_id, 60s | After classification (if high confidence) |
| DailyDigest | `autoproxy_digest` | 3 | 3 | property_id + date | Cron: daily per property |
| WeeklyDigest | `autoproxy_digest` | 3 | 3 | property_id + week | Cron: weekly |
| CrossPropertyScan | `autoproxy_analytics` | 3 | 2 | 15min window | Cron: every 15 min |
| KnowledgeSync | `autoproxy_sync` | 3 | 3 | property_id | Event-driven + cron |
| AnomalyCheck | `autoproxy_analytics` | 3 | 2 | property_id + date | Cron: daily per property |

Queue concurrency limits:
- `autoproxy_classify`: 20 (high throughput, fast jobs)
- `autoproxy_respond`: 5 (slower, more expensive)
- `autoproxy_auto`: 3 (rate-limited, critical path)
- `autoproxy_digest`: 2 (batch, not latency-sensitive)
- `autoproxy_analytics`: 2 (background)
- `autoproxy_sync`: 3 (I/O bound)

### Message Flow (End to End)

```
1. Staff sends message via Comms.create_message()
2. Ash notifier fires Amos.AutoProxy.Notifiers.MessageCreated
3. Notifier enqueues Oban job: ClassifyMessage(message_id)
4. ClassifyMessage worker:
   a. Load message + sender + channel from Ash
   b. Check classification cache -> if hit, use cached result
   c. Build property context from ContextCache (ETS)
   d. Check RateLimiter -> if throttled, re-enqueue with backoff
   e. Check CircuitBreaker -> if open, use fallback model or rules
   f. Call LLM via Finch pool
   g. Parse structured JSON response
   h. Validate against schema
   i. Store classification in `message_classifications` table
   j. Cache the classification
   k. If auto_response_eligible AND confidence >= 0.90:
      -> Enqueue AutoRespond job
   l. If intent requires routing:
      -> Run routing algorithm
      -> Create/update channel membership or DM the target
   m. If suggestion_eligible AND confidence >= 0.70:
      -> Enqueue GenerateResponse job
   n. Emit telemetry: [:autoproxy, :classify, :complete]
5. GenerateResponse worker:
   a. Load classification + message + thread context
   b. RAG retrieval: embed message, query pgvector, get top 3 chunks
   c. Build response generation prompt with context
   d. Call LLM (Sonnet)
   e. Store suggestion in `message_suggestions` table
   f. Emit event for real-time delivery to sender's UI (future PubSub)
6. AutoRespond worker:
   a. Load classification + message
   b. Double-check: re-classify with rephrased prompt (agreement check)
   c. If agreement: generate response via Sonnet
   d. Post response as a message from the AutoProxy system user
   e. Tag message with `auto_responded: true` metadata
   f. Log in audit table
```

### Database Tables (New)

```sql
-- Classification results
CREATE TABLE message_classifications (
  id uuid PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES messages(id),
  intent text NOT NULL,
  sub_intent text,
  intent_confidence float NOT NULL,
  urgency text NOT NULL,
  urgency_confidence float NOT NULL,
  suggested_roles text[] NOT NULL DEFAULT '{}',
  summary text,
  auto_response_eligible boolean NOT NULL DEFAULT false,
  model_used text NOT NULL,       -- 'claude-3.5-haiku', 'gpt-4o-mini', 'rules'
  prompt_version text NOT NULL,    -- 'classification_v3'
  latency_ms integer NOT NULL,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  inserted_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX message_classifications_message_id ON message_classifications(message_id);
CREATE INDEX message_classifications_intent ON message_classifications(intent);
CREATE INDEX message_classifications_inserted_at ON message_classifications(inserted_at);

-- Response suggestions
CREATE TABLE message_suggestions (
  id uuid PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES messages(id),
  classification_id uuid NOT NULL REFERENCES message_classifications(id),
  suggested_text text NOT NULL,
  model_used text NOT NULL,
  prompt_version text NOT NULL,
  accepted boolean,               -- NULL = pending, true = used, false = dismissed
  accepted_at timestamptz,
  latency_ms integer NOT NULL,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  inserted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX message_suggestions_message_id ON message_suggestions(message_id);

-- Routing decisions
CREATE TABLE routing_events (
  id uuid PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES messages(id),
  classification_id uuid NOT NULL REFERENCES message_classifications(id),
  property_id uuid NOT NULL REFERENCES properties(id),
  routed_to_user_id uuid REFERENCES users(id),
  routed_to_channel_id uuid REFERENCES channels(id),
  routing_reason text NOT NULL,    -- 'on_shift_lowest_load', 'escalation_no_staff', etc.
  inserted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX routing_events_property_routed ON routing_events(property_id, routed_to_user_id);

-- Focus mode state
CREATE TABLE focus_mode_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  property_id uuid NOT NULL REFERENCES properties(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,            -- NULL = still active
  batched_message_count integer NOT NULL DEFAULT 0
);
CREATE INDEX focus_mode_active ON focus_mode_sessions(user_id) WHERE ended_at IS NULL;

-- Batched messages during focus mode
CREATE TABLE batched_messages (
  id uuid PRIMARY KEY,
  focus_session_id uuid NOT NULL REFERENCES focus_mode_sessions(id),
  message_id uuid NOT NULL REFERENCES messages(id),
  classification_id uuid REFERENCES message_classifications(id),
  delivered boolean NOT NULL DEFAULT false,
  inserted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX batched_undelivered ON batched_messages(focus_session_id) WHERE delivered = false;

-- Metric observations for anomaly detection
CREATE TABLE metric_observations (
  id uuid PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES properties(id),
  metric_name text NOT NULL,
  observation_date date NOT NULL,
  value numeric NOT NULL,
  rolling_mean numeric,
  rolling_stddev numeric,
  z_score numeric,
  inserted_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX metric_obs_unique ON metric_observations(property_id, metric_name, observation_date);

-- LLM audit log (every call)
CREATE TABLE llm_audit_log (
  id uuid PRIMARY KEY,
  provider text NOT NULL,          -- 'anthropic', 'openai', 'voyage'
  model text NOT NULL,
  purpose text NOT NULL,           -- 'classify', 'respond', 'digest', 'embed'
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  latency_ms integer NOT NULL,
  success boolean NOT NULL,
  error_type text,                 -- 'timeout', 'rate_limit', 'malformed', etc.
  property_id uuid,
  message_id uuid,
  inserted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX llm_audit_inserted ON llm_audit_log(inserted_at);
CREATE INDEX llm_audit_property ON llm_audit_log(property_id, inserted_at);
```

### Telemetry Events

```elixir
# Classification
[:autoproxy, :classify, :start]    # metadata: %{message_id, property_id}
[:autoproxy, :classify, :stop]     # measurements: %{duration}, metadata: %{model, intent, confidence}
[:autoproxy, :classify, :exception]

# Response generation
[:autoproxy, :respond, :start]
[:autoproxy, :respond, :stop]      # measurements: %{duration}, metadata: %{model, accepted: nil}

# LLM calls (low level)
[:autoproxy, :llm, :request]       # measurements: %{duration, input_tokens, output_tokens, cost_usd}
                                   # metadata: %{provider, model, purpose}
[:autoproxy, :llm, :fallback]      # metadata: %{from_model, to_model, reason}
[:autoproxy, :llm, :circuit_open]  # metadata: %{provider}

# Routing
[:autoproxy, :route, :complete]    # metadata: %{routed_to, reason}
[:autoproxy, :route, :escalation]  # metadata: %{reason, original_roles}

# Cache
[:autoproxy, :cache, :hit]         # metadata: %{cache_name}
[:autoproxy, :cache, :miss]
```

### Testing Strategy

**Unit tests (deterministic, no LLM calls)**:
- Context assembly: Given a property state, assert the correct prompt fragment is built.
- Routing algorithm: Given staff schedules and task counts, assert correct routing target.
- Classification parsing: Given raw JSON strings, assert correct struct construction.
- Confidence calibration: Given raw scores and calibration params, assert correct calibrated scores.
- Focus mode batching: Given a sequence of messages with urgencies, assert correct batch/bypass behavior.

**Integration tests (mocked LLM, real DB)**:
- Use a `Amos.AutoProxy.LLM.MockAdapter` that returns predetermined JSON responses.
- Configure via application env in test: `config :amos, Amos.AutoProxy.LLM, adapter: MockAdapter`.
- Test full pipeline: message create -> Oban job enqueued -> job executes with mock -> classification stored -> routing event created.
- Use `Oban.Testing` to drain queues synchronously in tests.

**Smoke tests (real LLM, sandboxed)**:
- A small suite (5-10 tests) tagged `@tag :llm_smoke` that call the real API.
- Run manually or in CI on a schedule, not on every push.
- Assert structural correctness of responses (valid JSON, expected fields) but not semantic correctness.

**Evaluation harness (offline)**:
- A labeled dataset of 200+ messages with human-assigned intent and urgency.
- Script runs each message through the classification pipeline and computes accuracy, precision, recall per intent category.
- Tracked in `priv/autoproxy/eval/` with results per prompt version.
- Run before promoting a new prompt version.

---

## 8. Cost and Performance Modeling

### Per-Operation Costs (March 2026 pricing, estimated)

| Operation | Model | Input Tokens | Output Tokens | Cost per Call | Latency (p50) |
|-----------|-------|-------------|---------------|--------------|----------------|
| Classification | Haiku | ~800 | ~150 | $0.000388 | 200ms |
| Response suggestion | Sonnet | ~2,500 | ~200 | $0.0105 | 800ms |
| Auto-response | Sonnet | ~2,500 | ~200 | $0.0105 | 800ms |
| Message embedding | voyage-3-lite | ~100 | - | $0.000002 | 50ms |
| RAG retrieval | Postgres | - | - | $0 (infra) | 15ms |
| Daily digest (per property) | Sonnet | ~3,000 | ~1,000 | $0.024 | 2,000ms |
| Weekly digest (per property) | Sonnet | ~5,000 | ~1,500 | $0.0375 | 3,000ms |
| Cross-property scan (per run) | Haiku | ~1,500 | ~200 | $0.000625 | 300ms |

### Monthly Cost Model

Assumptions per property: 100 messages/day, 20% get response suggestions, 5% get auto-responses, 1 daily digest, 1 weekly digest.

| Item | Volume/month | Cost/month/property |
|------|-------------|-------------------|
| Classification | 3,000 messages | $1.16 |
| Response suggestions | 600 messages | $6.30 |
| Auto-responses | 150 messages | $1.58 |
| Embeddings | 3,000 messages | $0.006 |
| Daily digests | 30 | $0.72 |
| Weekly digests | 4 | $0.15 |
| **Total per property** | | **~$9.92/month** |

Scaling:
- 10 properties: ~$100/month + cross-property analytics (~$5/month) = **$105/month**
- 50 properties: ~$500/month + cross-property analytics (~$25/month) = **$525/month**
- 200 properties: ~$2,000/month + cross-property analytics (~$100/month) = **$2,100/month**

At 200 properties, the cross-property scan window grows. Increase the cron interval to 30 minutes and add a pre-filter (only scan messages classified as potential cross-property topics). This keeps the scan under $100/month.

### Latency Budgets

| Operation | Target p50 | Target p95 | Timeout |
|-----------|-----------|-----------|---------|
| Classification (async) | 200ms | 500ms | 3,000ms |
| Response suggestion (async) | 800ms | 2,000ms | 5,000ms |
| Auto-response (async) | 1,200ms | 3,000ms | 8,000ms |
| RAG retrieval | 15ms | 50ms | 200ms |
| Context assembly | 5ms | 20ms | 100ms |
| Routing decision | 10ms | 30ms | 100ms |

All classification and response generation are async (Oban jobs). The message is delivered to the channel immediately. The classification result and any suggestions are delivered to the UI as subsequent events (via PubSub, when implemented). The user never waits for an LLM call to send or receive a message.

---

## 9. Privacy and Safety

### Data Sent to External LLMs

**Always sent**: Message body, sender's first name and role, channel name, property name, anonymized context.

**Never sent**:
- Guest last names or full names (replaced with "Guest [initials]" or "the guest in [Villa Name]")
- Email addresses, phone numbers, passport numbers, credit card numbers
- Financial amounts from folios or transactions (replaced with "the guest's balance" or "the outstanding amount")
- Staff last names (first name + role only)

### PII Scrubbing Pipeline

A pre-processing step before every LLM call:

```elixir
defmodule Amos.AutoProxy.PII do
  @email_regex ~r/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  @phone_regex ~r/\+?[\d\s\-\(\)]{7,15}/
  @cc_regex ~r/\b(?:\d{4}[\s\-]?){3}\d{4}\b/

  def scrub(text) do
    text
    |> String.replace(@email_regex, "[EMAIL]")
    |> String.replace(@phone_regex, "[PHONE]")
    |> String.replace(@cc_regex, "[CARD]")
    |> scrub_guest_names(guest_names)  # loaded from reservation context
  end
end
```

Guest name scrubbing uses a lookup: load all guest names from active reservations at the property, then replace any occurrence in the message text with "Guest [X]" where X is a consistent pseudonym within the conversation.

### Local Model Option

For deployments with strict data sovereignty (e.g., EU properties under GDPR with conservative interpretation):

- Replace Haiku with **Llama 3.1 8B** via Ollama. Run on a dedicated GPU server at the property or in a regional cloud.
- Replace Sonnet with **Llama 3.1 70B** via Ollama (requires A100 or equivalent).
- Replace voyage-3-lite with **nomic-embed-text** via Ollama.
- Configuration is per-property in the `properties` table or application config.
- The `Amos.AutoProxy.LLM` module has adapter pattern: `CloudAdapter` (Anthropic/OpenAI) vs `LocalAdapter` (Ollama HTTP API at configurable host).

Performance trade-off: Llama 3.1 8B classification is ~85% as accurate as Haiku based on benchmarks. Acceptable for most operational messages. For high-stakes auto-responses, accuracy drop may require lowering confidence thresholds (0.90 -> 0.95 for auto-response eligibility).

### Content Safety: What AutoProxy Refuses

AutoProxy will never auto-respond to:
- Messages mentioning medical emergencies (route to manager immediately, do not generate text)
- Messages involving legal threats or liability language
- Messages about employee disputes or HR issues
- Messages containing profanity or aggressive language directed at guests
- Messages about security incidents (theft, trespassing, violence)
- Anything classified as `escalation` intent

For these categories, AutoProxy classifies and routes but never suggests or generates a response. The classification metadata includes `safety_block: true` with a reason code.

### Audit Logging

Every LLM interaction is logged in `llm_audit_log` with:
- Full request metadata (model, provider, purpose, token counts, cost)
- The prompt version used (not the full prompt text, to avoid storing PII in logs)
- The message_id and property_id for traceability
- Success/failure status and error type
- Latency

The actual prompt text and response text are NOT stored in the audit log by default. They can be enabled temporarily for debugging via a config flag (`config :amos, Amos.AutoProxy, debug_log_prompts: true`), but this should never be enabled in production with real guest data.

Audit logs are retained for 90 days, then archived to cold storage. The `message_classifications` and `message_suggestions` tables are retained indefinitely (they contain only derived metadata, not PII).

---

## 10. Module Structure

```
lib/amos/auto_proxy/
  auto_proxy.ex                    # Domain module (Ash domain if modeling as resources, or plain module)
  supervisor.ex                    # OTP supervisor for AutoProxy processes

  # LLM Infrastructure
  llm/
    client.ex                      # Unified LLM client (dispatches to adapters)
    adapters/
      anthropic.ex                 # Anthropic API adapter (Haiku, Sonnet)
      openai.ex                    # OpenAI API adapter (GPT-4o, GPT-4o-mini)
      ollama.ex                    # Local model adapter
      voyage.ex                    # Voyage embedding API adapter
    rate_limiter.ex                # Token bucket rate limiter (GenServer)
    circuit_breaker.ex             # Per-provider circuit breaker (GenServer)
    pool.ex                        # Finch connection pool configuration

  # Classification
  classification/
    classifier.ex                  # Main classification logic
    intent.ex                      # Intent enum and taxonomy
    urgency.ex                     # Urgency enum and criteria
    confidence.ex                  # Confidence calibration (Platt scaling)
    cache.ex                       # Classification caching (Cachex wrapper)
    rules.ex                       # Deterministic fallback rules (regex + keyword)

  # Response Generation
  response/
    generator.ex                   # Response suggestion generation
    auto_responder.ex              # Auto-response logic (double-check + generate)

  # Routing
  routing/
    router.ex                      # Staff routing algorithm
    focus_mode.ex                  # Focus mode state management
    batcher.ex                     # Message batching during focus mode

  # Knowledge Base
  knowledge/
    store.ex                       # Knowledge chunk CRUD
    embedder.ex                    # Text -> embedding via Voyage/Nomic
    retriever.ex                   # RAG retrieval (embed + pgvector query + re-rank)
    sync.ex                        # Auto-sync from Ash resources to knowledge chunks

  # Context Assembly
  context/
    builder.ex                     # Assembles prompt context from cached data
    property_context.ex            # Property-level context (villas, staff, occupancy)
    message_context.ex             # Message-level context (thread, sender, channel)
    cache.ex                       # ETS/Cachex context cache management

  # Analytics (Corporate/HQ Mode)
  analytics/
    cross_property_scanner.ex      # Cross-property pattern detection
    anomaly_detector.ex            # Statistical anomaly detection
    digest_generator.ex            # Daily/weekly digest generation

  # Safety
  safety/
    pii_scrubber.ex                # PII detection and replacement
    content_filter.ex              # Safety classification (block auto-response)

  # Prompts
  prompts/
    loader.ex                      # Load prompt templates from priv/autoproxy/prompts/
    renderer.ex                    # EEx-style interpolation of context into prompts

  # Oban Workers
  workers/
    classify_message.ex
    generate_response.ex
    auto_respond.ex
    daily_digest.ex
    weekly_digest.ex
    cross_property_scan.ex
    knowledge_sync.ex
    anomaly_check.ex

  # Notifiers (Ash integration)
  notifiers/
    message_created.ex             # Fires on Comms.Message create, enqueues classification

  # Telemetry
  telemetry.ex                     # Telemetry event definitions and handlers
```

Prompt templates:
```
priv/autoproxy/
  prompts/
    classification_v1.txt
    response_v1.txt
    digest_daily_v1.txt
    digest_weekly_v1.txt
    batch_summary_v1.txt
  eval/
    labeled_messages.json           # Evaluation dataset
    eval_results/                   # Per-version accuracy reports
```

---

## 11. Implementation Phases

This is a phased build, consistent with the Amos development loop.

### Phase A: Foundation (Weeks 1-2)
- Add dependencies: `oban`, `finch` (if not already present), `pgvector` Ecto type, `cachex`
- Build `Amos.AutoProxy.LLM.Client` with Anthropic adapter only
- Build `PII.scrub/1`
- Build `ClassifyMessage` worker with Haiku, structured output, deterministic fallback
- Build `message_classifications` table as an Ash resource
- Wire Ash notifier on Message create
- Tests: mock adapter, full pipeline test

### Phase B: Routing (Weeks 3-4)
- Build routing algorithm with StaffSchedule queries
- Build `routing_events` table
- Build focus mode (focus_mode_sessions, batched_messages)
- Build batch summary generation
- Tests: routing scenarios, focus mode edge cases

### Phase C: Knowledge Base + RAG (Weeks 5-6)
- Add pgvector extension to Postgres
- Build `knowledge_chunks` table and Ash resource
- Build Voyage embedding adapter
- Build `KnowledgeSync` worker (auto-sync from Property, Villa, CatalogItem, SpaService)
- Build RAG retriever
- Build `GenerateResponse` worker
- Tests: embedding round-trip, retrieval relevance, response generation with mock

### Phase D: Auto-Response (Week 7)
- Build confidence calibration module
- Build agreement check (double-classification)
- Build `AutoRespond` worker
- Build content safety filter
- Build AutoProxy system user (dedicated User record for auto-responses)
- Tests: confidence thresholds, safety blocks, auto-response flow

### Phase E: Corporate/HQ Mode (Weeks 8-9)
- Build cross-property scanner
- Build anomaly detector (statistical)
- Build daily/weekly digest generators
- Build exception alerting
- Tests: anomaly detection on synthetic data, digest generation

### Phase F: Observability + Hardening (Week 10)
- Build telemetry handlers
- Build `llm_audit_log` with retention policy
- Build circuit breaker and rate limiter
- Add OpenAI adapter as fallback
- Load testing: simulate 200 properties at peak message volume
- Evaluation harness: labeled dataset accuracy baseline

---

## 12. Key Dependencies to Add

```elixir
# In mix.exs deps()
{:oban, "~> 2.18"},                    # Background job processing
{:finch, "~> 0.19"},                   # HTTP client for LLM APIs (may already be present via Phoenix)
{:cachex, "~> 4.0"},                   # ETS-backed caching
{:pgvector, "~> 0.3"},                # pgvector Ecto type for embeddings
{:nimble_options, "~> 1.0"},           # Options validation for config
```

Postgres extension (in a migration):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 13. Configuration

```elixir
# config/config.exs
config :amos, Amos.AutoProxy,
  enabled: true,

  # LLM providers
  anthropic_api_key: System.get_env("ANTHROPIC_API_KEY"),
  openai_api_key: System.get_env("OPENAI_API_KEY"),
  voyage_api_key: System.get_env("VOYAGE_API_KEY"),

  # Model selection
  classification_model: "claude-3-5-haiku-20241022",
  response_model: "claude-sonnet-4-20250514",
  embedding_model: "voyage-3-lite",

  # Fallback chain
  classification_fallback: "gpt-4o-mini",
  response_fallback: "gpt-4o",

  # Prompt versions
  prompts: %{
    classification: "classification_v1",
    response: "response_v1",
    digest_daily: "digest_daily_v1",
    digest_weekly: "digest_weekly_v1",
    batch_summary: "batch_summary_v1"
  },

  # Confidence thresholds
  auto_response_threshold: 0.90,
  suggestion_threshold: 0.70,

  # Rate limits (requests per minute)
  anthropic_rpm: 50,
  openai_rpm: 50,

  # Circuit breaker
  circuit_failure_threshold: 5,
  circuit_failure_window_ms: 60_000,
  circuit_recovery_ms: 30_000,

  # Focus mode
  default_focus_duration_minutes: 120,

  # Privacy
  debug_log_prompts: false,
  pii_scrub_enabled: true,

  # Local model (optional)
  ollama_base_url: nil,  # Set to "http://localhost:11434" to enable local models
  use_local_models: false

# config/test.exs
config :amos, Amos.AutoProxy,
  enabled: false,  # Disabled by default in tests
  llm_adapter: Amos.AutoProxy.LLM.Adapters.Mock
```

---

## Summary of Key Decisions

1. **Async-first**: Messages are never blocked by LLM calls. Classification is a background job that decorates messages after delivery.
2. **Haiku for classification, Sonnet for generation**: Cost optimization. Classification is high-volume/low-stakes. Response generation is low-volume/high-stakes.
3. **pgvector in Postgres, not a separate vector DB**: The scale (thousands of knowledge chunks, not millions) does not justify operational overhead of Pinecone/Weaviate.
4. **Statistical anomaly detection with LLM narration**: Avoids sending all metrics through an LLM. Statistics find the anomaly, LLM explains it.
5. **PII scrubbing before every LLM call**: Guest financial data and contact info never leave the system.
6. **Oban for everything async**: Consistent job infrastructure with retries, uniqueness, cron, and observability.
7. **Adapter pattern for LLM providers**: Easy to add providers, swap models, or go local with Ollama.
8. **~$10/month/property**: Affordable enough to be a default feature, not an upsell.
