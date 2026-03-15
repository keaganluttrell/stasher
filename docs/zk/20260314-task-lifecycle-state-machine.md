---
title: "Hospitality tasks need a state machine with inspection and maintenance-specific states"
description: "Task lifecycle design for hospitality must support created through verified plus maintenance holds and escalation"
date: 2026-03-14
group: zk
type: note
id: "20260314-task-lifecycle-state-machine"
links:
  - "20260314-ash-framework-declarative-resources"
  - "20260314-hotel-housekeeping-daily-cycle"
  - "20260314-preventive-maintenance-roi"
  - "20260314-digital-inspection-photo-verification"
  - "20260314-tiered-domain-architecture"
source: "research/HOUSEKEEPING_MAINTENANCE_TRENDS"
created_by: agent
---

# Hospitality tasks need a state machine with inspection and maintenance-specific states

The industry research reveals that hospitality tasks require a richer state machine than a simple to-do/done model. The research identifies a core lifecycle plus maintenance-specific extensions:

**Core housekeeping lifecycle**: created -> assigned -> in_progress -> completed -> verified (inspected)

The "verified" state is critical. Industry standard is a multi-tier inspection system: self-inspection by the attendant, supervisor spot-check (20-30% of all cleans, 100% of VIP rooms), management audits, and brand/corporate audits. The 98% inspection pass rate target means verification is not optional — it is how quality is measured.

**Maintenance work order extensions**: The core lifecycle needs additional states:
- **on_hold**: waiting for parts, waiting for guest to vacate, waiting for vendor
- **escalated**: beyond the assigned tech's skill or authority
- **cancelled**: no longer needed (guest checked out, duplicate request)

**Priority classification drives SLA tracking**:
- Emergency (safety, no water, no HVAC): < 15 minutes response
- Urgent (guest-impacting): < 1 hour response
- Standard (cosmetic, minor): < 24 hours
- Scheduled (preventive): per maintenance calendar

**Assignment models**: Tasks can be directly assigned to an individual or placed in a pool for claiming. Hotels tend toward direct assignment (supervisor assigns rooms); vacation rentals use both direct (assigned cleaner) and marketplace (first-available from pool).

**For Amos specifically**: The existing AshStateMachine extension is well-suited for this. State transitions can be declared in the Task resource definition rather than coded in service layers. The research validates the current Amos plan for Task + Checklist resources. The key design decision is whether housekeeping tasks and maintenance work orders share a single Task resource with type-specific state machines, or whether they become separate resources. A single generic task model with type classification is recommended as more future-proof — it avoids the proliferation of models when new task types emerge (spa tasks, grounds tasks, F&B tasks).
