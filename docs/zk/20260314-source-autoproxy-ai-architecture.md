---
title: "Source: AutoProxy AI Message Intelligence Architecture"
description: "Buildable specification for AI/ML layer covering model selection, prompt design, RAG, classification pipeline, cost modeling, and Elixir process topology"
date: 2026-03-14
group: zk
type: source
id: "20260314-source-autoproxy-ai-architecture"
links:
  - "20260314-two-tier-llm-strategy"
  - "20260314-rag-over-fine-tuning-for-property-knowledge"
  - "20260314-confidence-scoring-three-signals"
  - "20260314-fallback-chain-llm-reliability"
  - "20260314-deterministic-rules-before-llm"
  - "20260314-cost-model-ten-dollars-per-property"
  - "20260314-cross-property-pattern-detection-via-embeddings"
source: "projects/autoproxy/AI_ARCHITECTURE"
created_by: agent
---

## Key Takeaways

- Two-tier LLM strategy: Haiku ($0.25/M) for classification, Sonnet ($3/M) for generation. Voyage-3-lite for embeddings. All use constrained JSON output via tool_use or json_schema.
- Three-level fallback chain: primary model -> fallback model -> deterministic rules. Message delivery is never blocked waiting for classification.
- RAG with pgvector chosen over fine-tuning (knowledge changes too frequently, too few examples per property, prohibitive operational cost) and prompt stuffing (property knowledge exceeds context budget).
- Confidence scores derived from three signals: LLM self-reported confidence, historical Platt scaling calibration after 500+ messages, and agreement scoring via dual-prompt classification.
- Property context injection follows a priority budget: always-included property basics (200 tokens), intent-relevant operational data (500 tokens), RAG results (1000 tokens), thread context (300 tokens).
- Cross-property pattern detection uses pgvector cosine similarity (>0.85 threshold) in 15-minute sliding windows, clustering 3+ properties asking similar questions.
- Anomaly detection is statistical-first (z-score > 2.0 on 30-day rolling averages), with LLM narration only for detected anomalies -- a hybrid approach that avoids sending all metrics through LLMs.

## Extracted Notes

- [[20260314-two-tier-llm-strategy]] -- Model selection by task
- [[20260314-rag-over-fine-tuning-for-property-knowledge]] -- Why RAG wins
- [[20260314-confidence-scoring-three-signals]] -- How confidence is actually computed
- [[20260314-fallback-chain-llm-reliability]] -- Never block on AI failure
- [[20260314-deterministic-rules-before-llm]] -- Rules for the 80%, LLM for the 20%
- [[20260314-cost-model-ten-dollars-per-property]] -- Cost modeling
- [[20260314-cross-property-pattern-detection-via-embeddings]] -- Pattern detection architecture
