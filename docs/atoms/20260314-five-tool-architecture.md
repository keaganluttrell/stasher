---
title: 'Brain, hands, nerve center, face, shield — the five-tool metaphor for SolOS'
description: >-
  How the five SolOS components map to body metaphors and create system
  coherence
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-five-tool-architecture
links:
  - 20260314-solos-operating-system
  - 20260314-stasher-knowledge-brain
  - 20260314-autoproxy-attention-shield
  - 20260314-six-product-portfolio
source: projects/soloscaler/solos-product-suite
created_by: agent
---

The SolOS architecture uses a body metaphor to explain how five tools form a single system:

- **Stasher** is the brain. Everything reads from it. It stores the knowledge that makes the rest intelligent.
- **Staffer** is the hands. It does the work. You submit a request, it dispatches agents, the work gets done.
- **Stacker** is the nerve center. Everything flows through it. Communication, tasks, routing, and coordination.
- **Static** is the face. It shows the world who you are. Marketing pages, blogs, content sites.
- **AutoProxy** is the shield. It protects your time and answers on your behalf.

This metaphor works because it establishes interdependence. A brain without hands cannot act. Hands without a brain are aimless. A nerve center without a face cannot engage the world. A shield without a brain cannot distinguish threats from opportunities.

The architecture has two hub components: Stasher (data hub — everything reads from it) and Stacker (operations hub — everything flows through it). This dual-hub design means the system has two potential failure points, but also two strong integration layers.

Staffer is the most novel component. It operates like a staffing agency — you describe a job, Staffer assigns the right agents, they pull context from Stasher and post results to Stacker. This is the thesis in miniature: one person operates like a team because the "team" is AI agents coordinated by software.

The five-tool architecture maps partially to the six-product portfolio in the brand-fit analysis. Sentinel, Playbook, Cashview, and Dealflow appear to be domain modules within Stacker rather than separate tools, suggesting the architecture may evolve as the product vision matures.
