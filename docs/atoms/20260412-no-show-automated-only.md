---
title: "No-show is automated only — staff cannot manually mark a reservation as no-show"
description: "AutoMarkNoShows cron is the sole trigger, enforcing consistent 100% forfeiture rules"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-no-show-automated-only"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

The no-show transition is only triggered by the `AutoMarkNoShows` cron job running daily at 6 AM. There is no manual "mark as no-show" button for staff. This ensures the 100% forfeiture rule is applied consistently — the system attempts to charge the card on file for the full amount, and commissions stand (the rep earned it, the guest forfeited).

This design prevents staff from accidentally or prematurely marking guests as no-shows, which would trigger irreversible financial consequences. The tradeoff is a slight delay — a guest who doesn't show up on Monday isn't marked until Tuesday at 6 AM.
