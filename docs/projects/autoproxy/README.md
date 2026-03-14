---
title: "AutoProxy: Product Overview"
description: "Overview of the AutoProxy AI-powered message proxy layer for hospitality operations, including document index, key decisions, and build order."
date: 2025-03-14
tags: autoproxy, overview, ai, messaging, hospitality, product
group: projects/autoproxy
---

# AutoProxy — Product Research

**Concept:** An AI-powered message proxy layer for both on-site hotel operations and corporate/HQ teams. Routes messages intelligently, filters noise, suggests responses, auto-answers high-confidence factual queries, detects cross-property patterns, triages reports, and generates executive digests. Your personal secretary — whether you're on the floor or in the boardroom.

**Positioning:** "You only see the messages that need you."

**Verdict:** Worth pursuing. Market gap is real at both levels, timing is right, and the structural advantage of being inside the PMS is defensible. Corporate expansion transforms AutoProxy from a feature (smart chat routing) into a platform (hospitality communication intelligence).

---

## Documents

### v2 — On-Site + Corporate/HQ (Current)

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | 10 personas (5 on-site, 5 corporate), 22 user stories, RICE-scored prioritization, phased rollout |
| [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) | On-site system architecture, data model, message flow, OTP design, Ash integration |
| [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) | Complete AI/ML spec — model selection, prompts, RAG/pgvector, classification pipeline, cost modeling, Elixir process topology |
| [ROADMAP.md](ROADMAP.md) | v2 roadmap — 7 phases (0-6), 13 resources, 8 Oban workers, ~16-23 weeks |
| [GOVERNANCE.md](GOVERNANCE.md) | Risk framework, kill switches, confidence thresholds, audit trail, compliance, rollout governance |
| [MARKET_RESEARCH.md](MARKET_RESEARCH.md) | On-site competitive landscape, shoulder-tapping data, differentiation, risks |
| [MARKET_RESEARCH_CORPORATE.md](MARKET_RESEARCH_CORPORATE.md) | Corporate/HQ market viability — executive overload, multi-property comms, competitive threats |

## Key Decisions to Resolve

1. **Domain placement** — Comms extension (`Amos.Comms.AutoProxy.*`) vs separate domain (`Amos.Proxy`). Resolve during Phase 0 spike.
2. **Auto-response sender identity** — Respond as recipient (with attribution) or as a dedicated system user?
3. **Channel-to-property association** — Channels are currently global. How does AutoProxy know which property's knowledge base to use?
4. **LLM provider** — Two-tier recommended: Haiku for classification ($0.25/M), Sonnet for generation ($3/M). Ollama for privacy-sensitive deployments.
5. **Corporate role hierarchy** — Extend Role enum vs. `escalation_level` attribute on UserRole vs. separate OrgHierarchy resource. Recommended: escalation_level on UserRole.
6. **Property attributes for smart broadcast** — Add to Property resource vs. separate PropertyProfile vs. tag system.

## Phased Build Order

### On-Site Foundation (Phases 0-4)

| Phase | Size | Resources | Workers | Weeks |
|-------|------|-----------|---------|-------|
| 0: Infrastructure & Spike | L | 2 | 0 | 1-2 |
| 1: Intelligent Routing + Escalation | XL | 2 | 2 | 3-4 |
| 2: Priority Filtering | L | 1 | 1 | 1-2 |
| 3: Suggested Responses + Campaign KB | XL | 3 | 1 | 3-4 |
| 4: Auto-Response | XL | 0 | 0 | 2-3 |

### Corporate Extension (Phases 5-6)

| Phase | Size | Resources | Workers | Weeks |
|-------|------|-----------|---------|-------|
| 5: Cross-Property Intelligence | XL | 3 | 2 | 3-4 |
| 6: Executive Digest + Report Triage | XL | 2 | 2 | 3-4 |

**Total:** 13 resources, 8 Oban workers, ~16-23 weeks. Layer 5 in the Amos layer system. Blocked until Layer 3 (policies) and Layer 4 (Oban) are substantially complete.

### MVP Options

- **Minimum On-Site**: Phases 0 + 1 (4-6 weeks) — classify and route, with escalation
- **Minimum Corporate**: Phases 0 + 1 + 3 + 5.1-5.4 (10-14 weeks) — adds campaign KB and pattern detection
- **Recommended MVP**: Phases 0-4 (10-15 weeks) — full on-site experience, corporate features layered after

## Cost Model

~$10/month per property at 100 messages/day. Classification effectively free ($0.0004/call via Haiku). Response generation is the dominant cost (Sonnet, ~20% of messages).
