---
title: "Terminal states are truly terminal — no resurrection paths exist"
description: "Cancelled, checked_out, no_show, settled, completed, clawed_back are all one-way doors"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-terminal-states-no-resurrection"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

Every state machine in BoltOS has at least one terminal state, and none of them have transitions out. Cancelled reservations cannot be uncancelled — you make a new booking. Settled folios cannot be reopened — the `FolioOpen` gate blocks all writes. Clawed-back commissions stay clawed back.

This is a deliberate design choice that simplifies reasoning about the system. Once something reaches a terminal state, its data is frozen for audit and historical purposes. The tradeoff is that mistakes in terminal transitions are irreversible and require manual workarounds (e.g., creating a new reservation to replace a wrongly cancelled one).
