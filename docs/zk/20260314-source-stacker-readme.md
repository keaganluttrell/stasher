---
title: "Source: Amos (Stacker) Project README"
description: "Source note for the Amos PMS project overview — architecture, tech stack, and domain model"
date: 2026-03-14
group: zk
type: source
id: "20260314-source-stacker-readme"
links:
  - "20260314-amos-rebuild-nestjs-to-ash-elixir"
  - "20260314-ash-framework-declarative-resources"
  - "20260314-tiered-domain-architecture"
  - "20260314-single-business-pms-not-saas"
  - "20260314-uuidv7-sortable-primary-keys"
  - "20260314-attribute-multitenancy-property-scoped"
source: "projects/stacker/stacker"
created_by: agent
---

# Source: Amos (Stacker) Project README

Amos is a hospitality property management system built on Elixir/Phoenix with the Ash Framework. It is a ground-up rebuild of a prior NestJS system called "Stacker," preserving the domain model while moving to Ash's declarative resource paradigm. The system is API-only (no frontend), uses PostgreSQL, and targets single-business hospitality operations rather than multi-tenant SaaS.

## Key Takeaways

- Amos represents a deliberate architectural migration from NestJS to Ash/Elixir, motivated by Ash's declarative resource system and Elixir's concurrency model
- The domain architecture uses a tiered dependency model (Tier 0 foundations like Identity/Property up through Tier 3 concerns like Payments/Tasks/Comms)
- Design decision: single-business PMS, not multi-tenant SaaS — property-scoped multitenancy via `property_id` attribute rather than schema isolation
- Tech choices include UUIDv7 for sortable primary keys, AshStateMachine for reservation/task state, AshMoney for monetary amounts, and AshArchival for soft deletes
- The Tasks domain (Tier 3) includes TaskGroup, Checklist, Task, and TaskMedia — directly relevant to the housekeeping/maintenance research

## Extracted Notes

- [[20260314-amos-rebuild-nestjs-to-ash-elixir]] — Why Amos was rebuilt from scratch on a different stack
- [[20260314-ash-framework-declarative-resources]] — Ash's resource-centric paradigm and what it enables
- [[20260314-tiered-domain-architecture]] — The dependency tier model for domain organization
- [[20260314-single-business-pms-not-saas]] — Strategic choice to serve a single property, not a platform
- [[20260314-uuidv7-sortable-primary-keys]] — UUIDv7 as a deliberate primary key strategy
- [[20260314-attribute-multitenancy-property-scoped]] — Property-scoping via attribute rather than schema isolation
