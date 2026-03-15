---
title: Hotel and vacation rental staffing models are fundamentally different
description: >-
  Hotels use hierarchical employee teams with room-based ratios; VRs use
  per-property contractors from marketplaces
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-hotel-vs-vr-staffing-divergence
links:
  - 20260314-hotel-housekeeping-daily-cycle
  - 20260314-vacation-rental-turnover-window
  - 20260314-cross-segment-flexibility-market-gap
  - 20260314-hospitality-labor-shortage-crisis
source: research/HOUSEKEEPING_MAINTENANCE_TRENDS
created_by: agent
---

# Hotel and vacation rental staffing models are fundamentally different

The staffing structures for hotel housekeeping and vacation rental cleaning have almost nothing in common despite performing similar work. This divergence has deep implications for task management software design.

**Hotel staffing**: Hierarchical, employee-based, room-ratio-driven.
- Executive Housekeeper -> Assistant Housekeeper -> Floor Supervisors (1 per 15-20 attendants) -> Room Attendants + Public Area Attendants + Laundry Staff
- Room-to-housekeeper ratios: 16-18 (budget), 14-16 (mid-range), 12-14 (full-service), 8-12 (luxury)
- Cleaning time per room: 20-25 min checkout budget, up to 35-45 min checkout luxury
- Maintenance: 1 tech per 50-75 rooms (budget), 1 per 30-50 (full-service), organized by specialty
- Staff are employees on fixed shifts

**Vacation rental staffing**: Flat, contractor-based, property-driven, scaling varies wildly.
- Solo operators (1-5 properties): owner cleans or one trusted cleaner
- Small PMCs (5-20): 2-5 part-time cleaners
- Medium PMCs (20-50): in-house leads + contracted cleaners
- Large PMCs (50+): ops manager, team leads, contract companies, marketplace backup
- Cleaners are typically paid per clean (not hourly) and many are independent contractors
- Team size is per-property: 1 cleaner for a studio, 2-3 for a 4+ BR luxury property
- Marketplace platforms (Turno: 25,000+ cleaners) enable dynamic sourcing

**Implications for Amos's staff/assignment model**:
- Must support both employee assignment (hotel: supervisor assigns rooms to attendants) and contractor assignment (VR: property manager assigns properties to cleaners)
- Must handle both room-level assignment (hotel: blocks of 14-18 rooms per attendant) and property-level assignment (VR: one property per cleaner team)
- Must support both shift-based scheduling (hotel) and event-driven scheduling (VR: triggered by reservation calendar)
- The existing Staff domain (StaffSchedule) may need extension to handle contractor relationships

This divergence is a major reason why most operations platforms serve only one segment. Building for both requires the assignment and scheduling models to be flexible enough to accommodate fundamentally different workforce structures.
