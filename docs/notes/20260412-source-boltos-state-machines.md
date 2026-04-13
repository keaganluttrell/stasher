---
title: "BoltOS State Machines"
description: "Complete state machine reference for Reservation, Folio, Spa Booking, and Commission domains including cross-domain cascades and Oban automation"
date: 2026-04-12
group: zk
type: source
id: "notes/20260412-source-boltos-state-machines"
links: ["atoms/20260412-reservation-orchestrates-all-domains", "atoms/20260412-terminal-states-no-resurrection", "atoms/20260412-cancellation-policy-snapshot-frozen-at-confirm", "atoms/20260412-commission-grace-period-prevents-premature-payout", "atoms/20260412-folio-balance-equation", "atoms/20260412-five-oban-crons-automate-lifecycle", "atoms/20260412-no-show-automated-only", "atoms/20260412-spa-initial-state-follows-reservation", "atoms/20260412-folio-open-gate-pattern", "atoms/20260412-cancellation-two-paths", "atoms/20260412-reschedule-30-day-cutoff-20-pct-fee"]
source: ""
created_by: human
---

## Key Takeaways

- Four state machines govern BoltOS PMS: Reservation (6 states), Folio (2), Spa Booking (6), Commission (4)
- Reservation is the orchestrator — its transitions cascade into Spa, Commission, and Folio
- All terminal states are truly terminal; no resurrection paths
- Five Oban cron workers automate expiry, no-shows, folio settlement, commission approval, and spa no-shows
- Cancellation policy is snapshot-frozen at confirmation time and drives refund/fee math
- Commission grace period prevents paying reps for bookings that get cancelled immediately

---

# State Machines

## Table of Contents

1. [Reservation](#1-reservation) — 6 states
   - [Pending](#pending)
   - [Confirmed](#confirmed)
   - [Checked In](#checked_in)
   - [Checked Out](#checked_out)
   - [Cancelled](#cancelled)
   - [No Show](#no_show)
2. [Folio](#2-folio) — 2 states
   - [Open](#open)
   - [Settled](#settled)
3. [Spa Booking](#3-spa-booking) — 6 states
   - [Pending (Spa)](#pending-spa)
   - [Confirmed (Spa)](#confirmed-spa)
   - [In Progress](#in_progress)
   - [Completed](#completed)
   - [Cancelled (Spa)](#cancelled-spa)
   - [No Show (Spa)](#no_show-spa)
4. [Commission](#4-commission) — 4 states
   - [Pending (Commission)](#pending-commission)
   - [Approved](#approved)
   - [Paid](#paid)
   - [Clawed Back](#clawed_back)
5. [Cross-Domain Cascades](#5-cross-domain-cascades)
6. [Oban Automation Schedule](#6-oban-automation-schedule)

---

## 1. Reservation

**Resource:** `lib/boltos/pms/reservation.ex`
**Orchestration:** `lib/boltos/pms.ex`
**Initial state:** `:pending`

```
                              +─────────+
                              │ PENDING │
                              +──┬───┬──+
                   :confirm      │   │      :cancel
                   (payment      │   │      (no policy, void all,
                    webhook)     │   │       clawback commissions,
                                 │   │       archive block,
                                 │   │       cancel spa, settle)
                       +---------+   +----------+
                       v                         v
                 +───────────+            ╔════════════╗
                 │ CONFIRMED │──────────> ║ CANCELLED  ║
                 +──┬─────┬──+ :cancel   ║  terminal  ║
                    │     │    (policy    ╚════════════╝
                    │     │     engine,
                    │     │     refund,
                    │     │     fee line,
                    │     │     commission
                    │     │     adjust)
                    │     │
        :check_in   │     │  :no_show
        (balance=0  │     │  (cron, check_out
         or charge, │     │   < today, 100%
         date >=    │     │   forfeit, charge
         check_in)  │     │   card on file)
                    │     │
              +─────+     +───────+
              v                   v
        +────────────+     ╔══════════╗
        │ CHECKED_IN │     ║ NO_SHOW  ║
        +─────┬──────+     ║ terminal ║
              │            ╚══════════╝
              │ :check_out
              │ (balance=0, or charge,
              │  or manager force,
              │  cancels future spa)
              v
        ╔═════════════╗
        ║ CHECKED_OUT ║
        ║  terminal   ║
        ╚═════════════╝
         (folio stays open,
          AutoSettle at 48h)
```

---

### Pending

**Entry conditions**

- Default initial state on `:create` action.
- No payment required to enter.
- `pending_expires_at` calculated at creation (e.g. 48h for deposit-only bookings).
- Villa block created and reserved.
- Folio created (may have zero charges).

**Invariants**

- Villa block exists (holds the dates).
- Folio is `:open`.
- No cancellation policy snapshot (pending uses simple forfeiture).
- State timestamps `confirmed_at`, `checked_in_at`, etc. are all nil.

**Allowed operations**

- `:update` — modify check_in, check_out, arrival_time, departure_time, guest_count, notes, contact, villa, sales_rep.
- Add folio lines (accommodation, experiences, items).
- Collect payment (send pay link or charge card on file).

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| confirmed | `:confirm` | Payment received (webhook or direct charge) | Snapshot cancellation policy, set `confirmed_at`, bulk-confirm pending spa bookings |
| cancelled | `:cancel` | Always allowed | Void all folio lines, archive villa block, cancel pending/confirmed spa bookings, clawback all commissions, expire pay links, settle folio |

**Events emitted**

- On confirm: `SendConfirmationEmail` (Oban), `Stripe.authorize` + `Stripe.capture` (or `CapturePayment` Oban fallback)
- On cancel: `Stripe.expire_checkout_session` (if pay links exist)

**Automation**

- `AutoExpirePendingReservations` — cron `*/15 * * * *`. Cancels reservations where `pending_expires_at <= now`. Calls `do_cancel_reservation/2` with system actor, source `"automation"`.

**Timestamps set on entry**

- `created_at` (standard)
- `pending_expires_at` (calculated)

---

### Confirmed

**Entry conditions**

- `:confirm` action from `:pending`.
- Triggered by successful payment (Stripe webhook or direct charge).
- Cancellation policy snapshot frozen onto reservation at transition.

**Invariants**

- Villa block exists (not archived).
- Folio is `:open` with charges and payment records.
- Cancellation policy snapshot present and immutable.
- Balance >= 0 (may have pending/partial charges).

**Allowed operations**

- `:update` — modify dates, guest_count, notes (does NOT rebuild pricing or folio lines).
- `:reschedule` — change check_in/check_out with fee calculation and villa reallocation. Cutoff: 30 days before check-in. Fee: 20% of original accommodation total (waived if moving sooner). Side effects: void old accommodation lines, rebuild for new dates, swap villa block, cancel out-of-range spa, add fee line.
- Add folio lines (on-property charges post-confirmation).
- Collect payment (card on file, new card, pay link).

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| checked_in | `:check_in` | `Date.utc_today() >= check_in` AND (balance = 0 OR payment provided) | Set `checked_in_at`, charge card if balance > 0 |
| cancelled | `:cancel` | Always allowed | Cancellation policy engine determines tier (grace/tier1/final/nonrefundable), issue Stripe refunds if applicable, add cancellation fee line (Exempt tax code), void original lines, archive villa block, cancel spa, adjust commissions, settle folio |
| no_show | `:no_show` | Automated: `check_out < today` | Expire pay links, attempt card-on-file charge (100% forfeiture), set `no_show_at`, settle folio if balance = 0 |

**Cancellation tiers**

| Tier | Condition | Charge | Refund |
|---|---|---|---|
| grace | Within 48h of booking AND booking not made within 7d of check-in | 0% | 100% |
| tier1 | 45+ days before check-in | 50% | Remainder |
| final | < 45 days before check-in | 100% | 0% |
| nonrefundable | Booking made within 7d of check-in | 100% | 0% |

**Events emitted**

- On check-in: `Stripe.charge` (if balance > 0 and card on file)
- On cancel: `Stripe.refund` (if refund_cents > 0, working backward from most recent payment), `Stripe.expire_checkout_session` (pay links)
- On cancel — commission cascades: grace = full clawback, non-grace with refund = clawback + recreate at retained fraction, no refund = commissions stand

**Automation**

- `AutoMarkNoShows` — cron `0 6 * * *` (daily 6 AM). Marks confirmed reservations as no-show when `check_out < Date.utc_today()`. Calls `do_no_show_reservation/2` with system actor, source `"automation"`.

**Timestamps set on entry**

- `confirmed_at`

---

### Checked In

**Entry conditions**

- `:check_in` action from `:confirmed`.
- `CheckInDateReached` validation: `Date.utc_today() >= check_in`.
- `FolioBalancePaid` validation: folio balance <= 0 (bypassed if payment provided via orchestration).
- Roles: admin, manager, host (sales_rep cannot check in).

**Invariants**

- Folio is `:open` (remains open for on-property charges).
- Villa block exists (not archived during stay).
- Guest is on property.

**Allowed operations**

- `:update` — can update check_out, guest_count, notes (folio lines not recalculated).
- Add folio lines (bar, meals, spa, damages, late checkout, etc.) — gated by `FolioOpen`.
- Void folio lines (manager only).
- Collect payment (card on file, new card, pay link).
- Create new spa bookings for dates within stay range.
- `:extend_stay` — add consecutive nights to same villa. Validates availability. Destroys/recreates villa block, builds accommodation lines for new nights only.

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| checked_out | `:check_out` | Balance = 0, OR payment provided, OR `force: true` (manager only) | Set `checked_out_at`. Early checkout (today < check_out) cancels future pending/confirmed spa bookings |

**Events emitted**

- On check-out: `Stripe.charge` (if balance > 0 and payment provided)
- On check-out (early): cascade cancel future spa bookings

**Automation**

- None specific to checked-in state.

**Timestamps set on entry**

- `checked_in_at`

---

### Checked Out

**Entry conditions**

- `:check_out` action from `:checked_in`.
- Balance handling: prefers balance = 0. Can charge card, or manager can force-override with `force: true`.
- Roles: admin, manager, host.

**Invariants**

- Folio remains `:open` (post-stay charges: damages, minibar reconciliation).
- Villa block preserved (historical record, dates now past).
- Terminal for reservation — no state transitions out.
- Balance may be > 0 (collections scenario).

**Allowed operations**

- Add folio lines (post-stay charges discovered after guest departure) — gated by `FolioOpen`.
- Void folio lines (manager only).
- Collect payment for outstanding balance.
- Settle folio manually (manager, once balance = 0).

**Transitions out**

None (terminal). Folio transitions independently via `AutoSettleFolios`.

**Events emitted**

- None on entry. Post-stay events are manual (payments, folio settlement).

**Automation**

- `AutoSettleFolios` — cron `0 * * * *` (hourly). Settles folios where `reservation.status == :checked_out AND (now - checked_out_at) >= 48h AND balance == 0`.

**Timestamps set on entry**

- `checked_out_at`

---

### Cancelled

**Entry conditions**

- `:cancel` action from `:pending` or `:confirmed`.
- Always allowed (no date checks).
- Roles: admin, manager, host, sales_rep.

**Two paths:**

- **Pending -> Cancelled (simple):** No cancellation policy. All folio lines voided. Villa block archived. All commissions clawed back. Spa bookings cancelled. Pay links expired. Folio settled.
- **Confirmed -> Cancelled (policy-driven):** Cancellation policy applied (grace/tier1/final/nonrefundable). Stripe refunds issued if applicable. Cancellation fee line added (Exempt tax code). Original lines voided (except fee). Commission handling per tier. Villa block archived. Spa cancelled. Pay links expired. Folio settled. Balance always = 0 after (proven algebraically).

**Invariants**

- Terminal state — no transitions out.
- Folio is `:settled`.
- Villa block archived (freed for rebooking).
- All original folio lines voided (except cancellation fee on confirmed cancel).
- Pay links expired.

**Allowed operations**

- Read only. View reservation details, folio history, audit trail, refund records.

**Transitions out**

None (terminal).

**Events emitted**

- On entry from confirmed: `Stripe.refund` (if refund_cents > 0), `Stripe.expire_checkout_session` (pay links)
- On entry from pending: `Stripe.expire_checkout_session` (if pay links exist)
- Webhook defense: if pay link payment webhook arrives after cancellation, auto-refund via Stripe

**Automation**

- None targeting cancelled reservations directly.
- `AutoExpirePendingReservations` can trigger the pending -> cancelled path.

**Timestamps set on entry**

- `cancelled_at`

---

### No Show

**Entry conditions**

- `:no_show` action from `:confirmed` only.
- Automated only — `AutoMarkNoShows` cron. No manual trigger by staff.
- 100% forfeiture rule — guest pays full amount.
- Roles: admin, manager, host (but only called by automation with system actor).

**Invariants**

- Terminal state — no transitions out.
- Villa block preserved (historical, dates past).
- Commissions stand (no clawback — rep earned it, guest forfeited).
- Folio either `:settled` (charge succeeded) or `:open` with balance > 0 (charge failed, collections scenario).

**Allowed operations**

- Collect payment (if folio open with balance > 0).
- Settle folio manually (once balance = 0 after collections).
- Read only otherwise.

**Transitions out**

None (terminal).

**Events emitted**

- On entry: `Stripe.expire_checkout_session` (pay links), `Stripe.charge` card on file (best-effort, 100% forfeiture)
- If card missing or charge fails: logged warning, folio stays open

**Automation**

- `AutoMarkNoShows` — cron `0 6 * * *` (daily 6 AM). Finds `status == :confirmed AND check_out < Date.utc_today()`. Calls `do_no_show_reservation/2`. Actor: `system@boltos.local`, source: `"automation"`.

**Timestamps set on entry**

- `no_show_at`

---

## 2. Folio

**Resource:** `lib/boltos/pms/folio.ex`
**Initial state:** `:open`

```
                    +──────+
                    │ OPEN │
                    +──┬───+
                       │
                       │  :settle
                       │  (balance must = 0,
                       │   or forced by cancel)
                       │
                       │  Triggers:
                       │  * cancel — always settles
                       │  * no_show — settles if balance = 0
                       │  * AutoSettleFolios cron — 48h after checkout if balance = 0
                       │  * manual — manager settles
                       v
                 ╔═════════╗
                 ║ SETTLED ║
                 ║ terminal║
                 ╚═════════╝
                  (no new lines,
                   FolioOpen gate)
```

---

### Open

**Entry conditions**

- Default initial state. Created automatically during booking via `persist_bundle!` (1:1 with reservation).
- Created by manager, sales_rep, or host.

**Invariants**

- Reservation exists (`reservation_id` required).
- Balance is live-calculated: `total_charges + total_tax - total_payments + total_refunds`.
- Voided lines excluded from all aggregates.
- Pending pay links (no `stripe_payment_intent_id`) excluded from `total_payments`.

**Allowed operations**

- Add folio lines — gated by `FolioOpen` validation on FolioLine `:create`.
- Void folio lines — gated by `FolioOpen` on FolioLine `:void` (manager + host only).
- Collect payments — gated by `PaymentFolioOpen` on Payment `:create`.
- Create refunds — gated by `PaymentFolioOpen` on Payment `:create_refund`.
- Post charges on-property via `post_charge/4`.
- Link spa booking to folio line.

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| settled | `:settle` | Triggered by cancel (always), no-show (if balance = 0), AutoSettleFolios (48h + balance = 0), or manual (manager) | Set `settled_at` |

**Events emitted**

- `SendPayLinkEmail` (Oban) when pay link created
- `Stripe.create_checkout_session` for pay links
- `Stripe.charge` for card-on-file payments

**Automation**

- `AutoSettleFolios` — cron `0 * * * *` (hourly). Settles folios where reservation is `:checked_out`, 48h+ since checkout, balance = 0.

**Timestamps set on entry**

- `created_at`, `updated_at`

---

### Settled

**Entry conditions**

- `:settle` action from `:open`.
- Roles: admin, manager (manual settle).
- Also called programmatically by cancel/no-show orchestration.

**Invariants**

- Terminal state — no transitions out.
- `FolioOpen` validator blocks new folio lines with "cannot add lines to a settled folio".
- `PaymentFolioOpen` validator blocks new payments with "cannot create payments on a settled folio".
- No voiding, no refunds, no new charges.

**Allowed operations**

- Read only.

**Transitions out**

None (terminal).

**Events emitted**

- None.

**Automation**

- None.

**Timestamps set on entry**

- `settled_at`

---

## 3. Spa Booking

**Resource:** `lib/boltos/spa/spa_booking.ex`
**Initial states:** `:pending` or `:confirmed` (depends on reservation status via `AutoConfirmOnCreate`)

```
  Initial state depends on reservation:
    res = pending        -> spa starts PENDING
    res = confirmed/     -> spa starts CONFIRMED (AutoConfirmOnCreate)
          checked_in

            +─────────+
            │ PENDING │
            +────┬──┬─+
     :confirm    │  │     :cancel
     (auto on    │  │     (pure state change,
      res        │  │      PMS handles folio)
      confirm)   │  │
           +─────+  +─────────-+
           v                   v
     +───────────+      ╔════════════╗
     │ CONFIRMED │─────>║ CANCELLED  ║
     +──┬─────┬──+      ║  terminal  ║
        │     │ :cancel  ╚════════════╝
        │     │
:start  │     │  :no_show
(date = │     │  (scheduled date
 today) │     │   passed, no
        │     │   start recorded)
   +────+     +───────+
   v                  v
+─────────────+ ╔══════════╗
│ IN_PROGRESS │ ║ NO_SHOW  ║
+──────┬──────+ ║ terminal ║
       │        ╚══════════╝
       │ :complete
       │ (treatment
       │  finished)
       v
 ╔═══════════╗
 ║ COMPLETED ║
 ║  terminal ║
 ╚═══════════╝
```

---

### Pending (Spa)

**Entry conditions**

- Default initial state when reservation is `:pending`.
- `DateWithinStay` validation: booking date must be within `reservation.check_in..check_out`.
- `ReservationStatusGate` validation: reservation must be `:pending`, `:confirmed`, or `:checked_in`.
- Partial unique index on `(room_id, date, slot)` where status not in (cancelled, no_show) prevents double-booking.

**Invariants**

- Reservation exists and is `:pending`.
- Slot held (unique index active).
- Date within reservation stay dates.

**Allowed operations**

- Read only. Transitions driven by reservation state changes.

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| confirmed | `:confirm` | Reservation confirms (cascaded) | Set `confirmed_at` |
| cancelled | `:cancel` | Reservation cancels or expires (cascaded), or manual | Set `cancelled_at`, slot freed |

**Events emitted**

- None directly. Driven by reservation-level cascades.

**Automation**

- None. Transitions driven by reservation state changes.

**Timestamps set on entry**

- `created_at`, `updated_at`

---

### Confirmed (Spa)

**Entry conditions**

- From `:pending` via `:confirm` (cascaded when reservation confirms).
- Direct creation via `AutoConfirmOnCreate` when reservation is `:confirmed` or `:checked_in` (on-property booking skips pending).

**Invariants**

- Reservation is `:confirmed` or `:checked_in`.
- Slot held (unique index active).
- Date is today or in the future.

**Allowed operations**

- Start treatment (`:start` — manager, host).
- Cancel (`:cancel` — manager, host).
- Mark no-show (`:no_show` — manager, host).

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| in_progress | `:start` | `StartDateGuard`: `date == Date.utc_today()` | Set `started_at` |
| cancelled | `:cancel` | Always allowed | Set `cancelled_at`, slot freed |
| no_show | `:no_show` | Scheduled date passed | Set `no_show_at`, slot freed, folio line stands |

**Events emitted**

- None. Spa transitions are pure state changes — no Stripe calls, no Oban jobs.

**Automation**

- `AutoMarkSpaNoShows` — cron `0 20 * * *` (daily 8 PM). Marks confirmed spa bookings as no-show where `date < Date.utc_today()`. Actor: `system@boltos.local`, source: `"automation"`.

**Timestamps set on entry**

- `confirmed_at`

---

### In Progress

**Entry conditions**

- `:start` action from `:confirmed`.
- `StartDateGuard` validation: `date == Date.utc_today()` (treatment can only start on its scheduled date).
- Roles: admin, manager, host.

**Invariants**

- Treatment is actively happening.
- Reservation is `:checked_in` (guest is on property).

**Allowed operations**

- Complete treatment (`:complete` — manager, host).

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| completed | `:complete` | Always allowed | Set `completed_at` |

**Events emitted**

- None.

**Automation**

- None.

**Timestamps set on entry**

- `started_at`

---

### Completed

**Entry conditions**

- `:complete` action from `:in_progress`.
- Roles: admin, manager, host.

**Invariants**

- Terminal state. Folio line stands (treatment delivered).

**Allowed operations**

- Read only.

**Transitions out**

None (terminal).

**Events emitted**

- None.

**Automation**

- None.

**Timestamps set on entry**

- `completed_at`

---

### Cancelled (Spa)

**Entry conditions**

- `:cancel` action from `:pending` or `:confirmed`.
- Roles: admin, manager, host.
- Cascade: reservation cancellation calls `cancel_spa_bookings!` for all pending/confirmed spa bookings.
- Early checkout cancels future pending/confirmed spa bookings.

**Invariants**

- Terminal state. Slot freed (partial unique index excludes cancelled).
- Folio line handling is PMS's concern, not spa's. Standalone spa cancel (guest changes mind) does NOT void the folio line. Reservation cancel voids all lines including spa via `void_folio_lines!`.

**Allowed operations**

- Read only.

**Transitions out**

None (terminal).

**Events emitted**

- None directly. Parent reservation orchestration handles folio line voiding.

**Automation**

- None.

**Timestamps set on entry**

- `cancelled_at`

---

### No Show (Spa)

**Entry conditions**

- `:no_show` action from `:confirmed`.
- Guest didn't show for their appointment.
- Roles: admin, manager, host.

**Invariants**

- Terminal state. Slot freed. Folio line stands (guest charged for no-show).

**Allowed operations**

- Read only.

**Transitions out**

None (terminal).

**Events emitted**

- None.

**Automation**

- `AutoMarkSpaNoShows` — cron `0 20 * * *` (daily 8 PM). Marks confirmed bookings where `date < Date.utc_today()` (day has passed, not today's bookings).

**Timestamps set on entry**

- `no_show_at`

---

## 4. Commission

**Resource:** `lib/boltos/sales/commission.ex`
**Initial state:** `:pending`

Running balance = `sum(approved.earned_cents) - sum(paid.earned_cents) - sum(clawed_back.earned_cents)`. Pending excluded.

```
              +─────────+
              │ PENDING │
              +──┬────┬─+
   :approve      │    │      :claw_back
   (AutoApprove  │    │      (grace cancel =
    cron, */15m, │    │       full clawback)
    after grace  │    │
    period)      │    │
           +─────+    +──────────+
           v                     v
     +──────────+         ╔════════════╗
     │ APPROVED │────────>║ CLAWED_BACK║
     +────┬───┬─+         ║  terminal  ║
          │   │ :claw_back╚════════════╝
          │   │ (non-grace        ^
          │   │  cancel w/        │
          │   │  refund =         │
          │   │  adjust)          │
  :pay    │   │                   │
  (manual │   +───────────────────+
   bulk   │
   payroll│
   by mgr)│
          v
     ╔════════╗
     ║  PAID  ║──────────────────>╔════════════╗
     ║        ║    :claw_back     ║ CLAWED_BACK║
     ╚════════╝    (rare, post-   ╚════════════╝
                    pay recovery)
```

---

### Pending (Commission)

**Entry conditions**

- Created during `finalize_payment` when payment is collected on a reservation with commissionable sales rep (`commission_rate > 0`).
- Snapshot frozen at creation: `commission_rate`, `payment_cents`, `commissionable_cents`, `earned_cents`.
- Required relationships: `reservation_id`, `payment_id`, `sales_rep_id`.

**Invariants**

- Commission exists but is NOT earned yet — excluded from rep balance.
- `earned_cents > 0`.
- Reservation has received a payment.

**Allowed operations**

- Read only. No manual transitions from pending (automation handles approve).

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| approved | `:approve` | Grace period elapsed (`created_at + cancel_grace_hours < now`) | Set `approved_at` |
| clawed_back | `:claw_back` | Reservation cancelled during grace period | Set `clawed_back_at` |

**Events emitted**

- None.

**Automation**

- `AutoApproveCommissions` — cron `*/15 * * * *` (every 15 min). Approves pending commissions after grace period. Fallback: 48h if cancellation policy snapshot missing. Actor: `system@boltos.local`, source: `"automation"`.

**Timestamps set on entry**

- `created_at`, `updated_at`

---

### Approved

**Entry conditions**

- `:approve` action from `:pending`.
- Trigger: `AutoApproveCommissions` cron (every 15 min).
- Grace period has passed — reservation cannot be cancelled without cost.

**Invariants**

- Commission is earned — included in rep balance.
- Money not yet disbursed.

**Allowed operations**

- Pay (manual, bulk payroll cycle).
- Claw back (cancellation, error correction).

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| paid | `:pay` | Manual bulk payroll by manager | Set `paid_at` |
| clawed_back | `:claw_back` | Post-grace cancellation or correction | Set `clawed_back_at` |

**Events emitted**

- None.

**Automation**

- None.

**Timestamps set on entry**

- `approved_at`

---

### Paid

**Entry conditions**

- `:pay` action from `:approved`.
- Manual bulk payroll — manager selects approved commissions, marks as paid.
- Roles: admin, manager.

**Invariants**

- Money has been disbursed to the rep.
- Subtracted from balance.
- Terminal in practice (most commissions end here).

**Allowed operations**

- Claw back (rare — error correction, post-payment cancellation).

**Transitions out**

| Target | Action | Conditions | Side effects |
|---|---|---|---|
| clawed_back | `:claw_back` | Rare, post-payment error correction | Set `clawed_back_at` |

**Events emitted**

- None.

**Automation**

- None.

**Timestamps set on entry**

- `paid_at`

---

### Clawed Back

**Entry conditions**

- `:claw_back` action from `:pending`, `:approved`, or `:paid`.
- Triggers: reservation cancellation (automated side effect), manual correction (manager).

**Invariants**

- Terminal state.
- Subtracted from balance regardless of prior state.
- Reservation context tells the story (why clawed back -> look at reservation status).

**Allowed operations**

- Read only.

**Transitions out**

None (terminal).

**Events emitted**

- None.

**Automation**

- None. Triggered by reservation cancel orchestration or manual action.

**Timestamps set on entry**

- `clawed_back_at`

---

## 5. Cross-Domain Cascades

```
Reservation CONFIRM ──> Spa CONFIRM (pending spa bookings auto-confirm)

Reservation CANCEL  ──> Spa CANCEL (pending/confirmed bookings)
                    ──> Commission CLAW_BACK (grace) or ADJUST (non-grace w/ refund)
                    ──> Folio SETTLE (always, balance = 0 proven algebraically)
                    ──> Villa block archived

Reservation CHECK_OUT (early) ──> Spa CANCEL (future pending/confirmed bookings)

Reservation NO_SHOW ──> Folio SETTLE (if balance = 0 after card-on-file charge)
                    ──> Pay links expired

Folio SETTLE ──> FolioOpen gate blocks new FolioLine creation
             ──> PaymentFolioOpen gate blocks new Payments
```

---

## 6. Oban Automation Schedule

| Worker | Schedule | Frequency | Target | Query | Action |
|---|---|---|---|---|---|
| `AutoExpirePendingReservations` | `*/15 * * * *` | Every 15 min | Reservation | `status == :pending AND pending_expires_at <= now` | `do_cancel_reservation` |
| `AutoMarkNoShows` | `0 6 * * *` | Daily 6 AM | Reservation | `status == :confirmed AND check_out < today` | `do_no_show_reservation` |
| `AutoSettleFolios` | `0 * * * *` | Hourly | Folio | `status == :open AND balance == 0 AND res.status == :checked_out AND checked_out_at + 48h <= now` | `settle_folio!` |
| `AutoApproveCommissions` | `*/15 * * * *` | Every 15 min | Commission | `status == :pending AND created_at + grace_hours < now` | `approve_commission!` |
| `AutoMarkSpaNoShows` | `0 20 * * *` | Daily 8 PM | SpaBooking | `status == :confirmed AND date < today` | `no_show_spa_booking!` |

All automation workers use actor `system@boltos.local` and source `"automation"`.
