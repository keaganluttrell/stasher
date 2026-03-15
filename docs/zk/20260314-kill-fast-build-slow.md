---
title: "Kill fast, build slow — front-load kill signals to protect solo operator time"
description: "The validation philosophy that makes dead products die in Week 1, not Week 6"
date: 2026-03-14
group: zk
type: note
id: "20260314-kill-fast-build-slow"
links:
  - "20260314-kill-gate-criteria"
  - "20260314-stashable-deliverables"
  - "20260314-parallel-validation-execution"
  - "20260314-soloscaler-thesis"
source: "projects/soloscaler/validation-pipeline"
created_by: agent
---

The Soloscaler validation pipeline is built on three principles, but the first is the most consequential: **kill fast, build slow.** Front-load steps that produce kill signals. If a product should die, it dies in Week 1, not Week 6.

This is a direct application of the Leverage Over Labor value to product development. A solo operator's most expensive resource is time. Six weeks spent building a product that should have been killed in week one is catastrophic at soloscaler scale — there is no team to absorb the lost time, no parallel workstreams running in the background.

The pipeline structures kill opportunities into three gates:

- **Kill Gate 1** (after Wave 1: Problem and Market): Is this worth pursuing? Checks problem severity, market size, and competitive landscape.
- **Kill Gate 2** (after Wave 2: Audience and Positioning): Can Soloscaler credibly own this? Checks audience demand, brand fit, and positioning durability.
- **Kill Gate 3** (after Wave 3: Feasibility and GTM): Can a soloscaler build, sell, and sustain this? Checks technical feasibility, go-to-market path, and unit economics.

Each gate is designed to be passed or failed, not debated. The criteria are specific enough to produce binary decisions. This is deliberate — ambiguity at a kill gate wastes the exact time the gate is designed to save.

The total elapsed time is 10-14 days per product. This means a solo operator can validate two products in a month with high confidence, rather than building one product in a month with uncertainty.
