---
title: "Source: AutoProxy Technical Specification v2 (On-Site + Corporate)"
description: "Extended technical spec adding corporate capabilities including cross-property intelligence, executive digests, and portfolio-scope processing"
date: 2026-03-14
group: zk
type: source
id: "20260314-source-autoproxy-technical-spec-v2"
links:
  - "20260314-two-scopes-one-pipeline"
  - "20260314-domain-placement-comms-extension-vs-separate"
  - "20260314-cross-property-pattern-detection-via-embeddings"
  - "20260314-exception-based-digest-design"
  - "20260314-campaign-kb-corporate-property-bridge"
  - "20260314-cross-property-data-leakage-governance-landmine"
source: "projects/autoproxy/TECHNICAL_SPEC_V2"
created_by: agent
---

## Key Takeaways

- AutoProxy does not become two systems: it remains a single processing pipeline with scope-aware branching. Every message enters through the same Ash Notifier and Oban job; scope detection determines property vs. portfolio processing.
- The domain placement decision is revised: v2 recommends `Amos.Proxy` as a separate Ash domain (not a Comms extension). Corporate features are intelligence behaviors that use Comms as an output channel, not messaging behaviors. The boundary is clear: Comms owns channels and messages, Proxy owns intelligence and orchestration.
- Seven new resources added: Campaign (with lifecycle state machine), PatternGroup (cross-property clusters), ReportIngestion (structured report triage), DigestConfig (per-user digest scheduling), EscalationChain (structured escalation paths with embedded steps), Broadcast (corporate-to-property distribution), plus scope/source-type extensions to existing resources.
- Knowledge retrieval precedence: campaign -> property -> organization, with local property entries overriding org-wide entries on the same topic.
- PatternDetector is a new GenServer maintaining a sliding window of classifications across properties. DigestScheduler manages per-user variable schedules.
- Exception-based digest by default: if no anomalies and `exception_only` is true, skip delivery entirely. Executives get silence when things are fine.

## Extracted Notes

- [[20260314-two-scopes-one-pipeline]] -- Property vs portfolio scope in one system
- [[20260314-domain-placement-comms-extension-vs-separate]] -- The revised domain placement
- [[20260314-cross-property-pattern-detection-via-embeddings]] -- Pattern detection architecture
- [[20260314-exception-based-digest-design]] -- Exception-only digest design
- [[20260314-campaign-kb-corporate-property-bridge]] -- Campaign lifecycle and knowledge distribution
- [[20260314-cross-property-data-leakage-governance-landmine]] -- Data boundary concerns
