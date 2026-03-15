---
title: "Asymmetric risk principle: false-low is always worse than false-high"
description: "System biased toward over-escalation because a missed critical message is catastrophic while a nuisance false alarm is merely annoying"
date: 2026-03-14
group: zk
type: note
id: "20260314-asymmetric-risk-false-low-worse-than-false-high"
links:
  - "20260314-safety-keyword-force-classification"
  - "20260314-confidence-uncanny-valley"
  - "20260314-hospitality-domain-defeats-generic-tools"
  - "20260314-human-in-the-loop-eight-mandatory-gates"
source: "projects/autoproxy/GOVERNANCE"
created_by: agent
---

The governance framework encodes a fundamental principle: in urgency classification, false-low is always worse than false-high. The system is deliberately biased toward over-escalation.

The misclassification risk matrix makes the asymmetry concrete:

| Actual urgency | Classified as | Consequence | Severity |
|---|---|---|---|
| Critical | Low | Delayed emergency response. Guest injury report sits in batch queue. | CATASTROPHIC |
| Critical | Medium | Response delayed 15-60 min. Serious but recoverable. | HIGH |
| High | Low | Guest complaint festers. VIP request missed. | HIGH |
| High | Critical | Over-escalation. Alarm fatigue. | MEDIUM |
| Low | Critical | Nuisance. Supply order treated as emergency. | LOW |

The bottom of the matrix is key: classifying a low-urgency message as critical causes a nuisance (low severity). Classifying a critical message as low causes a catastrophe. The cost of false alarms is organizational annoyance. The cost of missed emergencies is guest safety, legal liability, and destroyed trust.

The quantified threshold: a 5% false-critical rate is acceptable; a 1% false-low-on-actual-critical rate is not.

This principle cascades through the entire system design. Urgency classification confidence threshold is 0.80 (below this, classify one level higher than the model output). The escalation decision threshold is 0.85 (below this, escalate as fail-safe). Safety keywords force-classify as critical regardless of LLM output.

The principle applies beyond AutoProxy to any AI system operating in physical-world contexts where the cost of missing something important is categorically higher than the cost of over-alerting. It is the same reasoning behind smoke detectors: false alarms are annoying but acceptable; missing a real fire is not.
