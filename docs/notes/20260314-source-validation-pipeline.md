---
title: 'Source: Soloscaler Product Validation Pipeline'
description: Source note for the validation pipeline and kill gate system
date: 2026-03-14T00:00:00.000Z
group: notes
type: source
id: 20260314-source-validation-pipeline
links:
  - 20260314-kill-fast-build-slow
  - 20260314-kill-gate-criteria
  - 20260314-stashable-deliverables
  - 20260314-parallel-validation-execution
  - projects/soloscaler/validation-pipeline
source: projects/soloscaler/validation-pipeline
created_by: agent
---

## Key Takeaways

- Three pipeline principles: kill fast build slow, parallel by default, stashable deliverables
- Four waves: Problem/Market, Audience/Positioning, Feasibility/GTM, Synthesis/Decision
- Kill gates after each wave with 8 hard kills and 10 soft kills (3+ soft kills warrant killing)
- Total elapsed time: 10-14 days per product — designed for solo operator velocity
- Multi-product parallel execution can validate two products in 14 days
- Every step produces a standalone markdown document — no work is lost even for killed products

## Extracted Notes

- [[20260314-kill-fast-build-slow]] — Front-loading kill signals to save time
- [[20260314-kill-gate-criteria]] — The hard and soft kill framework
- [[20260314-stashable-deliverables]] — Why every validation step produces a permanent artifact
- [[20260314-parallel-validation-execution]] — Running independent research streams simultaneously
