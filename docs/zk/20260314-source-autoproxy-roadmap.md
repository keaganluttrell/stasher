---
title: "Source: AutoProxy Implementation Roadmap v2.0"
description: "Seven-phase roadmap covering on-site foundation and corporate extension with resource estimates and sequencing"
date: 2026-03-14
group: zk
type: source
id: "20260314-source-autoproxy-roadmap"
links:
  - "20260314-seven-phase-build-critical-path"
  - "20260314-two-tier-llm-strategy"
  - "20260314-cost-model-ten-dollars-per-property"
  - "20260314-cross-property-pattern-detection-via-embeddings"
  - "20260314-campaign-kb-corporate-property-bridge"
source: "projects/autoproxy/ROADMAP"
created_by: agent
---

## Key Takeaways

- AutoProxy is Layer 5 (Intelligence) in the Amos layer system, blocked until Layer 3 (policies) and Layer 4 (Oban) are substantially complete.
- v2 adds corporate capabilities as Phases 5-6 on top of the original on-site Phases 0-4. Corporate features layer on top of the on-site pipeline; they do not replace it.
- Critical path: Phase 0 -> Phase 1 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6. Phase 2 (priority filtering) is off critical path and can be built in parallel.
- Total: 13 resources, 8 Oban workers, 16-23 weeks for the full platform.
- Key prerequisite: corporate role hierarchy does not exist yet. Recommended approach is adding `escalation_level` (integer 1-5) to UserRole.
- 14 risks identified, highest-likelihood being staff schedules not maintained (breaks routing) and pattern detection false positives (creates corporate noise).
- 5 open architectural questions remain: domain placement, channel-property association, property attributes for broadcast, corporate channel type, and digest vs dashboard.

## Extracted Notes

- [[20260314-seven-phase-build-critical-path]] -- The build sequence
- [[20260314-two-tier-llm-strategy]] -- LLM strategy confirmed in Phase 0 spikes
- [[20260314-cost-model-ten-dollars-per-property]] -- Cost constraint
- [[20260314-cross-property-pattern-detection-via-embeddings]] -- Pattern detection in Phase 5
- [[20260314-campaign-kb-corporate-property-bridge]] -- Campaign KB in Phase 3
