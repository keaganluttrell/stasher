---
title: "FolioOpen gate pattern blocks all writes to settled folios"
description: "FolioOpen and PaymentFolioOpen validations enforce folio immutability after settlement"
date: 2026-04-12
group: zk
type: atom
id: "atoms/20260412-folio-open-gate-pattern"
links: ["notes/20260412-source-boltos-state-machines"]
source: "notes/20260412-source-boltos-state-machines"
created_by: agent
---

Two validation gates protect settled folios from modification. `FolioOpen` is checked on FolioLine `:create` and `:void` actions — it blocks new charges and voids with "cannot add lines to a settled folio." `PaymentFolioOpen` is checked on Payment `:create` and `:create_refund` — it blocks new payments and refunds.

These gates are the enforcement mechanism for folio terminal state. Rather than checking folio status in every operation, the gate pattern centralizes the check at the resource action level, making it impossible to accidentally write to a closed folio from any code path.
