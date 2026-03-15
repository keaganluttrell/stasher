---
title: "Source: AutoProxy Technical Specification v1 (On-Site)"
description: "On-site system architecture, data model, message processing flow, OTP process design, and Ash framework integration"
date: 2026-03-14
group: zk
type: source
id: "20260314-source-autoproxy-technical-spec"
links:
  - "20260314-domain-placement-comms-extension-vs-separate"
  - "20260314-async-processing-oban-not-inline"
  - "20260314-deterministic-rules-before-llm"
  - "20260314-rag-over-fine-tuning-for-property-knowledge"
  - "20260314-four-decisions-per-message"
  - "20260314-auto-response-allowlist-structured-data-only"
source: "projects/autoproxy/TECHNICAL_SPEC"
created_by: agent
---

## Key Takeaways

- AutoProxy is placed as a Comms domain extension (`Amos.Comms.AutoProxy.*`), not a separate domain, to avoid cross-domain dependency cycles. This decision is revisited in v2.
- Architecture is fully asynchronous via Oban: message creation completes normally, AutoProxy processes in background. Users never wait for AI inference.
- Six new Ash resources: AutoProxyConfig (per-property settings), MessageClassification (immutable audit trail), RoutingRule (declarative routing), KnowledgeEntry (RAG corpus with pgvector), AutoProxyFeedback (human corrections), UserProxyPreference (focus mode, opt-in).
- Routing physically works by ensuring the right person is a channel member and sending notifications -- it does not move messages between channels. Cross-channel routing creates a thread reply and a linked message in the department channel.
- Auto-response has a hard rule: only for questions (not requests), only from KnowledgeEntry content (no hallucination), only when the response can be citation-verified against source entries.
- Suggestions are NOT messages -- they are transient UI elements delivered via PubSub, with Send/Edit/Dismiss actions. This prevents polluting channel history with unconfirmed content.

## Extracted Notes

- [[20260314-domain-placement-comms-extension-vs-separate]] -- The domain placement decision and rationale
- [[20260314-async-processing-oban-not-inline]] -- Why Oban over inline GenServer
- [[20260314-deterministic-rules-before-llm]] -- Rules handle the 80% case
- [[20260314-rag-over-fine-tuning-for-property-knowledge]] -- RAG architecture
- [[20260314-four-decisions-per-message]] -- The four-way disposition
- [[20260314-auto-response-allowlist-structured-data-only]] -- Auto-response constraints
