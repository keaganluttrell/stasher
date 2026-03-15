---
title: "Auto-response is restricted to an allowlist of categories answered from structured data, not LLM generation"
description: "The LLM classifies the question but the answer comes from a versioned data field lookup -- never safety, health, financial, legal, or HR topics"
date: 2026-03-14
group: zk
type: note
id: "20260314-auto-response-allowlist-structured-data-only"
links:
  - "20260314-confidence-uncanny-valley"
  - "20260314-trust-destruction-ai-detected-communication"
  - "20260314-rag-over-fine-tuning-for-property-knowledge"
  - "20260314-confidence-scoring-three-signals"
  - "20260314-asymmetric-risk-false-low-worse-than-false-high"
source: "projects/autoproxy/GOVERNANCE"
created_by: agent
---

Auto-response is the highest-liability capability in AutoProxy, and the governance framework constrains it aggressively. The core rule: auto-response is permitted only when the answer is sourced from a structured, versioned data field -- not from LLM generation. The LLM classifies the question; the answer comes from a lookup.

The allowlist is narrow by design:
- Property amenity hours (structured data field)
- Property directions and locations (structured data field)
- Standard checkout/check-in times (structured data field)
- Wi-Fi instructions (structured data field)

The exclusion list is broad by design. AutoProxy must never auto-respond to: safety questions, health questions, financial or billing matters, legal questions, HR matters, guest complaints, anything emotional or requiring judgment, anything about other guests or staff, and anything involving money.

The rationale is liability-driven. A wrong auto-response about pool chemical safety, fire exits, allergens, or checkout billing is a lawsuit. The governance framework requires three simultaneous conditions before auto-response activates at any property: hard-coded category exclusions (safety, health, legal, financial, HR), per-property opt-in with GM sign-off, and a conservative confidence floor (0.95+).

The technical implementation adds a citation verification layer: after the LLM generates a response, every claim in the response is traced back to a KnowledgeEntry. If any claim cannot be sourced to a specific entry, the response is downgraded from auto-response to a human-reviewed suggestion. This ensures the system cannot hallucinate a factual answer and send it automatically.

Rate limits provide an additional safety net: 20 auto-responses per property per hour, 100 per day. Exceeding either disables auto-response for the property until manual review.
