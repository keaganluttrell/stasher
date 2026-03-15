---
title: "Amos organizes domains into dependency tiers from foundation to operations"
description: "The four-tier domain architecture that enforces dependency direction in the Amos PMS"
date: 2026-03-14
group: zk
type: note
id: "20260314-tiered-domain-architecture"
links:
  - "20260314-amos-rebuild-nestjs-to-ash-elixir"
  - "20260314-ash-framework-declarative-resources"
  - "20260314-reservation-driven-task-generation"
  - "20260314-single-business-pms-not-saas"
source: "projects/stacker/stacker"
created_by: agent
---

# Amos organizes domains into dependency tiers from foundation to operations

The Amos domain architecture is organized into four dependency tiers. Lower tiers are foundational; higher tiers depend on those below them. This enforces a clear dependency direction and prevents circular imports between domains.

**Tier 0 — Identity foundations**: Identity (User, Token, Profile, UserRole) and Property. These are the bedrock — everything else depends on knowing who is acting and which property they are acting within.

**Tier 1 — Core entities**: Contacts, Villas, Catalog (items, taxes, fees, bundles, rates), Media, and Staff scheduling. These represent the "nouns" of the business — the things that exist independently of any transaction.

**Tier 2 — Transactional domains**: Reservations (Reservation, ReservationItem) and Spa (SpaRoom, SpaService, SpaSchedule). These create time-bound commitments against Tier 1 entities.

**Tier 3 — Operational and financial**: Payments (Folio, Transaction, PaymentSchedule, Commission), Tasks (TaskGroup, Checklist, Task, TaskMedia), and Comms (Channel, Message). These depend on transactions and entities from all lower tiers.

The tier model has a critical implication for the Tasks domain: Tasks sit at Tier 3, meaning they can reference Reservations (Tier 2), Villas (Tier 1), and Staff (Tier 1) without creating circular dependencies. This is exactly the dependency direction needed for reservation-driven task generation — when a checkout event in the Reservations domain triggers automatic housekeeping task creation in the Tasks domain.

The Tasks domain resources (TaskGroup, Checklist, Task, TaskMedia) map well to the industry research findings: TaskGroups can represent cleaning rounds or maintenance schedules, Checklists model digital SOPs, Tasks are individual work items, and TaskMedia handles the photo verification that is now industry standard.

**Architectural bet**: Tier-based dependency ordering only works if the tiers are right. If a Tier 1 entity ever needs to know about a Tier 3 concern (e.g., a Villa needing to know its maintenance history), the pattern breaks. Event-driven communication or read-only queries may be needed as escape hatches.
