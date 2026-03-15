---
title: Eight hard kills and ten soft kills create binary validation decisions
description: The specific criteria that make kill gates decisive rather than debatable
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-kill-gate-criteria
links:
  - 20260314-kill-fast-build-slow
  - 20260314-parallel-validation-execution
  - 20260314-autoproxy-first-gtm
source: projects/soloscaler/validation-pipeline
created_by: agent
---

The validation pipeline defines two tiers of kill criteria designed to produce binary decisions at each gate:

**Hard Kills (any one is sufficient to kill):**
1. Well-funded competitor already does this with traction
2. Problem severity is "annoying" not "costly"
3. Serviceable obtainable market (SOM) revenue below $100K/year
4. Audience demand signal is ABSENT
5. Brand fit verdict is BRAND RISK
6. Solo-buildability score below 4/10
7. Unit economics are UNSUSTAINABLE
8. GTM difficulty is VERY HARD with no mitigation

**Soft Kills (3+ warrant killing):**
Fewer than 3 independent problem data points; no credible "why now?" answer; moat score averages below 2/5; no willingness-to-pay signals; core value alignment below 3/5; positioning fragility rated FRAGILE; MVP exceeds 12 weeks; maintenance burden HIGH; time-to-10-customers exceeds 12 months; break-even requires 200+ customers.

The design principle: hard kills are existential — any one means the product cannot work. Soft kills are concerning — individually manageable, but three or more in combination signal a product that will drain resources without returning value.

The $100K SOM floor (H3) is calibrated for a solo operator. A product that cannot generate $100K/year is not worth the opportunity cost. The solo-buildability threshold (H6, 4/10) acknowledges that some products are simply too complex for one person to build and maintain, regardless of market opportunity.

The 12-week MVP ceiling (S7) is particularly relevant to the Soloscaler model. If an MVP takes longer than a quarter, the solo builder has no other products advancing during that period.
