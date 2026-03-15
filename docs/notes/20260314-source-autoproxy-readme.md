---
title: 'Source: AutoProxy Product Overview and Build Order'
description: >-
  Overview of AutoProxy concept, positioning, key decisions, and phased build
  order with MVP options
date: 2026-03-14T00:00:00.000Z
group: notes
type: source
id: 20260314-source-autoproxy-readme
links:
  - 20260314-pms-integration-as-structural-moat
  - 20260314-two-tier-llm-strategy
  - 20260314-cost-model-ten-dollars-per-property
  - 20260314-seven-phase-build-critical-path
source: projects/autoproxy/README
created_by: agent
---

## Key Takeaways

- Positioning: "You only see the messages that need you." AutoProxy is an AI-powered message proxy layer for both on-site and corporate hospitality operations.
- Verdict: Worth pursuing. The market gap is real, timing is right, and the structural advantage of being inside the PMS is defensible.
- Six key architectural decisions remain open: domain placement, auto-response sender identity, channel-to-property association, LLM provider, corporate role hierarchy, property attributes for smart broadcast.
- Two-tier LLM strategy: Haiku for classification ($0.25/M), Sonnet for generation ($3/M). Ollama for privacy-sensitive deployments.
- Cost model: approximately $10/month per property at 100 messages/day.
- Build order: Phases 0-4 for on-site foundation (10-15 weeks), Phases 5-6 for corporate extension (6-8 weeks), total 16-23 weeks.
- MVP options range from 4-6 weeks (classify and route only) to the full platform at 16-23 weeks.

## Extracted Notes

- [[20260314-pms-integration-as-structural-moat]] -- The PMS data advantage
- [[20260314-two-tier-llm-strategy]] -- Classification on cheap models, generation on capable ones
- [[20260314-cost-model-ten-dollars-per-property]] -- The cost model that makes it viable
- [[20260314-seven-phase-build-critical-path]] -- The phased build order and critical path
