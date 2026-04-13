---
title: "Cancellation has two distinct paths — simple (pending) vs policy-driven (confirmed)"
description: "Pending cancellations void everything; confirmed cancellations run the policy engine for refunds and fees"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-cancellation-two-paths"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

Cancellation from pending is simple: void all folio lines, archive the villa block, claw back all commissions, cancel spa bookings, expire pay links, settle the folio. No policy, no fees, no refunds (nothing was charged).

Cancellation from confirmed triggers the cancellation policy engine. The frozen snapshot determines the tier (grace at 0%, tier1 at 50%, final at 100%, nonrefundable at 100%). Stripe refunds are issued if applicable, a cancellation fee line is added with Exempt tax code, original lines are voided, and commissions are adjusted per tier. The balance is algebraically proven to reach zero, so the folio always settles cleanly.
