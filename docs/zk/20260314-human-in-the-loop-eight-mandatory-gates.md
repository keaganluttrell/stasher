---
title: "Eight scenarios where AutoProxy must always require human approval"
description: "Hard-coded human-in-the-loop gates for safety, HR, legal, financial, cross-property, guest-facing, new staff, and urgency downgrades"
date: 2026-03-14
group: zk
type: note
id: "20260314-human-in-the-loop-eight-mandatory-gates"
links:
  - "20260314-asymmetric-risk-false-low-worse-than-false-high"
  - "20260314-auto-response-allowlist-structured-data-only"
  - "20260314-cross-property-data-leakage-governance-landmine"
  - "20260314-safety-keyword-force-classification"
source: "projects/autoproxy/GOVERNANCE"
created_by: agent
---

The governance framework defines eight scenarios where AutoProxy must always require human approval, regardless of confidence score, capability maturity, or property-level settings. These are hard gates, not configurable thresholds.

1. **Any auto-response about safety, health, legal, financial, or HR.** These categories are permanently excluded from automation because the liability of a wrong answer exceeds any efficiency gain.

2. **Any routing for HR, legal, executive, or financial channels.** These channels use explicit recipient lists only. AutoProxy never routes messages into or within these channels.

3. **Any cross-property data aggregation with raw message content.** Only pre-computed, anonymized metrics may cross property boundaries. Raw text stays within its property context.

4. **Any executive digest before distribution.** Digests aggregate the most sensitive data into a single artifact. An LLM-drafted digest that includes a layoff plan, a pending lawsuit, and a revenue shortfall sent to the wrong distribution list is catastrophic.

5. **Any circular escalation.** If a message has already been escalated once and returned, AutoProxy requires human judgment before re-escalating. This prevents infinite escalation loops.

6. **Any message from or to guest-facing channels.** AutoProxy is internal-only in its initial design. Guest-facing auto-response is a future phase with much higher validation requirements.

7. **Any first auto-response to a new staff member.** The first time AutoProxy answers on behalf of someone new, a human must approve. This prevents the system from creating a bad first impression with a staff member who has never seen AutoProxy operate.

8. **Any urgency downgrade from critical/high to low.** The asymmetric risk principle means the system can upgrade urgency automatically (fail-safe) but requires human confirmation to downgrade (the cost of missing a real critical is catastrophic).

These gates represent the outer boundary of automation. Within this boundary, confidence thresholds and capability maturity can be tuned. Outside this boundary, no amount of model improvement justifies removing the human.
