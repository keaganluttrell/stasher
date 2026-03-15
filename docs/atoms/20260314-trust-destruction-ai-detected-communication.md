---
title: Professionals who detect AI-generated communication lose trust in the sender
description: >-
  August 2025 research shows AI is acceptable for routine messages but damages
  relationships for empathetic or personal communication
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-trust-destruction-ai-detected-communication
links:
  - 20260314-confidence-uncanny-valley
  - 20260314-auto-response-allowlist-structured-data-only
  - 20260314-shadow-mode-before-any-capability-goes-live
source: projects/autoproxy/MARKET_RESEARCH
created_by: agent
---

Research from August 2025 (ScienceDaily) found that professionals who detect AI-generated communication lose trust in the sender. The finding has a critical nuance: AI is acceptable for informational and routine messages but damages relationships when used for empathetic, motivational, or personal communication.

This has direct design implications for AutoProxy. The system must auto-respond only to factual, low-stakes queries -- checkout times, pool hours, wifi passwords. It must never auto-respond to messages involving judgment, emotion, or conflict. A guest complaint about noise, even if the policy response is well-known, requires a human touch because the recipient will evaluate whether the response shows genuine care.

The mitigation strategy requires multiple reinforcing layers: (1) conservative confidence thresholds so uncertain cases always go to humans, (2) transparent labeling so recipients know when AutoProxy assisted, (3) easy escalation so anyone can override the automation, and (4) hard-coded exclusions for sensitive categories regardless of confidence.

This research also validates the phased rollout approach. Starting with classification and routing (where AutoProxy never speaks to the user) builds trust through observable accuracy before auto-response is introduced. Staff experience months of "AutoProxy correctly routed this to me" before they encounter "AutoProxy answered this on my behalf." Trust is earned through visible correctness at low stakes before attempting high-stakes automation.

The broader principle: in workplace communication tools, the cost of a wrong auto-response is not just the wrong answer -- it is the destruction of trust in the entire system.
