---
title: "Campaign knowledge base bridges corporate intent to property execution"
description: "Corporate uploads a brief once, AutoProxy builds a Q&A knowledge base, and property questions are auto-answered from a single source of truth"
date: 2026-03-14
group: zk
type: note
id: "20260314-campaign-kb-corporate-property-bridge"
links:
  - "20260314-corporate-property-communication-fault-line"
  - "20260314-rag-over-fine-tuning-for-property-knowledge"
  - "20260314-cross-property-pattern-detection-via-embeddings"
  - "20260314-report-intelligence-highest-value-corporate-wedge"
source: "projects/autoproxy/TECHNICAL_SPEC_V2"
created_by: agent
---

The campaign knowledge base is one of AutoProxy's most elegant features because it directly addresses the corporate-to-property communication fault line with a scalable, automated solution.

The workflow: corporate marketing (or HR, or finance) uploads a campaign brief. AutoProxy's LLM generates anticipated Q&A pairs from the brief. The campaign owner reviews and approves the generated entries. When properties ask implementation questions, they are matched against the campaign Q&A and auto-responded with source citations. Questions that do not match are routed to the campaign owner and, once answered, added to the Q&A for future auto-response.

The Campaign resource has a lifecycle state machine: draft (being authored, not visible to AutoProxy), active (entries included in RAG retrieval for target properties), paused (temporarily excluded), expired (auto-transitioned when `ends_at` passes), archived (soft-deleted). Knowledge retrieval precedence is campaign -> property -> organization, with campaign entries taking priority during active campaigns.

What makes this powerful is the consistency enforcement. When 8 properties ask the same question about a new rate promotion, they all get the same answer from the same source of truth. Currently, the corporate marketer either writes the same answer 8 times or writes it once and hopes it gets forwarded accurately -- the telephone game problem.

The feature creates a virtuous cycle: answered questions populate the knowledge base, which auto-resolves future identical questions, which frees the campaign owner to focus on the 10% of questions that genuinely need creative judgment. The rollout dashboard shows which properties have acknowledged, which have asked questions, and which have not engaged -- replacing the manual tracking that currently consumes hours.

Technically, it uses the same RAG pipeline as property knowledge, just scoped to `knowledge_scope: :campaign` with an associated Campaign record and target property filters.
