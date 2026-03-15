---
title: 'Source: AutoProxy Automation Governance Framework'
description: >-
  Risk framework, kill switches, confidence thresholds, audit trail, compliance,
  and phased rollout governance
date: 2026-03-14T00:00:00.000Z
group: notes
type: source
id: 20260314-source-autoproxy-governance
links:
  - 20260314-asymmetric-risk-false-low-worse-than-false-high
  - 20260314-auto-response-allowlist-structured-data-only
  - 20260314-kill-switch-five-levels-of-granularity
  - 20260314-shadow-mode-before-any-capability-goes-live
  - 20260314-cross-property-data-leakage-governance-landmine
  - 20260314-human-in-the-loop-eight-mandatory-gates
  - 20260314-confidence-uncanny-valley
source: projects/autoproxy/GOVERNANCE
created_by: agent
---

## Key Takeaways

- 10 capabilities ranked by value-to-risk: focus mode (highest, ship first), classification and routing (high, shadow mode first), response suggestions (medium, human clicks send), auto-response (low value-to-risk, pilot only with 0.95 confidence floor).
- Asymmetric risk principle: false-low is always worse than false-high. 5% false-critical rate is acceptable; 1% false-low-on-actual-critical is not. System biased toward over-escalation.
- Auto-response is limited to an allowlist of categories where answers come from structured, versioned data fields (not LLM generation). Never auto-respond to safety, health, financial, legal, HR, complaints, or judgment calls.
- Kill switches operate at 5 granularity levels: global (CTO), per-capability (engineering lead), per-property (GM), per-channel (channel owner), per-user (self-service). All take effect within 30 seconds.
- Shadow mode validation requires 500 messages with >92% accuracy before any capability goes live. Calibration gate: if >60% of messages show >0.95 confidence, scores are poorly calibrated.
- 8 mandatory human-in-the-loop gates, including any urgency downgrade from critical/high to low, any cross-property data aggregation with raw content, and any first auto-response to a new staff member.
- Rollback does not require approval -- anyone in the approval chain can trigger it unilaterally. Re-enabling requires full approval chain.

## Extracted Notes

- [[20260314-asymmetric-risk-false-low-worse-than-false-high]] -- The risk asymmetry principle
- [[20260314-auto-response-allowlist-structured-data-only]] -- Constraining auto-responses
- [[20260314-kill-switch-five-levels-of-granularity]] -- Multi-level kill switches
- [[20260314-shadow-mode-before-any-capability-goes-live]] -- Shadow mode validation
- [[20260314-cross-property-data-leakage-governance-landmine]] -- Data boundary risks
- [[20260314-human-in-the-loop-eight-mandatory-gates]] -- Mandatory human gates
