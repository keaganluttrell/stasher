---
title: "AutoProxy costs approximately $10 per month per property at 100 messages per day"
description: "Classification is effectively free via Haiku; response generation via Sonnet on 20% of messages is the dominant cost"
date: 2026-03-14
group: zk
type: note
id: "20260314-cost-model-ten-dollars-per-property"
links:
  - "20260314-two-tier-llm-strategy"
  - "20260314-deterministic-rules-before-llm"
  - "20260314-seven-phase-build-critical-path"
source: "projects/autoproxy/AI_ARCHITECTURE"
created_by: agent
---

The cost model for AutoProxy validates the two-tier LLM strategy. At 100 messages per day per property, the breakdown is:

**Classification (every message):** Haiku at $0.25/M input, $1.25/M output. With ~500 tokens per classification call (200 input, 100 output), the cost is approximately $0.0004 per call. At 100 messages/day: $0.04/day, or $1.20/month. Effectively free.

**Response generation (approximately 20% of messages):** Sonnet at $3/M input, $15/M output. With ~2,000 tokens per generation call (1,500 input including RAG context, 200 output), the cost is approximately $0.0075 per call. At 20 messages/day: $0.15/day, or $4.50/month. This is the dominant cost.

**Embeddings:** Voyage-3-lite at $0.02/M tokens. Bulk operations (knowledge sync, pattern detection) are low volume. Approximately $0.50/month.

**Total:** Approximately $6-10/month per property, depending on message volume and generation trigger rate. The upper bound assumes higher generation rates; the lower bound reflects effective caching (15-25% cache hit rate on repeated questions).

The cost model has an important strategic implication: classification-based features (routing, filtering, escalation) can be offered at near-zero marginal cost. Response generation is the premium feature. This supports a freemium model where classification and routing are included with the PMS, and suggested/auto responses are a paid tier.

At the corporate level, digests and report triage are batch operations with predictable costs: one Sonnet call per digest (~$0.03 each). A daily digest to 50 corporate users across a management company costs approximately $45/month -- negligible against the value proposition.
