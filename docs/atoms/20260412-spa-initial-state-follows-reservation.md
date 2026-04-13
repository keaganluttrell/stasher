---
title: "Spa booking initial state depends on reservation status"
description: "Spa starts pending if reservation is pending, auto-confirms if reservation is already confirmed or checked in"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-spa-initial-state-follows-reservation"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

Spa bookings don't always start in pending state. The `AutoConfirmOnCreate` change determines the initial state based on the parent reservation: if the reservation is still pending, the spa booking starts pending and will auto-confirm when the reservation confirms. If the reservation is already confirmed or checked in (on-property booking), the spa booking skips pending entirely and starts confirmed.

This means guests who are already on property get immediate slot confirmation without waiting for a cascade that will never come.
