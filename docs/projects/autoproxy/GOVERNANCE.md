---
title: 'AutoProxy: Automation Governance Framework'
description: >-
  Risk framework, kill switches, confidence thresholds, audit trail, compliance
  requirements, and phased rollout governance for AutoProxy.
date: 2025-03-14T00:00:00.000Z
group: projects/autoproxy
type: doc
id: projects/autoproxy/GOVERNANCE
---

# AutoProxy: Automation Governance Framework

**Version:** 1.0
**Date:** 2026-03-13
**Status:** Draft

---

## 1. Capability Value Assessment

### Ship Order and Verdicts

| # | Capability | Value-to-Risk | Verdict |
|---|-----------|---------------|---------|
| 1 | Message Classification | HIGH | **APPROVE** — shadow mode validation first |
| 2 | Staff Routing | HIGH | **APPROVE** — HR/legal/financial/executive channels permanently excluded |
| 3 | Focus Mode / Batching | HIGH | **APPROVE** — lowest risk, ship first |
| 4 | Response Suggestions | MEDIUM | **APPROVE** — human always clicks send |
| 5 | Auto-Response | LOW | **APPROVE AS PILOT** — allowlisted categories only, structured data answers only, 0.95 confidence floor |
| 6 | Cross-Property Intelligence | LOW | **DEFER** — data boundary architecture not proven |
| 7 | Report Triage | LOW | **PARTIAL AUTOMATION ONLY** — classification automated, human reviews all triage decisions |
| 8 | Executive Digests | LOW | **PARTIAL AUTOMATION ONLY** — AI drafts, human approves before distribution |
| 9 | Smart Broadcast | MEDIUM | **APPROVE** — rule-based filtering, no LLM judgment on content |
| 10 | Escalation Chains | MEDIUM | **APPROVE AS PILOT** — 2-3 properties, fail-safe: always escalate when uncertain |

### Governance Landmines

**Auto-Response (5)** is the highest-liability capability. A wrong auto-response about pool chemical safety, fire exits, allergens, or checkout billing is a lawsuit. Must never ship without:
- Hard-coded category exclusions (safety, health, legal, financial, HR)
- Per-property opt-in with GM sign-off
- Conservative confidence floor (0.95+)

**Cross-Property Intelligence (6)** is the hardest governance problem. A regional manager context that leaks Property A's HR investigation into Property B's operational dashboard is a termination-level incident. Data boundary architecture must be proven before this ships.

**Executive Digests (8)** aggregate the most sensitive data into a single artifact. A digest that includes a draft layoff plan, a pending lawsuit settlement, and a revenue shortfall — summarized by an LLM and sent to the wrong distribution list — is catastrophic.

---

## 2. Risk Framework

### Misclassification Risk Matrix

| Actual Urgency | Classified As | Consequence | Severity |
|----------------|---------------|-------------|----------|
| **Critical** | Low | Delayed emergency response. Guest injury report sits in batch queue. | **CATASTROPHIC** |
| **Critical** | Medium | Response delayed 15-60 min. Serious but recoverable. | **HIGH** |
| **High** | Low | Guest complaint festers. VIP request missed. | **HIGH** |
| **High** | Critical | Over-escalation. Alarm fatigue. | **MEDIUM** |
| **Low** | Critical | Nuisance. Supply order treated as emergency. | **LOW** |

**Asymmetry principle**: False-low is always worse than false-high. System biased toward over-escalation. 5% false-critical rate acceptable; 1% false-low-on-actual-critical is not.

**Hard override**: Any message containing safety keywords (fire, injury, flood, medical, police, evacuation, threat, leak, gas, allergic) is force-classified as critical regardless of LLM output. Deterministic, not a suggestion.

### Misrouting Risk

| Scenario | Severity | Rule |
|----------|----------|------|
| Guest complaint to kitchen instead of front desk | Low | Same property, similar trust level |
| HR issue to non-management staff | **HIGH** | HR messages never auto-routed |
| Financial report to operational staff | **HIGH** | Financial channels explicit-recipient only |
| Executive communication to wrong executive | **CRITICAL** | Executive channels exempt from AutoProxy routing |

**Hard rule**: AutoProxy never routes messages in channels tagged `hr`, `legal`, `executive`, or `financial`. These use explicit recipient lists only.

### Auto-Response Allowlist (Only These Categories)

Auto-response permitted **only** when the answer is sourced from a **structured, versioned data field** — not LLM generation. The LLM classifies the question; the answer comes from a lookup.

- Property amenity hours (structured data field)
- Property directions and locations (structured data field)
- Standard checkout/checkin times (structured data field)
- Wi-Fi instructions (structured data field)

**Never auto-respond to**: safety, health, financial, legal, HR, guest complaints, anything emotional or requiring judgment.

### Cross-Property Data Leakage

Each property's data must be in a separate LLM context. Cross-property aggregation uses only pre-computed, anonymized metrics — never raw message content.

### Feedback Loop Manipulation

- Feedback weighted by role (GM correction = 5x line staff)
- No single user's feedback can flip a classification category (minimum 3 independent corrections)
- More than 10 corrections per day from one user triggers review
- Patterns of systematic "incorrect" marking on correctly classified messages trigger governance review

---

## 3. Control Framework

### Kill Switches

| Granularity | Who Can Trigger | Restoration |
|-------------|-----------------|-------------|
| **Global** | CTO, VP Engineering | CTO approval |
| **Per-Capability** | Engineering lead, Product lead | Engineering lead + incident review |
| **Per-Property** | Property GM, Regional Manager, Engineering | GM + Engineering confirmation |
| **Per-Channel** | Channel owner, Property GM | Channel owner |
| **Per-User** | The user themselves (suggestions/batching), GM (routing) | Self-service or GM |

Kill switches take effect within 30 seconds. No cached state survives a flip.

### Confidence Thresholds

| Capability | Minimum Confidence | Fallback Below Threshold |
|-----------|-------------------|--------------------------|
| Classification (intent) | 0.70 | Route to channel default handler |
| Classification (urgency) | 0.80 | Classify one level higher than output |
| Staff Routing | 0.75 | Present top-2 candidates to sender |
| Response Suggestion | 0.60 | No suggestion shown |
| Auto-Response | **0.95** | Convert to suggestion for human review |
| Report Triage | 0.80 | Flag as "unclassified" for manual review |
| Escalation Decision | 0.85 | Escalate (fail-safe) |

**Adjustment**: Monthly precision/recall review. If precision drops below 90%, threshold increases by 0.05 automatically. If precision above 97% for 3 months, may reduce by 0.02 with explicit approval.

**Calibration gate**: Before any capability goes live, 500 messages through shadow mode. If model outputs confidence > 0.95 on more than 60% of messages, scores are poorly calibrated and capability must not ship.

### Audit Trail

Every AutoProxy action logs: event_id, timestamp, workflow_version, property_id, channel_id, message_id, capability, action_taken, confidence_score, threshold_applied, model_id, token counts, categories considered/selected, urgency, routed_to_user_id, auto_response_sent, fallback_triggered, processing_time_ms.

**What must NOT be logged**: Full message body. Log message_id as FK only.

**Retention**: Audit trail 24-36 months. LLM interaction logs 12 months then anonymized. Confidence calibration data indefinite. Kill switch logs indefinite.

### Human-in-the-Loop Gates (Always Require Human Approval)

1. Any auto-response about safety, health, legal, financial, or HR
2. Any routing for `hr`, `legal`, `executive`, `financial` channels
3. Any cross-property data aggregation with raw message content
4. Any executive digest before distribution
5. Any circular escalation (already escalated once and returned)
6. Any message from/to guest-facing channels
7. Any first auto-response to a new staff member
8. Any urgency downgrade from critical/high to low

### Data Boundaries (Never Enter LLM Pipeline)

- Payment card data (PCI-DSS)
- Authentication credentials
- Government IDs
- Medical information
- Full financial statements
- Legal correspondence
- Salary and compensation data

Pre-LLM regex filter detects these patterns. If triggered, message goes to manual handling.

### Rate Limits

| Capability | Limit | Trigger Action |
|-----------|-------|----------------|
| Auto-Response | 20/property/hour | Disable for property, alert GM |
| Auto-Response | 100/property/day | Disable until manual review |
| User corrections | 10/user/day | Flag user, stop accepting corrections |
| Escalations per property | 15/hour | Alert regional — possible crisis or malfunction |

---

## 4. Monitoring and Alerting

### Degradation Signals

| Metric | Healthy | Warning | Critical | Auto-Action |
|--------|---------|---------|----------|-------------|
| Classification accuracy | > 92% | 88-92% | < 88% | Increase thresholds by 0.05 |
| Auto-response accuracy | > 97% | 94-97% | < 94% | **Disable auto-response globally** |
| Escalation rate | 5-15% | 15-25% | > 25% | Alert engineering + disable routing for worst property |
| Mean first human response | < 10 min | 10-20 min | > 20 min | Alert property GM |
| LLM latency (p95) | < 3 sec | 3-8 sec | > 8 sec | Switch to fallback model |
| LLM error rate | < 0.5% | 0.5-2% | > 2% | Circuit breaker — queue for manual handling |
| User override rate | < 15% | 15-25% | > 25% | Flag capability for threshold review |

### Silent Failure Detection

1. **Weekly sampling audit**: 50 random messages per property, human checks classification accuracy
2. **Response time anomaly**: Recipient takes > 3x their median → possible misroute
3. **Re-routing detection**: Recipient forwards within 5 min → misrouting signal
4. **Dead letter detection**: No response within 2 hours during business hours
5. **Sender follow-up**: Same topic within 30 min → first routing may have failed

---

## 5. Compliance and Privacy

### Consent

All staff receive plain-language notice before AutoProxy is enabled. Explains: what it does, what data it processes, how to give feedback, how to opt out.

**Opt-out scope**: Staff can opt out of suggestions and auto-response (non-essential). Cannot opt out of classification and routing (operational necessity).

### Right to Explanation

Every AutoProxy-touched message includes visible metadata:
- "Classified as: Maintenance Request (High Urgency)"
- "Routed to you because: You are the on-shift maintenance lead"
- "Auto-response sent. Source: Property Knowledge Base > Checkout Policy (updated 2026-02-15)"
- "This message was batched during Focus Mode. Original send time: 14:32"

### Cross-Border Data

EU properties require DPA with SCCs before AutoProxy is enabled. Options: Azure OpenAI EU West, Anthropic EU endpoints, or exclude EU properties from cross-property intelligence entirely.

---

## 6. Rollout Governance

### Per-Property Phased Rollout

| Phase | Duration | Scope | Exit Criteria |
|-------|----------|-------|---------------|
| Shadow Mode | 2 weeks min | Log only, no action | Accuracy > 92%, urgency > 90%, no data boundary violations |
| Classification + Focus | 2 weeks min | Badges shown, batching opt-in | Override rate < 20%, no critical-as-low misclassifications |
| Routing + Suggestions | 4 weeks min | Routing with confirmation first week, then auto. Suggestions shown. | Routing accuracy > 90%, suggestion acceptance > 40% |
| Escalation Chains | 4 weeks min | Escalation logged and reviewed weekly | Resolution > 70% at first level, no missed critical escalations |
| Auto-Response Pilot | 4 weeks min | Allowlisted categories, 10/day cap | Accuracy > 97%, no safety/health/legal auto-responses, positive trust survey |

### Rollback

**Rollback does not require approval.** Any person in the approval chain can trigger unilaterally. Re-enabling requires full approval chain.

### Approval Chain

| Action | Approvers |
|--------|-----------|
| Enable at new property | Property GM + Regional Manager + Engineering Lead |
| Enable new capability | Property GM + Product Lead |
| Enable auto-response | Property GM + Regional Manager + Product Lead + Legal |
| Enable cross-property features | VP Operations + CTO + Legal |
| Enable at EU property | All of the above + DPO + Legal |

---

## 7. Ongoing Governance

### Ownership

| Role | Responsibility |
|------|---------------|
| AutoProxy Product Owner | Feature roadmap, threshold proposals, rollout scheduling |
| AutoProxy Engineering Lead | Architecture, monitoring, incidents, model selection |
| Governance Committee (monthly) | Threshold reviews, post-mortems, compliance. Members: Product, Engineering, VP Ops, Legal, rotating GM |
| Property GM | Local kill switch, feedback review, staff communication |
| DPO / Legal | Consent, privacy, cross-border, regulatory changes |

### Re-Audit Triggers

Mandatory unscheduled governance review when:
1. New property type onboarded
2. New country/jurisdiction
3. LLM model change (requires 1-week shadow re-validation)
4. Security incident or data boundary violation
5. Accuracy below warning for 7 consecutive days
6. Regulatory change in any operating jurisdiction
7. Property count doubles or volume increases 50%+ in a quarter
8. Engineering patches AutoProxy > 3 times in a month without root cause fix
