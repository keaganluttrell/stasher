---
title: "AutoProxy processes messages asynchronously via Oban, never blocking message delivery"
description: "Oban provides retries, observability, rate limiting, and ordering guarantees that inline GenServer processing cannot"
date: 2026-03-14
group: zk
type: note
id: "20260314-async-processing-oban-not-inline"
links:
  - "20260314-fallback-chain-llm-reliability"
  - "20260314-domain-placement-comms-extension-vs-separate"
  - "20260314-seven-phase-build-critical-path"
  - "20260314-kill-switch-five-levels-of-granularity"
source: "projects/autoproxy/TECHNICAL_SPEC"
created_by: agent
---

A fundamental architectural constraint of AutoProxy: message creation completes normally, the message is persisted, and AutoProxy processes it in the background via an Oban job. Users never wait for AI inference during message send.

The choice of Oban over inline GenServer processing is driven by four factors:

**1. Reliability.** LLM API calls fail -- timeouts, rate limits, malformed responses, provider outages. Oban gives retries with exponential backoff, dead-letter visibility, and job-level telemetry out of the box. An inline GenServer would need to implement all of this manually.

**2. Observability.** Every AutoProxy decision is an Oban job with a queryable lifecycle. No hidden GenServer state. You can inspect why a message was classified a certain way, how long the LLM took, whether a fallback was triggered, all from the job record.

**3. Rate limiting.** LLM APIs have rate limits (Anthropic: 50 req/min for Haiku, 20 req/min for Sonnet). Oban queues with concurrency limits handle this natively. The `autoproxy_classify` queue allows 20 concurrent jobs; the `autoproxy_respond` queue allows 5.

**4. Ordering guarantees.** Messages within a channel should be processed in order. Oban's `unique` constraint per channel_id prevents concurrent processing of the same channel.

The exception is the LLM Gateway, which is a GenServer because it manages stateful infrastructure: connection pooling (Finch), circuit breaking (5 consecutive failures in 60s opens the circuit), and token budget tracking across all Oban workers. This is infrastructure, not a job.

The implication: if AutoProxy is entirely down -- all Oban workers crashed, LLM provider offline, circuit breaker open -- messaging continues to work normally. Messages are delivered. They just are not classified, routed, or auto-responded. This graceful degradation is a design requirement, not an accident.
