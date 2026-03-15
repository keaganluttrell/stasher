---
title: "Map: Stacker / Amos PMS Architecture and Decisions"
description: "Navigation map for atomic notes extracted from the Amos (Stacker) project documentation"
date: 2026-03-14
group: zk
type: map
id: "_map-stacker"
links:
  - "20260314-source-stacker-readme"
  - "20260314-amos-rebuild-nestjs-to-ash-elixir"
  - "20260314-ash-framework-declarative-resources"
  - "20260314-tiered-domain-architecture"
  - "20260314-single-business-pms-not-saas"
  - "20260314-uuidv7-sortable-primary-keys"
  - "20260314-attribute-multitenancy-property-scoped"
  - "_map-hospitality-ops"
source: "projects/stacker/stacker"
created_by: agent
---

# Map: Stacker / Amos PMS Architecture and Decisions

This map organizes the atomic notes extracted from the Amos (Stacker) project README. Amos is a hospitality PMS built on Elixir/Phoenix with the Ash Framework — a ground-up rebuild from a prior NestJS system.

## The Migration Decision

Why rebuild from scratch on a different stack?

- [[20260314-amos-rebuild-nestjs-to-ash-elixir]] — The strategic bet: rewrite cost vs long-term architectural gains
- [[20260314-ash-framework-declarative-resources]] — What Ash's declarative paradigm enables that NestJS could not

## Architecture

How the system is structured and why.

- [[20260314-tiered-domain-architecture]] — Four-tier dependency model from Identity foundations to operational concerns
- [[20260314-attribute-multitenancy-property-scoped]] — Property-scoping via attribute filtering, not schema isolation
- [[20260314-uuidv7-sortable-primary-keys]] — Time-sortable UUIDs as a primary key strategy

## Strategic Positioning

What Amos is (and is not) building toward.

- [[20260314-single-business-pms-not-saas]] — Serving one hospitality operation deeply vs building a platform

## Connections to Hospitality Operations Research

The Amos architecture directly enables the operational capabilities identified in the industry research.

- [[20260314-pms-native-ops-competitive-advantage]] — PMS-native ops is the #1 differentiator, and Amos's architecture is built for it
- [[20260314-reservation-driven-task-generation]] — The tier model enables Reservations (T2) to drive Tasks (T3) without circular deps
- [[20260314-task-lifecycle-state-machine]] — AshStateMachine maps to the industry-required task state flow
- [[20260314-cross-segment-flexibility-market-gap]] — Single-business focus + flexible domain model could serve the underserved cross-segment opportunity

See also: [[_map-hospitality-ops]] for the full hospitality operations research map.

## Open Questions

- How does the single-business constraint interact with the broader SolOS product suite vision?
- Does the Villas domain need abstraction to handle resort-style non-room locations (pools, grounds, facilities)?
- What is the event mechanism (Ash notifiers? domain events?) for reservation-to-task generation?
