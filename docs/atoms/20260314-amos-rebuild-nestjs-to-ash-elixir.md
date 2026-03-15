---
title: Amos was rebuilt from NestJS to Ash/Elixir to gain declarative domain modeling
description: >-
  The decision to rewrite the Stacker PMS from scratch on Elixir/Ash rather than
  iterate on NestJS
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-amos-rebuild-nestjs-to-ash-elixir
links:
  - 20260314-ash-framework-declarative-resources
  - 20260314-tiered-domain-architecture
  - 20260314-single-business-pms-not-saas
source: projects/stacker/stacker
created_by: agent
---

# Amos was rebuilt from NestJS to Ash/Elixir to gain declarative domain modeling

Amos is a ground-up rebuild of a prior NestJS system called "Stacker." The project preserved the domain model — the understanding of what a hospitality PMS needs to track — while completely replacing the implementation stack. This is not a migration or port; it is a rewrite that treats the original system as a domain reference (the original Prisma schema is kept in `reference/schema.prisma`).

The decision to rewrite rather than refactor suggests that the limitations encountered in NestJS were architectural, not superficial. NestJS (TypeScript/Node) is imperative and decorator-heavy. Ash Framework on Elixir offers a fundamentally different paradigm: resources are declared, not coded. Actions, policies, state machines, and data persistence are all expressed as configuration within the resource definition rather than as scattered controller/service/repository layers.

This trade-off is significant. A rewrite carries high short-term cost (rebuilding everything from scratch) but bets on lower long-term complexity. Declarative systems tend to have less surface area for bugs because behavior is defined in one place per resource. The Elixir runtime (BEAM) also provides concurrency and fault tolerance that Node.js cannot match, which matters for a system handling real-time room status updates, task assignments, and reservation state changes.

The preserved domain model acts as a bridge — ensuring that hard-won domain knowledge (what properties, reservations, tasks, and payments actually look like in hospitality) survives the technology transition.

**Key tension**: Rewrites famously fail (Joel Spolsky's "things you should never do"). The mitigating factor here is that the domain model was already validated through the NestJS version. This is not speculative architecture — it is re-implementing known requirements on a better-suited foundation.
