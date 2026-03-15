---
title: Safety keywords force-classify messages as critical regardless of LLM output
description: >-
  Any message containing fire, injury, flood, medical, police, evacuation,
  threat, leak, gas, or allergic bypasses AI classification entirely
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-safety-keyword-force-classification
links:
  - 20260314-asymmetric-risk-false-low-worse-than-false-high
  - 20260314-deterministic-rules-before-llm
  - 20260314-human-in-the-loop-eight-mandatory-gates
source: projects/autoproxy/GOVERNANCE
created_by: agent
---

A hard override in AutoProxy's classification pipeline: any message containing safety keywords (fire, injury, flood, medical, police, evacuation, threat, leak, gas, allergic) is force-classified as critical regardless of what the LLM outputs. This is deterministic, not a suggestion.

This design choice reflects a fundamental principle about the boundary between AI judgment and rule-based safety. For most messages, the LLM's nuanced classification is valuable -- understanding that "the shower pressure felt different" is probably low urgency while "water is pouring through the ceiling" is critical. But for safety-critical terms, the LLM's confidence score is irrelevant. A message about a gas leak should never be classified as "normal" urgency, no matter how casually it is phrased ("hey, does anyone else smell gas in the kitchen?").

The keyword list is deliberately over-inclusive. "Allergic" catches both "the guest is having an allergic reaction" (critical) and "the guest asked about allergic-friendly menu options" (normal). The over-escalation is acceptable because the asymmetric risk principle applies: a false-critical (supply order treated as emergency) has low severity, while a false-low-on-actual-critical (delayed emergency response) is catastrophic.

This pattern -- deterministic overrides for safety-critical categories -- is a general principle for AI systems operating in physical-world contexts. The LLM adds value for the 95% of messages that require nuanced interpretation. For the 5% where the consequences of misclassification are severe, hard rules provide a safety floor that no amount of model improvement can replace.
