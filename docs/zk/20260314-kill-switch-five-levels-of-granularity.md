---
title: "Kill switches operate at five granularity levels with asymmetric activation and restoration"
description: "Global, per-capability, per-property, per-channel, and per-user kill switches take effect in 30 seconds; rollback requires no approval"
date: 2026-03-14
group: zk
type: note
id: "20260314-kill-switch-five-levels-of-granularity"
links:
  - "20260314-shadow-mode-before-any-capability-goes-live"
  - "20260314-async-processing-oban-not-inline"
  - "20260314-fallback-chain-llm-reliability"
  - "20260314-asymmetric-risk-false-low-worse-than-false-high"
source: "projects/autoproxy/GOVERNANCE"
created_by: agent
---

AutoProxy's kill switch system operates at five levels of granularity, each with specific authorization for activation and restoration.

| Granularity | Who triggers | Restoration requires |
|---|---|---|
| Global | CTO, VP Engineering | CTO approval |
| Per-Capability | Engineering lead, Product lead | Engineering lead + incident review |
| Per-Property | Property GM, Regional Manager, Engineering | GM + Engineering confirmation |
| Per-Channel | Channel owner, Property GM | Channel owner |
| Per-User | The user themselves (for suggestions/batching), GM (for routing) | Self-service or GM |

Two critical design properties:

**Speed:** All kill switches take effect within 30 seconds. No cached state survives a flip. This means AutoProxy processes check the current config on every operation, not a cached version.

**Asymmetric authority:** Rollback (turning something off) does not require approval. Anyone in the approval chain can trigger it unilaterally. Re-enabling requires the full approval chain. This is deliberate: in a crisis, you want any authorized person to be able to stop the system immediately, without waiting for committee approval. Restarting can wait for proper review.

The five levels enable proportional response. If auto-response is producing incorrect answers at one property, the GM disables auto-response for that property without affecting classification, routing, or other properties. If a specific channel has a sensitive conversation, the channel owner excludes it. If a user does not want suggestions, they turn them off.

The per-capability level is particularly important because AutoProxy's capabilities have very different risk profiles. Classification and routing are low risk. Auto-response is high risk. The ability to disable auto-response globally while keeping classification and routing running is essential during any auto-response incident.
