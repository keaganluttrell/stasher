---
title: 'Amos is a single-business PMS, not a multi-tenant SaaS platform'
description: >-
  The strategic decision to build for one hospitality operation rather than a
  platform serving many
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-single-business-pms-not-saas
links:
  - 20260314-amos-rebuild-nestjs-to-ash-elixir
  - 20260314-attribute-multitenancy-property-scoped
  - 20260314-pms-native-ops-competitive-advantage
  - 20260314-cross-segment-flexibility-market-gap
source: projects/stacker/stacker
created_by: agent
---

# Amos is a single-business PMS, not a multi-tenant SaaS platform

Amos explicitly positions itself as "a single-business PMS, not a multi-tenant SaaS platform." This is a deliberate scope constraint that shapes every architectural decision. The system serves as the single source of truth for one hospitality operation's properties, not as a platform hosting many different businesses.

This means the multitenancy boundary is at the property level, not the organization level. Multiple properties belonging to the same business can coexist (using `property_id` attribute-based scoping), but there is no concept of separate tenant accounts, billing isolation, or data partitioning between different businesses.

**What this enables**: Simpler data model, no tenant isolation concerns, no per-tenant customization complexity, no billing/subscription management, no onboarding flows for external users. The team can focus entirely on domain richness rather than platform concerns.

**What this forecloses**: Amos cannot be offered as a hosted product to other hospitality businesses without significant rearchitecting. If the business strategy ever shifts toward productizing the PMS for external customers, the single-business assumption would need to be unwound at every layer.

This decision aligns with a "build for yourself first" philosophy — solving your own operational problems deeply before (if ever) generalizing. It is the opposite of the common startup pattern of building a multi-tenant SaaS from day one and struggling to find product-market fit.

The connection to competitive positioning is interesting: the hospitality ops research shows that PMS-native operations is the #1 competitive advantage. By building the PMS and the operations layer together for a single business, Amos achieves the tightest possible integration. A multi-tenant platform would require abstractions that create distance between the PMS core and operational features.

**Open question**: Does "single-business" eventually become a constraint as the SolOS product suite vision evolves? If Soloscaler or other products target external customers, how does Amos's single-business architecture interact with a broader product ecosystem?
