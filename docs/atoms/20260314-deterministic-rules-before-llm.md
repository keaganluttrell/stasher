---
title: Deterministic routing rules handle the 80% case; LLMs handle the nuanced 20%
description: >-
  RoutingRule resources are evaluated first for speed and predictability, with
  LLM classification only as fallback for unmatched messages
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-deterministic-rules-before-llm
links:
  - 20260314-two-tier-llm-strategy
  - 20260314-cost-model-ten-dollars-per-property
  - 20260314-hospitality-domain-defeats-generic-tools
  - 20260314-fallback-chain-llm-reliability
source: projects/autoproxy/TECHNICAL_SPEC
created_by: agent
---

AutoProxy's routing architecture follows a deliberate two-layer pattern: declarative RoutingRule resources are evaluated first, and the LLM is only called if no rule matches. This is not a cost optimization -- it is a reliability and predictability design.

RoutingRules are Ash resources with match conditions (channel types, intents, keywords, department) and route targets (role, specific user, or specific channel). They are property-scoped, priority-ordered, and evaluated deterministically. Example: "messages containing 'broken' in a maintenance context always go to the on-duty maintenance worker." No LLM latency, no token cost, no stochastic behavior.

The LLM handles the 20% that requires understanding nuance: "The guest in villa Sunrise mentioned the shower pressure felt different this morning" -- is this a maintenance request, a casual comment, or a complaint? The LLM can parse intent from context; a keyword rule cannot.

This layered approach has several benefits:

1. **Speed:** Rule matching is sub-millisecond. LLM classification is 200ms+ even with Haiku. The 80% of messages handled by rules arrive at the right person instantly.

2. **Predictability:** Rules produce the same output for the same input every time. GMs can understand and adjust them. LLM outputs vary stochastically.

3. **Cost:** Rules are free. At 100 messages/day, handling 80% via rules means only 20 LLM classification calls, keeping the per-property cost negligible.

4. **Graceful degradation:** If the LLM is down (provider outage, rate limit, circuit breaker open), rules still work. The 80% case continues to be routed correctly. Only the nuanced 20% falls back to "unclassified" status.

The architecture principle: use the simplest tool that works for each case. Reserve expensive, non-deterministic tools for cases that genuinely need them.
