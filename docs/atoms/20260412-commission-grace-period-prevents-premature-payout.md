---
title: "Commission grace period prevents paying reps for bookings that get cancelled immediately"
description: "Commissions stay pending until the cancellation grace window passes, then auto-approve via cron"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-commission-grace-period-prevents-premature-payout"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

Commissions are created in a pending state when payment is collected, not when the reservation confirms. They remain pending until the cancellation grace period elapses — typically 48 hours. Only then does `AutoApproveCommissions` (running every 15 minutes) promote them to approved status, where they count toward the rep's earned balance.

If the reservation is cancelled during grace, the commission is fully clawed back with zero payout. This protects the business from paying commissions on bookings that were never real. After grace, cancellation still triggers clawback but may recreate a commission at the retained fraction if a partial refund was issued.
