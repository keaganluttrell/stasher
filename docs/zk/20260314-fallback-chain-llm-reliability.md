---
title: "Three-level fallback chain ensures AutoProxy never blocks on AI failure"
description: "Primary model to fallback model to deterministic rules, with circuit breakers and rate limiters, so message delivery is never contingent on LLM availability"
date: 2026-03-14
group: zk
type: note
id: "20260314-fallback-chain-llm-reliability"
links:
  - "20260314-two-tier-llm-strategy"
  - "20260314-async-processing-oban-not-inline"
  - "20260314-deterministic-rules-before-llm"
  - "20260314-kill-switch-five-levels-of-granularity"
source: "projects/autoproxy/AI_ARCHITECTURE"
created_by: agent
---

AutoProxy's fallback chain architecture ensures that AI failure never blocks message delivery or creates a silent black hole. The chain has three levels with explicit transition conditions.

**Level 1 -- Primary model (e.g., Haiku for classification):** Success returns the result. Timeout (>3s), HTTP 429/500/503, or malformed JSON triggers transition to Level 2.

**Level 2 -- Fallback model (e.g., GPT-4o-mini):** Provides cross-provider resilience. If Anthropic is down, OpenAI takes over. Timeout threshold is higher (>5s) since this is already a degraded path. Malformed JSON retries once with the same model before falling through.

**Level 3 -- Deterministic rules:** Rule-based regex and keyword heuristics handle classification when both models fail. For urgency, keyword heuristics catch safety terms. For intent, regex patterns match common operational phrases.

**If all three fail:** The message is tagged as "unclassified," routed to the default channel, and an ops alert is fired. The message was already delivered normally (async processing), so the user experience is: message sent, no AutoProxy annotation appears, and things work as if AutoProxy were not installed.

Supporting infrastructure: A GenServer-based CircuitBreaker per provider opens after 5 consecutive failures in 60 seconds, enters half-open after 30 seconds (allows 1 probe request), and closes after 3 consecutive successes. A RateLimiter GenServer implements token-bucket rate limiting per provider (50 req/min Haiku, 20 req/min Sonnet). A Finch connection pool maintains 10 connections per provider.

Each fallback transition is logged with the reason, creating an audit trail of degraded-mode operations. This data feeds back into provider reliability decisions and model selection reviews.

The design principle: the system must be valuable when working perfectly and invisible when failing. Degradation should never manifest as incorrect behavior -- only as reduced capability.
