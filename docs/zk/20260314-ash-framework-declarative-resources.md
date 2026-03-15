---
title: "Ash Framework treats resources as declarations, not imperative code"
description: "How Ash's declarative resource system shapes the Amos architecture"
date: 2026-03-14
group: zk
type: note
id: "20260314-ash-framework-declarative-resources"
links:
  - "20260314-amos-rebuild-nestjs-to-ash-elixir"
  - "20260314-tiered-domain-architecture"
  - "20260314-task-lifecycle-state-machine"
  - "20260314-attribute-multitenancy-property-scoped"
source: "projects/stacker/stacker"
created_by: agent
---

# Ash Framework treats resources as declarations, not imperative code

Ash Framework 3.x is the architectural backbone of Amos. Unlike traditional MVC or service-layer patterns where behavior is spread across controllers, services, repositories, and middleware, Ash consolidates everything about a resource into a single declarative definition. A resource file declares its attributes, relationships, actions (CRUD and custom), authorization policies, state machines, and data layer in one place.

The Amos tech stack leverages several Ash extensions as first-class building blocks:

- **AshPostgres** — PostgreSQL persistence without hand-written Ecto schemas
- **AshAuthentication** — staff auth with password strategy and token revocation
- **AshStateMachine** — reservation and task state management (directly relevant to the Tasks domain that manages housekeeping workflows)
- **AshArchival** — soft deletes with automatic base filters (deleted records are invisible by default)
- **AshMoney** — monetary amount handling without raw decimals or integer cents

This declarative approach has a compounding benefit: as the domain grows (Amos has 7 domains across 4 tiers), each new resource follows the same pattern. There is no architectural drift because the framework enforces the pattern. Code generation (`mix ash.codegen`) and migration generation (`mix ash_postgres.generate_migrations`) derive from the resource definitions, keeping schema and behavior in sync.

The trade-off is framework coupling. Ash is opinionated and not yet as mature or widely adopted as Rails or Django. If Ash development stalled or took a direction incompatible with Amos's needs, the cost of extraction would be high. But within its paradigm, Ash eliminates large categories of boilerplate and consistency bugs that plague imperative approaches.

**Connection to task management**: AshStateMachine is particularly relevant for the housekeeping/maintenance domain, where tasks flow through states like created, assigned, in_progress, completed, and verified. Declaring these transitions in the resource definition rather than coding them in service layers reduces the risk of invalid state transitions.
