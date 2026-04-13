---
title: "Reservation is the orchestrator — its transitions cascade into every other domain"
description: "Reservation state changes drive Spa, Commission, Folio, and Villa block transitions"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-reservation-orchestrates-all-domains"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

Reservation is the central state machine in BoltOS. It does not merely track its own lifecycle — it actively drives transitions in every other domain. When a reservation confirms, pending spa bookings auto-confirm. When it cancels, spa bookings cancel, commissions get clawed back, the villa block archives, and the folio settles. When it checks out early, future spa bookings cancel.

No other domain initiates cross-domain cascades. Folio, Spa, and Commission are downstream consumers of reservation events. This makes reservation orchestration (`lib/boltos/pms.ex`) the most complex and highest-risk code path in the system.
