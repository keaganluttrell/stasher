---
title: Domain placement evolved from Comms extension to separate Proxy domain
description: >-
  v1 placed AutoProxy in Comms to avoid dependency cycles; v2 made it a separate
  domain because corporate features are intelligence, not messaging
date: 2026-03-14T00:00:00.000Z
group: atoms
type: note
id: 20260314-domain-placement-comms-extension-vs-separate
links:
  - 20260314-two-scopes-one-pipeline
  - 20260314-async-processing-oban-not-inline
  - 20260314-single-pane-communication-intelligence-layer
source: projects/autoproxy/TECHNICAL_SPEC_V2
created_by: agent
---

The domain placement for AutoProxy evolved between v1 and v2 of the technical specification, and the evolution reveals an important architectural principle about how intelligence layers relate to the systems they enhance.

**v1 decision: Comms extension (`Amos.Comms.AutoProxy.*`).** Rationale: AutoProxy's lifecycle is tightly coupled to Message creation. A separate domain would introduce a cross-domain dependency cycle (Comms depends on AutoProxy for routing, AutoProxy depends on Comms for message creation). The authorization model is identical (channel membership). A separate domain was deemed "architecture astronautics."

**v2 revision: Separate domain (`Amos.Proxy`).** Rationale: Corporate features (digests, broadcasts, report triage) are NOT messaging behaviors -- they are intelligence behaviors that use Comms as an output channel. The knowledge base is a first-class data concern that does not belong in Comms. Report ingestion reads from Payments, Reservations, and Tasks, which would violate dependency direction if placed in Comms. The boundary became clear: Comms owns channels and messages; Proxy owns intelligence, classification, knowledge, and orchestration.

The dependency direction is clean: Proxy reads from Comms (and other domains) and writes to Comms. Comms does not depend on Proxy. The notifier lives on the Comms Message resource but enqueues jobs into Proxy's Oban queue -- same pattern as an event, not a dependency.

The deeper lesson: when an intelligence layer starts as an enhancement to a specific domain (message routing) but grows into a cross-cutting concern (report triage, knowledge management, pattern detection), it deserves its own domain. The forcing function was the corporate expansion -- it made the boundary violation visible.
