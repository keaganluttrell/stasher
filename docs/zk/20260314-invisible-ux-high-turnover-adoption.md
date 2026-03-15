---
title: "Invisible UX is the only viable adoption strategy for a 73.8% annual turnover workforce"
description: "Hotel operations staff are not early adopters; the UX must require zero configuration, zero training, and no AI settings page"
date: 2026-03-14
group: zk
type: note
id: "20260314-invisible-ux-high-turnover-adoption"
links:
  - "20260314-shoulder-tapping-tax"
  - "20260314-hospitality-domain-defeats-generic-tools"
  - "20260314-confidence-uncanny-valley"
source: "projects/autoproxy/MARKET_RESEARCH"
created_by: agent
---

Hospitality has 73.8% annual staff turnover. This single statistic dictates the entire UX strategy for AutoProxy: the system must be invisible.

Traditional enterprise software adoption follows a curve: train power users, who train their teams, who develop proficiency over months. This model fails catastrophically in hospitality because the workforce turns over within a year. Any system that requires training, configuration, or even awareness of its existence will suffer perpetual adoption failure as trained users leave and untrained replacements arrive.

AutoProxy's design response is radical simplicity: messages arrive at the right person with relevant context attached. Answers appear when questions are asked. No configuration page, no training session, no "AI settings" UI. The system is experienced as "messaging that works better" rather than "an AI tool you need to learn."

The implications cascade through every design decision:
- Focus mode is a simple on/off toggle with sensible defaults, not a configurable matrix of urgency thresholds.
- Routing happens automatically based on classification and staff schedules; users do not need to understand how it works.
- Auto-response appears as if the right person answered quickly, with a small attribution note. Users do not need to know it was AI.
- Corrections are simple thumbs up/thumbs down reactions, not detailed feedback forms.

The parallel risk: invisible systems that fail are worse than visible systems that fail, because users do not know what went wrong or how to work around it. This is why the fallback architecture is essential -- when AutoProxy cannot classify or route, messages are delivered normally. The degradation is from "enhanced messaging" to "regular messaging," not from "working" to "broken."
