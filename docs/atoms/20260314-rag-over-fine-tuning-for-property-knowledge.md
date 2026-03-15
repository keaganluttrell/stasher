---
title: RAG with pgvector wins over fine-tuning for property-specific knowledge
description: >-
  Knowledge changes too frequently, too few examples per property, and
  operational cost of per-property fine-tuned models is prohibitive
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-rag-over-fine-tuning-for-property-knowledge
links:
  - 20260314-two-tier-llm-strategy
  - 20260314-pms-integration-as-structural-moat
  - 20260314-auto-response-allowlist-structured-data-only
  - 20260314-campaign-kb-corporate-property-bridge
source: projects/autoproxy/AI_ARCHITECTURE
created_by: agent
---

The AI architecture explicitly rejects fine-tuning in favor of RAG (Retrieval-Augmented Generation) with pgvector for property-specific knowledge. The reasoning is threefold.

**1. Knowledge changes frequently.** Property menus update, policies change, seasonal hours rotate, staff assignments shift. Fine-tuning requires retraining on each change -- weeks of latency before the model reflects reality. RAG reflects changes immediately: update a knowledge entry, and the next query uses it.

**2. Too few examples per property.** A 20-villa property might have 200 FAQ entries, 50 policies, and 30 procedures. This is insufficient to fine-tune a model effectively. RAG works well with small corpora because it retrieves relevant chunks rather than requiring the model to internalize everything.

**3. Operational cost is prohibitive.** Maintaining fine-tuned models per property (each with different knowledge, different terminology, different policies) at scale is operationally impossible. RAG uses the same base model for every property; only the knowledge corpus differs.

Prompt stuffing is also rejected: property knowledge exceeds what fits in a classification prompt budget. A 20-villa property with full FAQs, policies, and procedures would be 15,000+ tokens. The classification budget is 2,000 tokens.

The implementation uses pgvector in the existing Postgres database (no separate vector database needed at this scale). Knowledge is chunked into 200-400 token entries, embedded with voyage-3-lite, and retrieved with cosine similarity. The retrieval pipeline embeds the message, queries the top 5 chunks filtered by property and active status, re-ranks by category relevance, and takes the top 3 for the response generation prompt.

RAG also provides a critical audit advantage: every auto-response can cite which knowledge entries it used. This traceability is essential for the governance framework's requirement that auto-responses be citation-verified.
