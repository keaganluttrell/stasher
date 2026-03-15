---
title: "Two-tier LLM strategy: cheap classification, capable generation"
description: "Haiku at $0.25/M for classification, Sonnet at $3/M for generation, with voyage-3-lite for embeddings and Ollama for privacy"
date: 2026-03-14
group: zk
type: note
id: "20260314-two-tier-llm-strategy"
links:
  - "20260314-cost-model-ten-dollars-per-property"
  - "20260314-fallback-chain-llm-reliability"
  - "20260314-confidence-scoring-three-signals"
  - "20260314-deterministic-rules-before-llm"
source: "projects/autoproxy/AI_ARCHITECTURE"
created_by: agent
---

AutoProxy's AI architecture uses a two-tier LLM strategy that matches model capability to task requirements, optimizing for both cost and quality.

**Tier 1 -- Classification (fast, cheap):** Claude 3.5 Haiku at $0.25/M input, $1.25/M output, 200ms median latency. Used for intent classification and urgency classification in a single call (co-located to avoid double-billing). Fallback: GPT-4o-mini. Final fallback: rule-based regex and keyword heuristics. Classification needs speed and structured output, not nuanced generation.

**Tier 2 -- Generation (capable, controlled cost):** Claude 4 Sonnet at $3/M input, $15/M output. Used for response suggestions, auto-responses, and executive digests. These outputs must be high quality because they face the user directly. Acceptable cost because only approximately 20% of messages trigger generation.

**Embeddings:** Voyage-3-lite at $0.02/M tokens, 512-dimensional. Used for knowledge base similarity search and cross-property pattern detection. Alternative: OpenAI text-embedding-3-small. For privacy-sensitive deployments: nomic-embed-text via Ollama (768-dim, CPU-capable).

All LLM calls use constrained JSON output. For Anthropic, this means the `tool_use` response format with a single tool whose input schema matches the desired output structure, forcing structured JSON without the model "choosing" to use a tool. For OpenAI, `response_format: { type: "json_schema" }`.

The two-tier approach means classification is effectively free ($0.0004/call via Haiku) while response generation is the dominant cost. At 100 messages/day with 20% triggering generation, the total cost lands at approximately $10/month per property.
