---
title: 'Two scopes, one pipeline: property and portfolio processing in a single system'
description: >-
  AutoProxy does not become two systems when corporate features are added;
  scope-aware branching after classification keeps the architecture unified
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-two-scopes-one-pipeline
links:
  - 20260314-domain-placement-comms-extension-vs-separate
  - 20260314-corporate-property-communication-fault-line
  - 20260314-single-pane-communication-intelligence-layer
  - 20260314-cross-property-pattern-detection-via-embeddings
source: projects/autoproxy/TECHNICAL_SPEC_V2
created_by: agent
---

When AutoProxy expanded from on-site to corporate capabilities, a critical architectural decision was made: it does NOT become two systems. It remains a single processing pipeline with scope-aware branching after classification.

Every message enters through the same Ash Notifier and Oban job (ProcessMessage). Classification determines intent, urgency, and scope. After classification, the pipeline branches:

**Property scope:** Route to on-shift staff, filter by priority/focus mode, suggest responses, auto-respond to high-confidence queries. This is the original on-site pipeline.

**Portfolio scope:** Aggregate data across properties, detect cross-property patterns, triage reports, generate executive digests, process smart broadcasts. This is the corporate extension.

Scope detection uses four signals: (1) the channel has a `property_id` set (property scope), (2) the sender has roles at exactly one property (property), (3) the channel is cross-property with multiple property members (portfolio), (4) the sender has roles at multiple properties, i.e., is a regional/exec (portfolio for broadcasts and digests).

The architectural elegance is that corporate features layer on top of the existing per-message pipeline. Cross-property pattern detection consumes the same MessageClassification records that on-site routing produces. Digests aggregate the same data that individual routing decisions use. Campaign knowledge entries feed into the same RAG pipeline that answers on-site questions.

This means Phases 5-6 (corporate) are additive, not replacement. They do not require rebuilding the on-site pipeline. The risk of the corporate expansion is scope creep, not architectural rework. The constraint is that every corporate feature must consume from or produce to the same data structures that the on-site pipeline uses.
