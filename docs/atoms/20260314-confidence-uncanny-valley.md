---
title: >-
  The confidence uncanny valley: 85% accuracy destroys trust faster than no
  automation
description: >-
  If auto-response is wrong 15% of the time, trust collapses faster than if the
  system never auto-responded at all
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-confidence-uncanny-valley
links:
  - 20260314-trust-destruction-ai-detected-communication
  - 20260314-auto-response-allowlist-structured-data-only
  - 20260314-shadow-mode-before-any-capability-goes-live
  - 20260314-confidence-scoring-three-signals
  - 20260314-asymmetric-risk-false-low-worse-than-false-high
source: projects/autoproxy/MARKET_RESEARCH
created_by: agent
---

There is an uncanny valley of confidence in AI auto-response systems. If auto-response is wrong 15% of the time, trust collapses faster than if the system never auto-responded at all. Users begin to distrust every response, checking and re-checking even correct ones. The time "saved" by automation is consumed by verification anxiety.

This is why AutoProxy's governance framework mandates a 0.95 confidence floor for auto-response -- not 0.85, not 0.90. The threshold is deliberately set high enough that the remaining error rate (under 5%) falls below the threshold where humans notice and begin distrusting the system.

The mitigation is a sequencing strategy, not just a threshold strategy:
1. Route and filter first (Phases 1-2). No auto-response. Build trust through accurate routing.
2. Suggest responses with human approval (Phase 3). The human always clicks send. Trust builds as suggestions prove accurate.
3. Auto-respond only to the narrowest, highest-confidence category (Phase 4). Only factual lookups from structured data. Only when the system has months of demonstrated accuracy.

The calibration gate in the governance framework reinforces this: before any capability goes live, 500 messages go through shadow mode. If the model outputs confidence > 0.95 on more than 60% of messages, the scores are poorly calibrated and the capability must not ship. This catches models that are confidently wrong -- the most dangerous failure mode.

The broader lesson: in systems where trust must be earned incrementally, you do not launch at medium confidence and improve. You launch only when confidence is high enough that users never need to question the system.
