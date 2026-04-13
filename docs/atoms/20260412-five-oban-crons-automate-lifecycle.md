---
title: "Five Oban cron workers automate the entire reservation lifecycle"
description: "AutoExpire, AutoNoShow, AutoSettle, AutoApprove, AutoSpaNoShow run on fixed schedules"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-five-oban-crons-automate-lifecycle"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

Five Oban workers run on cron schedules to handle transitions that should not require human intervention:

- `AutoExpirePendingReservations` (every 15 min) — cancels pending bookings past their expiry window.
- `AutoMarkNoShows` (daily 6 AM) — marks confirmed reservations as no-show when checkout date has passed.
- `AutoSettleFolios` (hourly) — settles folios 48 hours after checkout if balance is zero.
- `AutoApproveCommissions` (every 15 min) — promotes pending commissions after grace period.
- `AutoMarkSpaNoShows` (daily 8 PM) — marks confirmed spa bookings as no-show when the date has passed.

All five use `system@boltos.local` as the actor and `"automation"` as the source, making them distinguishable from human-initiated transitions in the audit trail.
