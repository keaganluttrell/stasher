---
title: Soloscaler Product Validation Pipeline
description: >-
  Four-wave validation pipeline with kill gates, agent mappings, and execution
  playbook for validating any Soloscaler product idea
date: 2026-03-14T00:00:00.000Z
group: projects/soloscaler
type: doc
id: projects/soloscaler/validation-pipeline
---

## Pipeline Philosophy

Designed for a solo operator. Three principles:

1. **Kill fast, build slow.** Front-load steps that produce kill signals. If a product should die, it dies in Week 1, not Week 6.
2. **Parallel by default.** Independent research streams run simultaneously. Sequential gates only where one step's output is a hard dependency.
3. **Stashable deliverables.** Every step produces a standalone markdown document committed to the knowledge base. No work is lost, even for killed products.

## Pipeline Structure

```
GATE 0: Thesis Check (30 min, manual)
  |
WAVE 1: Problem & Market (parallel, ~3 days)
  |--- 1A. Problem Validation (Trend Researcher)
  |--- 1B. Market Sizing (Trend Researcher)
  |--- 1C. Competitive Landscape (Trend Researcher)
  |
KILL GATE 1: Is this worth pursuing?
  |
WAVE 2: Audience & Positioning (parallel, ~3 days)
  |--- 2A. Audience Validation (Feedback Synthesizer)
  |--- 2B. Brand Fit Analysis (Brand Guardian)
  |--- 2C. Positioning Stress Test (Content Creator)
  |
KILL GATE 2: Can Soloscaler credibly own this?
  |
WAVE 3: Feasibility & GTM (parallel, ~3 days)
  |--- 3A. Technical Feasibility (Backend Architect)
  |--- 3B. GTM Path-to-10 (Growth Hacker)
  |--- 3C. Unit Economics (Analytics Reporter)
  |
KILL GATE 3: Can a soloscaler build, sell, and sustain this?
  |
WAVE 4: Synthesis & Decision (sequential, ~2 days)
  |--- 4A. Validation Synthesis (Feedback Synthesizer)
  |--- 4B. Go/No-Go Recommendation (Senior PM)
  |
OUTPUT: Build brief or kill memo
```

**Total elapsed time:** 10-14 days per product.

## Kill Criteria

### Hard Kills (any one is sufficient)

| # | Criterion | Gate | Source |
|---|-----------|------|--------|
| H1 | Well-funded competitor already does this with traction | 1 | 1C |
| H2 | Problem severity is "annoying" not "costly" | 1 | 1A |
| H3 | SOM revenue below $100K/year | 1 | 1B |
| H4 | Audience demand signal is ABSENT | 2 | 2A |
| H5 | Brand fit verdict is BRAND RISK | 2 | 2B |
| H6 | Solo-buildability score below 4/10 | 3 | 3A |
| H7 | Unit economics are UNSUSTAINABLE | 3 | 3C |
| H8 | GTM difficulty is VERY HARD with no mitigation | 3 | 3B |

### Soft Kills (3+ warrant killing)

| # | Criterion | Gate | Source |
|---|-----------|------|--------|
| S1 | Fewer than 3 independent problem data points | 1 | 1A |
| S2 | No credible "why now?" answer | 1 | 1C |
| S3 | Moat score averages below 2/5 | 1 | 1C |
| S4 | No willingness-to-pay signals | 2 | 2A |
| S5 | Core value alignment averages below 3/5 | 2 | 2B |
| S6 | Positioning fragility is FRAGILE | 2 | 2C |
| S7 | MVP exceeds 12 weeks build time | 3 | 3A |
| S8 | Maintenance burden is HIGH | 3 | 3A |
| S9 | Time-to-10-customers exceeds 12 months | 3 | 3B |
| S10 | Break-even requires 200+ customers | 3 | 3C |

## Multi-Product Parallel Execution

```
Day 1:  Stacker Gate 0 + Wave 1 launch
Day 2:  AutoProxy Gate 0 + Wave 1 launch
Day 4:  Stacker Gate 1 + Wave 2 launch
Day 5:  AutoProxy Gate 1 + Wave 2 launch
Day 7:  Stacker Gate 2 + Wave 3 launch
Day 8:  AutoProxy Gate 2 + Wave 3 launch
Day 10: Stacker Gate 3 + Wave 4 launch
Day 11: AutoProxy Gate 3 + Wave 4 launch
Day 14: Both products have Go/No-Go decisions
```

## Product-Specific Notes

### Stacker
- Run two parallel thesis checks: "hospitality PMS" vs "composable business stack" -- different kill profiles
- Explicitly assess the Ash Framework bet in technical feasibility
- Validate: do small businesses want to replace Slack, or want a PMS that includes messaging?

### AutoProxy
- Existing market research should be stress-tested, not accepted at face value
- Validate hospitality vertical first (narrower, more defensible), then horizontal expansion
- Critical fork: standalone product vs embedded Stacker feature -- validate both GTM scenarios
- Assess integration dependency: what happens to AutoProxy if Stacker doesn't get traction?

## Deliverable Inventory

15 documents per product, all stashable to `stasher/docs/projects/soloscaler/validation/[product]/`.

Full agent prompts for each step are in the master pipeline document at `/Users/keagan/repos/brand/validation-pipeline.md`.
