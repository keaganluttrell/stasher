---
title: "Reschedule has a 30-day cutoff and charges a 20% fee"
description: "Confirmed reservations can reschedule dates with fee calculation and villa reallocation"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-reschedule-30-day-cutoff-20-pct-fee"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

The `:reschedule` action on confirmed reservations allows changing check-in and check-out dates, but only if the request is made 30+ days before the original check-in. The fee is 20% of the original accommodation total, waived if the guest is moving to sooner dates.

Side effects include voiding old accommodation lines, rebuilding pricing for new dates, swapping the villa block, cancelling out-of-range spa bookings, and adding the fee line. This is one of the most complex single actions in the system because it touches pricing, availability, spa, and folio in a single transaction.
