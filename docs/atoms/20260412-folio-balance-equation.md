---
title: "Folio balance is a live calculation: charges + tax - payments + refunds"
description: "Balance is never stored — always derived from folio line and payment aggregates"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-folio-balance-equation"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

The folio balance is computed live as `total_charges + total_tax - total_payments + total_refunds`. It is never stored as a field — it is always derived from the current state of folio lines and payments. Voided lines are excluded from all aggregates, and pending pay links (those without a `stripe_payment_intent_id`) are excluded from `total_payments`.

This means the balance is always consistent with reality. The cancellation flow relies on this: after voiding original lines and adding a cancellation fee, the balance is algebraically proven to equal zero, allowing the folio to settle.
