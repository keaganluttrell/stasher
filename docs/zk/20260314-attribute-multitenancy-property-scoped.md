---
title: "Property-scoped multitenancy uses attribute filtering, not schema isolation"
description: "How Amos implements property-level data isolation via property_id rather than separate schemas"
date: 2026-03-14
group: zk
type: note
id: "20260314-attribute-multitenancy-property-scoped"
links:
  - "20260314-single-business-pms-not-saas"
  - "20260314-ash-framework-declarative-resources"
  - "20260314-tiered-domain-architecture"
source: "projects/stacker/stacker"
created_by: agent
---

# Property-scoped multitenancy uses attribute filtering, not schema isolation

Amos uses attribute-based multitenancy via `property_id` to scope resources to specific properties. This means all properties share the same database schema and tables, with a `property_id` column on each property-scoped resource acting as the tenant discriminator. Ash Framework applies this as a base filter, so queries automatically include the property scope without developers needing to remember it.

Not all resources are property-scoped. The architecture distinguishes between:

- **Property-scoped resources**: Villas, Reservations, Tasks, Catalog items, Folios — these belong to a specific property
- **Global resources**: Users, Contacts, Channels, Media — these are cross-property by nature (a user can operate across multiple properties, a contact may have reservations at different properties)

This design is simpler than schema-per-tenant (where each property would get its own PostgreSQL schema) or database-per-tenant approaches. The trade-offs:

**Advantages**: Single migration path (one schema to maintain), simpler queries across properties when needed, no connection pool multiplication, straightforward backups and reporting.

**Disadvantages**: No hard data isolation between properties (a bug in query scoping could leak data across properties), all properties share database resources (no per-property resource limits), and the `property_id` filter must be consistently applied.

For a single-business PMS where all properties belong to the same organization, attribute-based multitenancy is appropriate. The data isolation requirements are about operational correctness (showing the right rooms for the right property), not security boundaries between competing businesses. If Amos ever needed to serve separate businesses, this decision would need revisiting — schema isolation or separate databases would provide the hard boundaries that attribute filtering cannot guarantee.
