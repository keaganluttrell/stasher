---
title: "Cancellation policy is snapshot-frozen at confirmation time"
description: "Policy terms are immutable once a reservation confirms — protects against retroactive policy changes"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-cancellation-policy-snapshot-frozen-at-confirm"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

When a reservation transitions from pending to confirmed, the cancellation policy is snapshotted onto the reservation record and becomes immutable. This means the guest's refund terms are locked at the moment they pay, regardless of any future policy changes the property makes.

The snapshot drives the entire cancellation flow: it determines the tier (grace, tier1, final, nonrefundable), the refund percentage, the fee amount, and how commissions are adjusted. Pending reservations have no snapshot — they use simple forfeiture (void everything, no fees).
