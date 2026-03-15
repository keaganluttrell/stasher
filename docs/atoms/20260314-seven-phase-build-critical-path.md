---
title: >-
  Seven-phase build with a critical path through routing, knowledge,
  auto-response, and corporate intelligence
description: >-
  Phase 0-6 totaling 16-23 weeks; Phase 2 is off critical path and can be built
  in parallel with Phase 3
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-seven-phase-build-critical-path
links:
  - 20260314-competitive-window-12-18-months
  - 20260314-cost-model-ten-dollars-per-property
  - 20260314-async-processing-oban-not-inline
  - 20260314-two-scopes-one-pipeline
source: projects/autoproxy/ROADMAP
created_by: agent
---

AutoProxy's build is structured in seven phases with explicit dependencies and a clear critical path.

**On-Site Foundation (Phases 0-4):**
- Phase 0: Infrastructure and Spike (L, 1-2 weeks). LLM adapter, Oban skeleton, config resources, validation spikes.
- Phase 1: Intelligent Routing + Multi-Level Escalation (XL, 3-4 weeks). Classification, on-shift staff resolver, routing decisions, escalation chains with SLA tracking.
- Phase 2: Priority Filtering (L, 1-2 weeks). Focus mode, urgency thresholds, batch delivery. OFF CRITICAL PATH -- can be built in parallel with Phase 3.
- Phase 3: Suggested Responses + Campaign KB (XL, 3-4 weeks). Property knowledge builder, pgvector KnowledgeEntries, response generation, campaign brief ingestion.
- Phase 4: Auto-Response (XL, 2-3 weeks). Eligibility checker, citation verification, guardrails, confidence calibration.

**Corporate Extension (Phases 5-6):**
- Phase 5: Cross-Property Intelligence (XL, 3-4 weeks). Pattern detection, one-to-many resolution, smart broadcast.
- Phase 6: Executive Digest + Report Triage (XL, 3-4 weeks). Digest subscriptions, cross-property aggregation, anomaly detection, report classification.

**Critical path:** Phase 0 -> Phase 1 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6. Total: 13 resources, 8 Oban workers, 16-23 weeks.

**MVP options:** Minimum On-Site (Phases 0+1, 4-6 weeks) gives classify-route-escalate. Minimum Corporate (0+1+3+5.1-5.4, 10-14 weeks) adds campaign KB and pattern detection. Recommended MVP (Phases 0-4, 10-15 weeks) delivers the full on-site experience.

AutoProxy is Layer 5 (Intelligence) in the Amos layer system, blocked until Layer 3 (policies) and Layer 4 (Oban) are substantially complete. This dependency means AutoProxy cannot start until the foundational layers are in place -- it is not a standalone project.
