---
title: 'Map: AutoProxy -- AI Message Intelligence Layer for Hospitality'
description: >-
  Map connecting all atomic notes extracted from the AutoProxy project
  documentation across market research, architecture, governance, and roadmap
date: 2026-03-14T00:00:00.000Z
group: maps
type: map
id: _map-autoproxy
links:
  - 20260314-source-autoproxy-prd
  - 20260314-source-autoproxy-readme
  - 20260314-source-autoproxy-market-research
  - 20260314-source-autoproxy-market-research-corporate
  - 20260314-source-autoproxy-ai-architecture
  - 20260314-source-autoproxy-governance
  - 20260314-source-autoproxy-roadmap
  - 20260314-source-autoproxy-technical-spec
  - 20260314-source-autoproxy-technical-spec-v2
source: projects/autoproxy/README
created_by: agent
---

# AutoProxy: AI Message Intelligence Layer for Hospitality

AutoProxy is an AI-powered message proxy that sits inside the Amos PMS, classifying every message and making one of four decisions: answer it, route it, absorb it, or escalate it. It operates at both property scope (on-site operations) and portfolio scope (corporate/HQ oversight).

This map organizes 27 atomic notes extracted from 9 source documents. Navigate by theme below or follow cross-links between notes.

---

## Source Documents

| Source | Focus |
|---|---|
| [[20260314-source-autoproxy-prd]] | 10 personas, 22 user stories, phased rollout |
| [[20260314-source-autoproxy-readme]] | Product overview, key decisions, build order |
| [[20260314-source-autoproxy-market-research]] | On-site competitive landscape, differentiation |
| [[20260314-source-autoproxy-market-research-corporate]] | Corporate market viability, threat assessment |
| [[20260314-source-autoproxy-ai-architecture]] | LLM strategy, RAG, classification, cost modeling |
| [[20260314-source-autoproxy-governance]] | Risk framework, kill switches, compliance |
| [[20260314-source-autoproxy-roadmap]] | Seven-phase build sequence, prerequisites |
| [[20260314-source-autoproxy-technical-spec]] | On-site architecture, data model, Ash integration |
| [[20260314-source-autoproxy-technical-spec-v2]] | Corporate extension, two-scope pipeline |

---

## 1. The Problem and Market Opportunity

Why AutoProxy exists and why now.

- [[20260314-shoulder-tapping-tax]] -- The compounding cost of interruptions: 275/day, 23 min recovery each
- [[20260314-ai-adoption-paradox]] -- AI is increasing workloads (+145% messaging), creating demand for reduction layers
- [[20260314-corporate-property-communication-fault-line]] -- Structural async/sync mismatch between corporate and property that no tool bridges

## 2. Competitive Position and Strategy

Where AutoProxy fits and what protects it.

- [[20260314-competitive-gap-no-ai-proxy-internal-hospitality]] -- Nobody builds an AI proxy for internal hospitality operations
- [[20260314-faster-inbox-vs-smaller-inbox]] -- The core positioning distinction against Copilot/Slack AI
- [[20260314-hospitality-domain-defeats-generic-tools]] -- Five characteristics that make generic AI fail in hospitality
- [[20260314-pms-integration-as-structural-moat]] -- Being inside the PMS is a structural advantage, not a feature
- [[20260314-onsite-vs-corporate-competitive-shift]] -- On-site competes with tools lacking AI; corporate competes with AI lacking context
- [[20260314-competitive-window-12-18-months]] -- 12-18 months before horizontal AI develops hospitality routing
- [[20260314-single-pane-communication-intelligence-layer]] -- AutoProxy as an intelligence layer, not a messaging app

## 3. Product Design and UX

How AutoProxy works from the user's perspective.

- [[20260314-four-decisions-per-message]] -- Answer, route, absorb, or escalate every message
- [[20260314-invisible-ux-high-turnover-adoption]] -- Invisible UX for a 73.8% turnover workforce
- [[20260314-exception-based-digest-design]] -- Silence when fine, a ping when something is off
- [[20260314-campaign-kb-corporate-property-bridge]] -- Campaign brief to auto-answered property questions
- [[20260314-report-intelligence-highest-value-corporate-wedge]] -- Report triage as the first corporate feature

## 4. AI Architecture and Technical Decisions

How the intelligence layer is built.

- [[20260314-two-tier-llm-strategy]] -- Haiku for classification, Sonnet for generation
- [[20260314-rag-over-fine-tuning-for-property-knowledge]] -- RAG with pgvector wins over fine-tuning
- [[20260314-deterministic-rules-before-llm]] -- Rules for the 80%, LLM for the nuanced 20%
- [[20260314-confidence-scoring-three-signals]] -- Confidence from self-report + calibration + agreement
- [[20260314-fallback-chain-llm-reliability]] -- Three-level fallback so AI failure never blocks messaging
- [[20260314-cross-property-pattern-detection-via-embeddings]] -- Embedding similarity detects multi-property patterns
- [[20260314-domain-placement-comms-extension-vs-separate]] -- Evolved from Comms extension to separate Proxy domain
- [[20260314-async-processing-oban-not-inline]] -- Oban for reliability, observability, rate limiting
- [[20260314-two-scopes-one-pipeline]] -- Property and portfolio scope in one unified pipeline
- [[20260314-cost-model-ten-dollars-per-property]] -- $10/month/property, classification effectively free

## 5. Governance and Safety

How automation risk is managed.

- [[20260314-asymmetric-risk-false-low-worse-than-false-high]] -- System biased toward over-escalation
- [[20260314-auto-response-allowlist-structured-data-only]] -- Only structured data lookups, never LLM generation
- [[20260314-confidence-uncanny-valley]] -- 85% accuracy destroys trust faster than no automation
- [[20260314-trust-destruction-ai-detected-communication]] -- Detected AI communication damages trust
- [[20260314-kill-switch-five-levels-of-granularity]] -- Five-level kill switches, asymmetric activation
- [[20260314-shadow-mode-before-any-capability-goes-live]] -- 500 messages at 92% accuracy before going live
- [[20260314-cross-property-data-leakage-governance-landmine]] -- Data boundary failures are termination-level
- [[20260314-human-in-the-loop-eight-mandatory-gates]] -- Eight scenarios that always require humans
- [[20260314-safety-keyword-force-classification]] -- Safety keywords bypass AI classification entirely

## 6. Build Sequence

How it gets built.

- [[20260314-seven-phase-build-critical-path]] -- Seven phases, 16-23 weeks, critical path through routing to corporate

---

## Key Argument Chains

**Why AutoProxy wins:** The shoulder-tapping tax is real -> AI adoption paradox means reduction layers are needed -> nobody builds this for hospitality -> PMS integration is the structural moat -> five domain characteristics defeat generic tools -> the competitive window is 12-18 months.

**Why auto-response is the last feature, not the first:** Trust destruction from detected AI -> confidence uncanny valley at 85% -> asymmetric risk of false-low -> structured data allowlist only -> shadow mode validation -> human-in-the-loop gates -> 14 weeks minimum per property from shadow to auto-response.

**Why corporate expansion is defensible but dangerous:** Corporate-property fault line is real -> report intelligence is the safest wedge -> on-site vs. corporate competitive shift changes the threat surface -> scope discipline is critical -> PMS anchor is the constraint that keeps it defensible.
