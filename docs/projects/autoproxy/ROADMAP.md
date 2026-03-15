---
title: 'AutoProxy: Implementation Roadmap'
description: >-
  Seven-phase implementation roadmap for AutoProxy covering on-site foundation
  and corporate extension, with resource estimates and sequencing.
date: 2025-03-14T00:00:00.000Z
group: projects/autoproxy
type: doc
id: projects/autoproxy/ROADMAP
---

# AutoProxy: Implementation Roadmap

**Version:** 2.0
**Date:** 2026-03-13
**Status:** Draft
**Supersedes:** ROADMAP.md v1.0

---

## What Changed (v1 → v2)

v1.0 assumed single-property, on-site-only deployment. v2 integrates six corporate/HQ capabilities:

1. Cross-property pattern detection
2. Report triage (classify, surface anomalies, route to executive)
3. Campaign knowledge base (brief → knowledge entries → auto-answer property questions)
4. Executive digest (daily/weekly AI summary, exception-based)
5. Smart broadcast (corporate message filtered by property attributes)
6. Multi-level escalation (property → department → GM → regional → executive)

**Key insight**: Corporate features layer on top of the on-site pipeline. Cross-property pattern detection requires single-property classification first. Original phases 0-4 remain correct; corporate adds Phases 5-6, with escalation integrated into Phase 1.

---

## Layer Placement

AutoProxy is **Layer 5: Intelligence**.

| Layer | Name | Status |
|-------|------|--------|
| 0 | Loop | Complete |
| 1 | Scaffold | Complete |
| 2 | Domains | Completing (Phase 13 remaining) |
| 3 | Business Logic | Not started |
| 4 | Integrations | Not started |
| 5 | Intelligence (AutoProxy) | This roadmap |

---

## Prerequisites

| Prerequisite | Source Layer | Why AutoProxy Needs It | New in v2? |
|-------------|-------------|------------------------|------------|
| Layer 3 Phase 1: Policy infrastructure + role checks | Layer 3 | Routing needs `ActorAtProperty`, `ActorHasRole` | No |
| Layer 3 Phase 6: Staff policies + shift duration calcs | Layer 3 | Routing needs `is_clocked_in?`, shift schedule queries | No |
| Layer 3 Phase 10: Tasks policies + role-based visibility | Layer 3 | Task creation needs TaskGroup.roles enforcement | No |
| Layer 2 Phase 13: Comms real-time (PubSub, Presence) | Layer 2 | Priority filtering needs delivery hooks; presence for routing | No |
| Oban setup | Layer 4 | Every phase needs async job processing | No |
| LLM client library | Layer 5 Phase 0 | All classification/generation needs an LLM adapter | No |
| **Corporate roles in Identity** | **Layer 3 or Phase 0** | **Escalation hierarchy needs role tiers or escalation_level** | **Yes** |
| **Cross-property read access** | **Layer 3 Phase 1** | **Digest and report triage need multi-property reads** | **Yes** |

### New Prerequisite: Corporate Role Hierarchy

The existing Role enum is flat — no concept of regional manager or executive spanning multiple properties.

**Recommended**: Add `escalation_level` (integer 1-5) to UserRole. A user with `:manager` at properties A, B, C with `escalation_level: 3` is the regional manager. Escalation walks up the level chain within the property, then crosses property boundaries for higher levels.

---

## New Resources (All Phases)

| Resource | Purpose | Scope | Phase |
|----------|---------|-------|-------|
| `AutoProxyConfig` | Per-property settings | Property-scoped | 0 |
| `RoutingRule` | Intent-to-role mappings | Property-scoped | 0 |
| `MessageClassification` | Immutable classification record | Global | 1 |
| `EscalationChain` | Ordered escalation path per property | Property-scoped | 1 |
| `UserProxyPreference` | Focus mode, auto-response opt-in | Global | 2 |
| `KnowledgeEntry` | Property knowledge (RAG with pgvector) | Property-scoped | 3 |
| `CampaignKnowledgeSet` | Groups entries from campaign brief | Global | 3 |
| `PatternDetection` | Cross-property duplicate question tracking | Global | 5 |
| `BroadcastRule` | Filtering rules for corporate broadcasts | Global | 5 |
| `CorporateDigest` | Scheduled cross-property summary record | Global | 6 |
| `CorporateDigestSubscription` | Per-user digest preferences | Global | 6 |
| `AutoProxyFeedback` | Human feedback on actions | Global | 3 |
| `AutoResponse` | Record of auto-sent reply | Global | 4 |

---

## Phase 0: Infrastructure & Spike (L — 1-2 weeks)

**Goal**: Establish LLM integration foundation and validate approach.

| # | Increment | Size | Deliverable |
|---|-----------|------|-------------|
| 0.1 | LLM adapter behaviour | S | `classify/2` and `generate/2` callbacks. One provider implementation. |
| 0.2 | Oban worker skeleton | S | Base worker for AutoProxy jobs. |
| 0.3 | AutoProxyConfig resource | S | Property-scoped config with feature toggles. |
| 0.4 | RoutingRule resource | M | Property-scoped declarative routing rules with default hospitality intents. |
| 0.5 | Spike validation | M | End-to-end: message body → LLM → structured classification. Validate latency and cost. |
| 0.6 | Corporate role hierarchy spike | S | Evaluate escalation_level on UserRole. Document ADR. |
| 0.7 | Cross-property query spike | S | Prototype multi-property aggregate queries. Validate performance. |

### Technical Spikes

| Spike | Question | Resolution Path |
|-------|----------|----------------|
| LLM selection | Which model for classification vs generation? | Two-tier: Haiku for classification ($0.25/M), Sonnet for generation ($3/M). |
| Latency budget | Can classification complete within 500ms p95? | Benchmark 100 messages. If >500ms, async-only. |
| Elixir LLM client | `instructor_ex`, `langchain`, or raw HTTP? | Evaluate `instructor_ex` for structured output. |
| Cost modeling | Per-message cost at 100-500 messages/day? | Must be under $10/month/property. |
| Cross-property aggregation | Can we efficiently aggregate across 5-20 properties? | Target: under 500ms total. Consider materialized views if slow. |

---

## Phase 1: Intelligent Routing + Multi-Level Escalation (XL — 3-4 weeks)

**Goal**: Classify messages, route to right on-shift staff, escalate through organizational levels.

**Dependencies**: Phase 0, Layer 3 Phase 6 (Staff calcs), Layer 2 Phase 13 (PubSub).

| # | Increment | Size | Deliverable |
|---|-----------|------|-------------|
| 1.1 | MessageClassification resource | M | Immutable. `intent`, `urgency`, `confidence`, `target_roles`, `raw_llm_response`. |
| 1.2 | Classification Oban worker | M | Loads context, calls LLM, creates classification. 3 retries, exponential backoff. |
| 1.3 | Message create notifier | S | Ash notifier on Message create → enqueues ClassifyMessage job. |
| 1.4 | On-shift staff resolver | L | Query StaffSchedule for on-shift matches. Ranked by role match → shift time → current load. |
| 1.5 | Routing decision + channel action | L | If confident: find staff, create/find DM, post routing notification. If none available: escalate. |
| 1.6 | Routing audit trail | S | Read actions on MessageClassification with filters. |
| 1.7 | EscalationChain resource | M | Per-property ordered levels: department_member → department_lead → property_manager → gm → regional → executive. Configurable. |
| 1.8 | Escalation walker | L | When routing fails at current level: walk up chain. Cross-property for regional/executive via UserRole. |
| 1.9 | Escalation SLA tracking | M | Configurable SLA per urgency. Oban cron checks unacknowledged messages, triggers next-level escalation. |

---

## Phase 2: Priority Filtering (L — 1-2 weeks) [Unchanged]

**Goal**: Classify urgency, enable focus mode, batch non-urgent messages.

| # | Increment | Size | Deliverable |
|---|-----------|------|-------------|
| 2.1 | UserProxyPreference resource | S | 1:1 with User. Focus mode, urgency threshold, batch interval, quiet hours. |
| 2.2 | Priority filter in delivery pipeline | M | Check focus mode → batch or deliver based on urgency threshold. |
| 2.3 | Batch delivery Oban cron worker | M | Periodic delivery of batched messages. |
| 2.4 | Focus mode toggle | S | Enable/disable with immediate batch flush on disable. |

---

## Phase 3: Suggested Responses + Campaign Knowledge Base (XL — 3-4 weeks)

**Goal**: Generate contextual reply suggestions and enable corporate to push knowledge to properties.

| # | Increment | Size | Deliverable |
|---|-----------|------|-------------|
| 3.1 | Property knowledge context builder | L | Assembles property context for LLM prompts. Cached per property with TTL. |
| 3.2 | KnowledgeEntry resource with pgvector | M | Property-scoped. Embedding computed async via Oban. |
| 3.3 | Response generation Oban worker | L | Loads message + thread + property knowledge. Generates 1-3 suggestions. |
| 3.4 | Accept/reject actions + feedback recording | M | Accept creates Message, reject records feedback. |
| 3.5 | Suggestion feedback loop | M | Aggregate: acceptance_rate per property, per intent. |
| 3.6 | CampaignKnowledgeSet resource | M | Groups entries by campaign. `name`, `source_brief`, `target_property_ids`, `status` (draft/active/archived). |
| 3.7 | Campaign brief to knowledge entries | L | LLM-powered: brief → structured FAQ/policy/procedure entries. Human review before activation. |
| 3.8 | Cross-property knowledge distribution | M | Activate campaign → create KnowledgeEntry copies at target properties. Update propagation. |

---

## Phase 4: Auto-Response (XL — 2-3 weeks) [Unchanged]

**Goal**: Auto-reply to high-confidence factual queries with transparent labeling.

| # | Increment | Size | Deliverable |
|---|-----------|------|-------------|
| 4.1 | Auto-response eligibility checker | L | Confidence threshold, channel exclusion, user opt-in, intent filter, citation verification. |
| 4.2 | Auto-response message creation | M | With provenance marking and transparent labeling. |
| 4.3 | Escalation from auto-response | M | "help" trigger routes to human with full thread context. |
| 4.4 | Guardrails | M | Hard blocks: urgency keywords, active conversations, property opt-out. |
| 4.5 | Confidence calibration tooling | S | Admin threshold adjustment. Escalation rate monitoring. |

---

## Phase 5: Cross-Property Intelligence (XL — 3-4 weeks) [NEW]

**Goal**: Detect patterns across properties and enable smart corporate-to-property communication.

**Dependencies**: Phase 1 (classification data), Phase 3 (knowledge base).

| # | Increment | Size | Deliverable |
|---|-----------|------|-------------|
| 5.1 | PatternDetection resource | M | `pattern_hash`, `property_ids`, `occurrence_count`, `canonical_question`, `resolution`. |
| 5.2 | Pattern detection Oban cron worker | L | Hourly. Groups classifications by semantic similarity (pgvector cosine, >0.85 threshold). 3+ properties in 4-hour window → create pattern. |
| 5.3 | Pattern notification to corporate | M | Notify users with escalation_level >= 4 at affected properties. Includes canonical question, which properties asked, suggested resolution. |
| 5.4 | One-to-many resolution | M | Corporate provides one answer → creates KnowledgeEntries at all affected properties. Future occurrences auto-resolve via Phase 4. |
| 5.5 | BroadcastRule resource | M | `filter_property_attributes` (JSON), `filter_roles`, `filter_property_ids`. |
| 5.6 | Smart broadcast action | L | Corporate composes message + selects rule → system evaluates → creates message at matching properties. |

---

## Phase 6: Executive Digest + Report Triage (XL — 3-4 weeks) [NEW]

**Goal**: Summarize cross-property operations for executives and classify incoming reports.

**Dependencies**: Phase 5 (cross-property queries), Phase 1 (classification).

| # | Increment | Size | Deliverable |
|---|-----------|------|-------------|
| 6.1 | CorporateDigestSubscription resource | M | `frequency` (daily/weekly), `delivery_time`, `property_ids`, `exception_thresholds` (JSON). |
| 6.2 | Cross-property data aggregator | L | Collects: reservations, task completion, escalation counts, auto-response stats, unresolved patterns, financial summaries. |
| 6.3 | Digest generation Oban cron worker | L | Runs at subscriber's delivery_time. Aggregator → LLM summary. Exception-based: only highlights anomalies exceeding thresholds. |
| 6.4 | Digest delivery | M | Via Comms DM + optionally email. Dedicated digest channel per user. |
| 6.5 | Report triage classifier | L | Classify reports by type (financial, occupancy, maintenance, staffing, guest satisfaction). Route to responsible executive. |
| 6.6 | Anomaly detection in reports | L | Extract key metrics, compare against rolling averages, flag deviations beyond configurable thresholds. |

---

## Message Processing Pipeline

```
Message Created (Ash Notifier)
  │
  ▼
[Oban] ClassifyMessage (Phase 1)
  │
  ├──→ MessageClassification record
  │
  ▼
[Oban] RouteMessage (Phase 1) ── if routing enabled
  │
  ├──→ EscalationChain walk ── if no response within SLA
  │
  ▼
[Oban] FilterByPriority (Phase 2) ── if focus mode active
  │
  ▼
[Oban] GenerateResponse (Phase 3) ── if suggestions enabled
  │
  ▼
[Oban] AutoRespond (Phase 4) ── if auto-response enabled + confidence met
  │
  ▼
[Cron] PatternDetection (Phase 5) ── hourly aggregation across properties
  │
  ▼
[Cron] ExecutiveDigest (Phase 6) ── daily/weekly delivery
```

Phases 5-6 are decoupled from the per-message pipeline — they operate on aggregated data via cron, not inline.

---

## Sequencing

```
Layer 3 Phase 1 (policies)  ──┐
Layer 3 Phase 6 (staff)     ──┼──▶ Phase 0 ──▶ Phase 1 (+ escalation) ──▶ Phase 2
Layer 4 (Oban)              ──┘                      │
Layer 2 Phase 13 (PubSub)   ──────────────────────▶──┘
                                                     │
                                        Phase 1 ──▶ Phase 3 (+ campaign KB) ──▶ Phase 4
                                                     │                             │
                                                     └──▶ Phase 5 (cross-property) ◀┘
                                                                    │
                                                                    ▼
                                                              Phase 6 (digest + triage)
```

**Critical path**: Phase 0 → Phase 1 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 2 is off critical path — can be built in parallel with Phase 3.

---

## Complexity Summary

| Phase | Size | Resources | Workers | Weeks | v1 Change |
|-------|------|-----------|---------|-------|-----------|
| 0: Infrastructure & Spike | L | 2 | 0 | 1-2 | +2 spikes |
| 1: Routing + Escalation | XL | 2 | 2 | 3-4 | +1 week |
| 2: Priority Filtering | L | 1 | 1 | 1-2 | Unchanged |
| 3: Suggestions + Campaign KB | XL | 3 | 1 | 3-4 | +1 week |
| 4: Auto-Response | XL | 0 | 0 | 2-3 | Unchanged |
| 5: Cross-Property Intelligence | XL | 3 | 2 | 3-4 | **NEW** |
| 6: Executive Digest + Report Triage | XL | 2 | 2 | 3-4 | **NEW** |
| **Total** | | **13** | **8** | **16-23** | +8-10 weeks |

---

## MVP Options

| MVP | Phases | Weeks | What You Get |
|-----|--------|-------|-------------|
| Minimum On-Site | 0 + 1 | 4-6 | Classify, route, escalate |
| Minimum Corporate | 0 + 1 + 3 + 5.1-5.4 | 10-14 | + campaign KB + pattern detection |
| Recommended | 0-4 | 10-15 | Full on-site experience |
| Full Platform | 0-6 | 16-23 | On-site + corporate |

---

## Risk Register

| # | Risk | Impact | Likelihood | Mitigation | Phase |
|---|------|--------|-----------|------------|-------|
| 1 | LLM latency > 500ms p95 | Sluggish routing | Medium | All async via Oban | 1 |
| 2 | Classification accuracy < 80% | Misroutes | Medium | Few-shot prompts, feedback loop | 1 |
| 3 | Cost exceeds budget | Uneconomical | Low | Haiku for classification, cache common | 1 |
| 4 | Staff schedules not maintained | No routing targets | High | Fallback to admin, surface warnings | 1 |
| 5 | Auto-response hallucination | Incorrect info | Medium | 0.95+ threshold, factual only | 4 |
| 6 | Privacy/data residency | PII to external LLM | Medium | PII scrubbing, Ollama option | 1 |
| 7 | Oban not yet set up | Blocks everything | Low | Hard prerequisite | 0 |
| 8 | Comms real-time delayed | No delivery control | Medium | Degrade gracefully | 2 |
| 9 | Cross-property data volume | Slow/expensive digests | Medium | Pre-compute daily snapshots | 6 |
| 10 | Pattern detection false positives | Corporate noise | High | Conservative thresholds, human confirmation | 5 |
| 11 | Campaign knowledge quality | Wrong LLM-generated entries | Medium | Mandatory human review before activation | 3 |
| 12 | Escalation fatigue | Executives flooded | High | Rate limits, summary escalation, regional first | 1 |
| 13 | Property attributes not maintained | Inaccurate broadcast filtering | Medium | Setup requirement, validation warnings | 5 |
| 14 | Org hierarchy complexity | Doesn't fit single model | Low | EscalationChain is per-property, configurable | 1 |

---

## Open Architectural Questions

1. **Domain placement** — Comms extension vs separate domain. Resolve in Phase 0.
2. **Channel-property association** — Add optional `property_id` to Channel. Corporate features strengthen this case.
3. **Property attributes for smart broadcast** — Add `metadata` JSON to Property for flexible attributes. Avoids new resource.
4. **Corporate channel type** — Add `:corporate` to ChannelType for cross-property discussions.
5. **Digest vs dashboard** — Digest is push-based. Dashboard deferred to frontend layer. Same aggregator serves both.
