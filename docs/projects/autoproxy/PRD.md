---
title: 'AutoProxy: Product Requirements Document'
description: >-
  Product requirements for AutoProxy v2.0 covering 10 personas, 22 user stories,
  RICE-scored prioritization, and phased rollout plan.
date: 2025-03-14T00:00:00.000Z
group: projects/autoproxy
type: doc
id: projects/autoproxy/PRD
---

# AutoProxy: AI-Powered Message Proxy Layer

## Product Requirements Document v2.0

---

## 1. Problem Statement

### The Shoulder-Tapping Tax

Hospitality operations run on interruptions. Every question, status update, and request requires finding the right person and pulling them out of whatever they are doing. This tax compounds at every level of the organization:

**On-Site (Property Level)**
- A housekeeper needs to know if a late checkout was approved. She walks to the front desk. The front desk agent is on the phone. She waits. Two rooms fall behind schedule.
- A maintenance tech finds a broken AC unit. He calls his supervisor. Voicemail. He texts. No reply for 20 minutes. The guest complains to the front desk. The front desk calls the GM. Three people interrupted for one work order.
- A front desk agent gets the same question from five different housekeepers across a shift: "Is room 412 a late checkout?" The answer exists in the PMS. Nobody checks the PMS because asking a person is faster than navigating software.

**Corporate/HQ Level**
- A regional manager oversees 8 properties. Each GM sends a daily ops report. She reads 8 reports, identifies the 2 that need attention, and spends 45 minutes composing responses that say "looks good" to the other 6.
- Corporate marketing launches a new weekend brunch promotion. Within 24 hours, 12 properties ask overlapping questions: "Does this replace the existing Sunday brunch?" "What are the approved menu items?" "Do we need new signage?" Marketing answers the same question 12 times.
- The COO gets 40+ messages per day from regional managers, property GMs, and department heads. 80% are informational. 15% need a simple acknowledgment. 5% need a real decision. He spends 2 hours daily triaging to find the 5%.
- Corporate finance distributes the monthly P&L. Every property GM has the same three questions about the new line item format. Finance answers 12 times instead of once.
- HR rolls out a new PTO policy. Each property's admin asks slightly different versions of the same clarification questions. HR spends a week on what should have been a single FAQ.

### The Compounding Effect

The shoulder-tapping problem does not scale linearly. It scales with the organizational hierarchy:

| Level | Tapped By | Approximate Daily Interruptions |
|-------|-----------|-------------------------------|
| Housekeeper | Guests (via front desk relay) | 2-5 |
| Front Desk Agent | Housekeepers, maintenance, guests, sales | 30-50 |
| Department Head | Their entire team + peer departments | 20-40 |
| General Manager | Every department head + regional manager | 40-60 |
| Regional Manager | Every GM in their portfolio (5-10) | 50-80 |
| Executive (C-suite) | Regional managers + corporate staff + board | 60-100+ |

Each interruption costs an average of 4 minutes of context-switch time (source: internal observation). At the executive level, that is 4-6 hours per day of fragmented attention. These are the highest-paid, highest-leverage people in the organization, and their time is consumed by routing and triaging rather than deciding and leading.

### Why Existing Tools Fail

- **Slack/Teams**: Great for sending messages. Terrible for routing them. Everyone messages everyone. Channels multiply. Noise wins.
- **Email**: Slow, asynchronous, and unstructured. Thread management breaks down. Critical items buried under FYIs.
- **PMS messaging (competitors)**: Breezeway, Quore, and others offer messaging inside their task systems, but none have intelligence. They are dumb pipes with notification settings.
- **AI chatbots (generic)**: Do not understand hotel operations, do not have access to live operational data (room status, reservation details, folio balances), and cannot take action.

### The Amos Advantage

Amos is the single source of truth for the entire operation. AutoProxy sits inside Amos, which means it has real-time access to:
- Every reservation, its status, and its folio balance
- Every room's housekeeping and maintenance status
- Every task, its assignment, and its completion state
- Every staff schedule and who is currently on shift
- Every property's configuration, rates, and catalog
- The full organizational hierarchy (users, roles, properties)

No external AI tool can match this. AutoProxy does not just route messages -- it answers questions by reading the live system state.

---

## 2. Vision

**You only see what needs you, whether you are on-site or at HQ.**

AutoProxy is an intelligent message proxy that sits between every person in the organization. It reads every message, understands intent, checks live system data, and makes one of four decisions:

1. **Answer it** -- the question has a factual answer in the system. Respond immediately with the data.
2. **Route it** -- the question needs a human, but not the one who was asked. Send it to the right person.
3. **Absorb it** -- the message is informational. Acknowledge receipt, file it, surface it in the next digest.
4. **Escalate it** -- the message is urgent or exceptional. Bypass normal routing and alert the right person immediately.

For a housekeeper, this means asking "Is 412 a late checkout?" in the team channel and getting an instant answer from AutoProxy instead of walking to the front desk.

For a regional manager, this means receiving a single daily digest that says "7 of 8 properties are on track. Property Tulum has a staffing gap this weekend -- here are the details and a recommended action" instead of reading 8 separate reports.

For a CEO, this means seeing only the decisions that require their authority, with full context pre-assembled, instead of sifting through 100 messages to find the 5 that matter.

**The design principle**: AutoProxy should make every person in the organization feel like they have a dedicated, infinitely patient chief of staff who handles triage, answers routine questions, and only interrupts them for things that genuinely need their attention.

---

## 3. User Personas

### On-Site Personas

#### 3.1 Housekeeper (Maria)
- **Role**: Housekeeping staff
- **Tech comfort**: Low -- uses a phone, prefers voice or simple text
- **Daily message volume**: 10-20 sent, 5-10 received
- **Pain points**: Cannot get real-time room status without walking to the front desk. Unsure which rooms are late checkouts, early arrivals, or VIPs requiring special setup. Often duplicates questions her colleagues already asked.
- **AutoProxy value**: Instant answers to room status queries. Task assignments pushed to her directly with all context (room number, special instructions, supplies needed). Never needs to ask "what's next?"

#### 3.2 Front Desk Agent (Carlos)
- **Role**: Front desk / guest services
- **Tech comfort**: Medium -- uses PMS daily
- **Daily message volume**: 50-80 sent and received
- **Pain points**: Is the routing hub for the entire property. Gets questions from housekeeping, maintenance, sales, and management that he often cannot answer himself. Spends significant time relaying messages between departments. Gets the same questions repeatedly across shifts.
- **AutoProxy value**: 60-70% of inbound questions answered automatically. Remaining questions routed to the correct department without Carlos being the middleman. Shift handoff notes auto-generated from the day's message history.

#### 3.3 Maintenance Supervisor (James)
- **Role**: Maintenance / engineering lead
- **Tech comfort**: Medium -- uses phone and basic apps
- **Daily message volume**: 15-30 sent, 20-40 received
- **Pain points**: Receives work orders through multiple channels (radio, text, verbal, PMS). Cannot prioritize effectively because he lacks visibility into guest impact (is the broken AC in an occupied room or a vacant one?). Spends time on status update requests from the front desk and GM.
- **AutoProxy value**: Work orders arrive with full context (room status, guest check-out date, priority score). Status updates sent automatically when tasks are completed. GM gets a maintenance summary without James writing one.

#### 3.4 General Manager (Priya)
- **Role**: Property GM
- **Tech comfort**: High -- power user of multiple systems
- **Daily message volume**: 60-100 sent and received
- **Pain points**: Drowning in operational noise. Every department head escalates to her. Regional manager expects daily updates. Spends 2-3 hours daily on messages that are informational or could have been handled at a lower level. Rarely has uninterrupted time for strategic work.
- **AutoProxy value**: 80% of inbound messages handled without her involvement. Exception-based alerts for things that genuinely need GM decision. Auto-generated daily report to regional manager. Can focus on guest experience and team development instead of message triage.

#### 3.5 Sales Coordinator (David)
- **Role**: Sales / events
- **Tech comfort**: High -- uses CRM, email, PMS
- **Daily message volume**: 20-40 sent, 15-30 received
- **Pain points**: Needs real-time availability and pricing to respond to inquiries. Currently checks multiple systems or asks the front desk. Group booking coordination requires back-and-forth with operations that delays response times.
- **AutoProxy value**: Instant availability and rate queries answered from live system data. Group booking coordination messages auto-routed to the right operational contacts. Follow-up reminders generated automatically.

### Corporate/HQ Personas

#### 3.6 Regional Manager (Sofia)
- **Role**: Oversees 5-10 properties
- **Tech comfort**: High
- **Daily message volume**: 80-120 sent and received across all properties
- **Pain points**: Gets identical questions from multiple GMs ("Can I approve overtime this weekend?", "What's the policy on comping a room for a service failure?"). Reads 5-10 daily ops reports and manually identifies which properties need attention. Cannot easily compare performance across properties without pulling data from multiple sources. When she is traveling to one property, the others feel neglected.
- **AutoProxy value**: Cross-property pattern detection ("3 of your properties are asking about the overtime policy -- here is a single response you can approve for all"). AI-summarized property digests that highlight only anomalies and exceptions. Policy questions answered automatically from the knowledge base. Her response to one GM's question auto-applied to identical questions from other GMs.

#### 3.7 Executive / C-Suite (Michael -- COO)
- **Role**: Chief Operating Officer
- **Tech comfort**: High but time-constrained
- **Daily message volume**: 100+ received, 20-30 meaningful responses needed
- **Pain points**: 80% of his inbox is noise -- status updates, FYI messages, and questions that should have been resolved two levels below. The 5% that needs his decision is buried. He spends the first 90 minutes of every day triaging instead of leading. Board-ready summaries require manual compilation from multiple regional reports.
- **AutoProxy value**: Sees only exception-based alerts and decision requests. Everything else is absorbed, acknowledged, and filed. Weekly executive digest auto-generated: key metrics, anomalies, decisions made at lower levels, and items requiring executive action. Can respond to a decision request with a one-word answer because AutoProxy pre-assembles all context.

#### 3.8 Corporate Marketing (Aisha)
- **Role**: Marketing manager, campaigns and promotions
- **Tech comfort**: High
- **Daily message volume**: 30-50, spikes to 100+ during campaign launches
- **Pain points**: Every campaign launch triggers a wave of implementation questions from properties. Questions are 80% identical but arrive individually from each property. She writes the same answer 10 times. Properties that do not ask sometimes implement incorrectly because they assumed instead of asking.
- **AutoProxy value**: Campaign briefs uploaded once. AutoProxy builds a campaign knowledge base and answers property questions automatically. Properties that have not acknowledged or implemented the campaign get proactive nudges. Aisha sees a single dashboard showing campaign rollout status across all properties instead of monitoring individual message threads.

#### 3.9 Corporate Finance (Robert)
- **Role**: Revenue management / financial reporting
- **Tech comfort**: High
- **Daily message volume**: 20-30, spikes around month-end
- **Pain points**: Distributes reports that generate the same clarification questions from every property. When he needs data from a specific property, he often messages the GM, who routes to the bookkeeper, who sends it back through the GM. Rate change communications require confirmation from every property, and tracking who has acknowledged is manual.
- **AutoProxy value**: Report distribution with auto-generated FAQ from the report content. Data requests routed directly to the person with access, bypassing the GM relay. Rate change confirmations tracked automatically with follow-up to non-responders. Month-end close coordination managed through a single broadcast thread rather than individual conversations.

#### 3.10 Corporate HR (Elena)
- **Role**: Human resources, policy and compliance
- **Tech comfort**: Medium-high
- **Daily message volume**: 15-25, spikes during policy rollouts or open enrollment
- **Pain points**: Policy questions are repetitive and voluminous. Each property's admin asks slightly different versions of the same question. Onboarding coordination for new hires requires back-and-forth with multiple departments at the hiring property. Compliance deadlines (training completions, certifications) require manual tracking and individual follow-up.
- **AutoProxy value**: Policy knowledge base answers 90% of questions automatically. Onboarding checklists coordinated through a single thread with auto-routing to each responsible party. Compliance deadline tracking with auto-escalation when deadlines approach. New policy rollouts distributed with comprehension verification (AutoProxy can quiz or confirm understanding).

---

## 4. User Stories

### Phase 1: Foundation (On-Site, Single Property)

**P1-01: Direct Question Answering**
As a housekeeper, when I send "Is room 412 a late checkout?" to my team channel, AutoProxy responds within 5 seconds with the checkout time from the reservation system, so I can plan my cleaning route without leaving my floor.

Acceptance criteria:
- Message containing a room number + status question triggers a system lookup
- Response includes: room number, current status, checkout time, and guest name (if policy allows)
- Response is delivered in the same channel within 5 seconds
- If the data is unavailable or ambiguous, AutoProxy says so and routes to front desk

**P1-02: Repeated Question Detection**
As a front desk agent, when multiple housekeepers ask the same room status question within a shift, AutoProxy answers from the first lookup without re-querying, so I am not interrupted repeatedly for the same information.

Acceptance criteria:
- Second identical question within 30 minutes receives a cached response
- Cache invalidates when the underlying data changes (e.g., checkout time updated)
- Front desk agent is not notified of questions AutoProxy handled

**P1-03: Smart Routing**
As a maintenance tech, when I send "The AC in room 308 is making a grinding noise" to the general channel, AutoProxy creates a maintenance task, assigns it based on the on-duty maintenance schedule, and confirms the assignment to me, so I do not need to find my supervisor.

Acceptance criteria:
- Message classified as a maintenance issue triggers task creation in the Tasks domain
- Task is assigned to the on-duty maintenance staff member with the relevant skill tag
- Confirmation message sent to the reporter with the assigned person's name and expected response time
- If no maintenance staff is on duty, message escalates to the GM with urgency flag

**P1-04: Confidence-Based Response**
As a GM, I want AutoProxy to only auto-respond when it is confident in the answer (above a configurable threshold), so guests and staff are not given incorrect information.

Acceptance criteria:
- Each AutoProxy response includes an internal confidence score (0.0 - 1.0)
- Responses below the property-configured threshold (default 0.85) are routed to a human instead of auto-responded
- Confidence threshold is configurable per property by the GM or admin
- All auto-responses are logged with their confidence score for audit

**P1-05: Operational Context Enrichment**
As a front desk agent, when I receive a guest complaint message, AutoProxy attaches relevant context (reservation details, recent maintenance history for their room, any open tasks) to the message, so I can respond to the guest without looking up three systems.

Acceptance criteria:
- Messages classified as guest complaints trigger context assembly
- Context includes: reservation summary, room maintenance history (last 30 days), open tasks for that room, guest's previous stays (if any)
- Context is appended to the message as a structured attachment, not inline text
- Context assembly completes within 3 seconds

**P1-06: Message Classification**
As a system, every inbound message to a team channel is classified into one of: question, request, status_update, complaint, informational, urgent, so downstream routing logic can act on structured intent rather than raw text.

Acceptance criteria:
- Classification happens within 2 seconds of message receipt
- Classification accuracy is above 90% as measured by human review of a random sample
- Classification is stored on the message record for analytics
- Misclassified messages can be corrected by a human, and corrections feed back into the model

**P1-07: Do Not Disturb / Override**
As a GM, I can set my status to "Do Not Disturb" and AutoProxy will hold all non-urgent messages, delivering them in a batch when I become available, so I can have uninterrupted focus time.

Acceptance criteria:
- DND status is settable per user with an optional duration (e.g., "DND for 2 hours")
- Messages classified as "urgent" bypass DND and are delivered immediately
- Non-urgent messages are queued and delivered as a summary when DND expires
- DND status is visible to other users ("Priya is in focus mode until 2pm")

### Phase 2: Learning and Adaptation (On-Site + Cross-Property Foundation)

**P2-01: Response Approval Workflow**
As a GM, when AutoProxy drafts a response it is not confident enough to send automatically, I can approve, edit, or reject the draft, and my edits train AutoProxy to handle similar messages in the future, so response quality improves over time.

Acceptance criteria:
- Below-threshold responses are presented as drafts in a dedicated approval queue
- GM can approve (send as-is), edit (modify then send), or reject (route to human)
- Edited responses are stored as training examples
- After 5 approved responses of the same type, AutoProxy's confidence for that category increases

**P2-02: Shift Handoff Summary**
As an incoming front desk agent, I receive an AI-generated shift summary when I clock in, covering: unresolved guest issues, pending arrivals with special requests, maintenance items in progress, and any messages that need follow-up, so I do not start my shift blind.

Acceptance criteria:
- Summary generated automatically when a user clocks in (StaffSchedule clock_in event)
- Summary covers the previous shift's open items from Comms, Tasks, and Reservations domains
- Summary is delivered as a message in the user's direct channel with AutoProxy
- Items are prioritized by urgency and guest impact

**P2-03: Property-Level Knowledge Base**
As a property admin, I can upload SOPs, house rules, and local policies to a property knowledge base that AutoProxy uses to answer staff questions, so institutional knowledge is not trapped in people's heads.

Acceptance criteria:
- Documents can be uploaded in PDF, DOCX, or plain text format
- AutoProxy indexes the content and can answer questions by citing specific sections
- Answers from the knowledge base include a source reference (document name, section)
- Knowledge base is property-scoped (each property has its own)
- Documents can be versioned and retired

**P2-04: Cross-Property Question Detection**
As a regional manager, when 3 or more properties ask the same or semantically equivalent question within a 48-hour window, AutoProxy flags it as a pattern and presents me with a single draft response that can be broadcast to all asking properties, so I answer once instead of N times.

Acceptance criteria:
- Semantic similarity detection across messages from different properties directed at corporate roles
- Pattern threshold is configurable (default: 3 properties within 48 hours)
- Regional manager sees a consolidated view: the question pattern, which properties asked, and a draft response
- Approved response is delivered to all asking properties and added to the knowledge base for future auto-response
- Properties that did not ask but might benefit receive a proactive FYI

**P2-05: Escalation Chain Definition**
As an admin, I can define escalation chains (property staff -> department head -> GM -> regional manager -> executive) per message category, so AutoProxy resolves at the lowest level possible and only escalates when necessary.

Acceptance criteria:
- Escalation chains are configurable per property and per message category
- Each level in the chain has a timeout (e.g., 15 minutes for department head, 30 minutes for GM)
- AutoProxy attempts resolution at each level before escalating
- Escalation includes all context from prior levels (what was tried, why it was not resolved)
- The person being escalated to sees a clean summary, not the full thread

**P2-06: Response Quality Tracking**
As a system, every AutoProxy response is trackable: was it accepted, corrected, or rejected by the recipient, so we can measure and improve accuracy over time.

Acceptance criteria:
- Recipients can react to AutoProxy responses with thumbs up (correct) or thumbs down (incorrect)
- Incorrect responses trigger a human review queue
- Weekly accuracy report generated per property and per message category
- Accuracy below 80% for any category triggers an alert to the property admin

### Phase 3: Intelligence (On-Site Maturity + Corporate Features)

**P3-01: Predictive Routing**
As a system, AutoProxy learns from historical routing patterns which person is most likely to resolve a given type of request, and routes to them first, even if they are not the "default" assignee, so resolution time decreases over time.

Acceptance criteria:
- Routing model considers: message category, time of day, historical resolution rate per person, current workload
- Routing suggestions are logged and compared against actual resolution to measure improvement
- Model retrains weekly on new data
- Override by admin: certain categories can be locked to specific people regardless of model suggestion

**P3-02: Executive Digest**
As a COO, I receive a daily digest at my preferred time (default 7:00 AM local) that summarizes: key metrics across all properties, anomalies or exceptions that need attention, decisions made at lower levels that I should be aware of, and items explicitly escalated to me, so I start my day with a complete picture in under 5 minutes of reading.

Acceptance criteria:
- Digest is generated from data across Reservations, Payments, Tasks, Comms, and Staff domains
- Metrics include: occupancy rate, revenue vs. forecast, open tasks count, guest satisfaction indicators
- Anomalies are defined as metrics deviating more than 2 standard deviations from the 30-day rolling average
- Digest is delivered as a message in the executive's direct channel with AutoProxy
- Digest length is capped at 500 words with expandable sections for detail
- Executive can reply to any section to request more detail or take action

**P3-03: Campaign Q&A Automation**
As a marketing manager, when I launch a new campaign, I upload the campaign brief and AutoProxy automatically builds a Q&A knowledge base from it, answering property-level implementation questions without my involvement, so I launch once and move on.

Acceptance criteria:
- Campaign brief uploaded as a document (PDF, DOCX, or structured form)
- AutoProxy generates anticipated Q&A pairs from the brief content
- Marketing manager reviews and approves the generated Q&A before activation
- Properties' questions are matched against the Q&A; matches are auto-responded with source citation
- Unmatched questions are routed to marketing and, once answered, added to the Q&A for future auto-response
- Campaign Q&A has an expiration date matching the campaign end date
- Rollout dashboard shows: which properties have acknowledged, which have asked questions, which have not engaged

**P3-04: Intelligent Broadcast**
As a corporate staff member, when I send a broadcast message, AutoProxy adapts it per property context (e.g., a message about pool maintenance hours only goes to properties that have pools; a message about ski rental pricing only goes to mountain properties), so properties do not receive irrelevant communications.

Acceptance criteria:
- Broadcast messages include optional targeting rules based on property attributes (amenities, location, size, type)
- AutoProxy filters the recipient list based on targeting rules
- Broadcast sender sees a preview of which properties will receive the message and which are excluded, with reasons
- Recipients can be overridden manually (add or remove specific properties)
- Broadcast delivery is tracked: delivered, read, acknowledged, and action-taken per property

**P3-05: Report Triage**
As a COO, when daily/weekly reports arrive from properties, AutoProxy classifies them (on-track, needs-attention, critical), extracts key metrics and anomalies, and presents me with a sorted list where critical items are at the top, so I spend my time on the 20% that matters.

Acceptance criteria:
- Reports are classified into: on_track, needs_attention, critical based on metric thresholds
- Thresholds are configurable per metric (e.g., occupancy below 60% = needs_attention, below 40% = critical)
- Extracted metrics are stored in a structured format for trend analysis
- "On track" reports are acknowledged automatically on behalf of the executive
- "Needs attention" reports are summarized with the specific anomaly highlighted
- "Critical" reports trigger an immediate notification regardless of DND status

**P3-06: Cross-Property Intelligence**
As a regional manager, when one property successfully resolves a recurring issue (e.g., a process change that reduced housekeeping complaints), AutoProxy identifies other properties with the same issue pattern and suggests applying the same solution, so best practices spread without manual intervention.

Acceptance criteria:
- Issue patterns are identified by clustering similar messages across properties over a rolling 90-day window
- When a resolution is marked as successful at one property, AutoProxy checks for the pattern at other properties
- Suggestion is sent to the regional manager for approval before distribution
- If approved, the solution is shared with affected properties as a proactive recommendation
- Adoption tracking: which properties implemented the suggestion and whether the issue decreased

**P3-07: Data Request Smart Routing**
As a finance manager, when I need data from a specific property, I describe what I need in natural language and AutoProxy either pulls it directly from the system (if the data exists in Amos) or routes the request to the specific person at the property who can provide it (bypassing the GM relay), so I get answers in minutes instead of days.

Acceptance criteria:
- Natural language data requests are parsed for: data type, property, time range, format
- If the data exists in Amos, AutoProxy generates the answer directly (e.g., "What was Property Tulum's occupancy last week?" answered from Reservations domain)
- If the data requires human input, the request is routed to the person with the relevant role at the specified property
- Response is routed back to the requester directly, with the GM cc'd only if configured to be
- Request fulfillment time is tracked for SLA reporting

### Phase 4: Autonomy (Full Intelligence, On-Site + Corporate)

**P4-01: Proactive Issue Detection**
As a GM, AutoProxy monitors system data and alerts me to emerging issues before they are reported, such as: a room that has been in "dirty" status for 3 hours past the expected cleaning time, a maintenance task that has been open for 48 hours, or a VIP arriving in 2 hours whose room is not ready, so I can intervene before problems reach guests.

Acceptance criteria:
- Monitoring rules are configurable per property (thresholds, timing, categories)
- Default rules cover: overdue housekeeping, overdue maintenance, VIP readiness, staffing gaps
- Alerts include the issue, its context, and a suggested action
- Alert frequency is rate-limited to prevent alert fatigue (max 10 per hour per user, configurable)
- Alerts that are dismissed or resolved feed back into threshold tuning

**P4-02: Autonomous Task Execution**
As a system, when AutoProxy identifies a routine action that always results in the same outcome (e.g., assigning a standard cleaning task to the next available housekeeper), it can execute the action directly without human approval, within defined guardrails, so routine operations happen without any human involvement.

Acceptance criteria:
- Autonomous actions are defined by admin: action type, conditions, guardrails
- Each autonomous action has a maximum impact scope (e.g., can assign tasks but cannot cancel reservations)
- All autonomous actions are logged with full audit trail
- Any autonomous action can be reversed by a human within a configurable window
- Autonomous action rate is monitored; sudden spikes trigger a circuit breaker that pauses and alerts an admin

**P4-03: Meeting and Report Elimination**
As a regional manager, AutoProxy replaces my weekly property review calls with an interactive digest that I can query conversationally ("How did Tulum do on housekeeping scores this week?" "Compare Cancun and Playa occupancy trends"), so I save 5-10 hours per week of meetings while staying better informed.

Acceptance criteria:
- Weekly digest covers all properties in the regional manager's portfolio
- Digest is interactive: the regional manager can ask follow-up questions in the same thread
- Follow-up questions are answered from live system data, not just the digest snapshot
- If a question cannot be answered from data, AutoProxy routes it to the relevant GM with context
- Time savings are tracked: hours of meetings replaced per week

**P4-04: Policy Compliance Monitoring**
As an HR manager, AutoProxy monitors operational data for policy compliance issues (e.g., staff working more than the maximum consecutive days, training certifications expiring, labor law compliance), and proactively alerts me and the property admin, so compliance issues are caught before they become violations.

Acceptance criteria:
- Compliance rules are configurable by HR (thresholds, grace periods, severity)
- Default rules cover: consecutive days worked, certification expiration, break time compliance
- Alerts go to both HR and the property admin simultaneously
- Escalation if the issue is not resolved within the grace period
- Compliance dashboard shows current status across all properties

**P4-05: Onboarding Automation**
As an HR manager, when a new hire is added to the system, AutoProxy coordinates the onboarding process across departments: IT setup, uniform ordering, training schedule, buddy assignment, first-week checklist, by creating tasks and routing them to the responsible parties at the new hire's property, so onboarding happens consistently without HR micromanaging each step.

Acceptance criteria:
- Onboarding templates are configurable per role and per property
- Task creation is triggered by a new User record with a start date
- Each task is assigned to the responsible party based on role and property
- Progress is tracked and visible to HR, the property admin, and the new hire's manager
- Delays trigger auto-escalation to the next level

**P4-06: Executive Decision Support**
As a COO, when an item is escalated to me for a decision, AutoProxy presents it with: the full context chain (who raised it, what was tried at each level), relevant historical precedents (how similar decisions were made in the past), data supporting each option, and a recommended course of action with confidence level, so I can make faster, better-informed decisions.

Acceptance criteria:
- Decision requests include structured context: issue summary, escalation path, options, data, recommendation
- Historical precedent search covers the last 12 months of similar escalations
- Recommendation includes confidence level and reasoning
- Executive can approve the recommendation with a single action
- Decision is propagated back down the chain with instructions auto-generated for each level

---

## 5. Phased Rollout

### Phase 1: Foundation (Months 1-3)

**Goal**: Prove that AutoProxy can answer operational questions from live system data at a single property.

| Feature | Stories | Target Persona | Priority |
|---------|---------|---------------|----------|
| Message classification engine | P1-06 | System | Must-have |
| Direct question answering (room status, reservation lookup) | P1-01, P1-02 | Maria, Carlos | Must-have |
| Confidence scoring and threshold | P1-04 | Priya | Must-have |
| Context enrichment on messages | P1-05 | Carlos | Should-have |
| Smart routing to on-duty staff | P1-03 | James | Should-have |
| DND / focus mode | P1-07 | Priya | Could-have |

**Success gate**: AutoProxy correctly answers 70%+ of room status and reservation queries at a pilot property. Front desk interruption count drops by 30%.

**Technical foundation**:
- Message classification pipeline (intent detection, entity extraction)
- Read-only Amos data access layer (Reservations, Villas, Tasks, Staff domains)
- Confidence scoring model
- AutoProxy message delivery through Comms domain (Channel/Message)
- Audit logging for all AutoProxy actions

### Phase 2: Learning (Months 4-6)

**Goal**: AutoProxy learns from human corrections, handles cross-property patterns, and manages escalation chains.

| Feature | Stories | Target Persona | Priority |
|---------|---------|---------------|----------|
| Response approval workflow | P2-01 | Priya | Must-have |
| Response quality tracking | P2-06 | System | Must-have |
| Property knowledge base | P2-03 | Priya, admin | Must-have |
| Shift handoff summaries | P2-02 | Carlos | Should-have |
| Cross-property question detection | P2-04 | Sofia | Should-have |
| Escalation chain configuration | P2-05 | Admin | Should-have |

**Success gate**: AutoProxy accuracy reaches 85%+ across all categories. At least one cross-property pattern detected and resolved through a single broadcast response.

**Technical foundation**:
- Feedback loop (approval, correction, rejection tracking)
- Knowledge base ingestion and retrieval (RAG pipeline)
- Semantic similarity engine for cross-property pattern detection
- Escalation chain engine with timeout management
- Cross-property message visibility (scoped to regional/corporate roles)

### Phase 3: Intelligence (Months 7-10)

**Goal**: Corporate users get value. Cross-property intelligence, executive digests, campaign automation, and smart broadcasts.

| Feature | Stories | Target Persona | Priority |
|---------|---------|---------------|----------|
| Executive digest | P3-02 | Michael (COO) | Must-have |
| Report triage | P3-05 | Michael (COO) | Must-have |
| Campaign Q&A automation | P3-03 | Aisha | Must-have |
| Intelligent broadcast | P3-04 | Corporate staff | Should-have |
| Cross-property intelligence (best practice sharing) | P3-06 | Sofia | Should-have |
| Predictive routing | P3-01 | System | Should-have |
| Data request smart routing | P3-07 | Robert | Could-have |

**Success gate**: Executive daily triage time reduced by 50%. Campaign launch question volume reduced by 70% through auto-response. At least one cross-property best practice successfully propagated.

**Technical foundation**:
- Multi-property data aggregation engine
- Digest generation pipeline (scheduled, AI-summarized)
- Campaign knowledge base (separate from property knowledge base, with expiration)
- Property attribute system for broadcast targeting
- Anomaly detection (statistical deviation from rolling averages)

### Phase 4: Autonomy (Months 11-14)

**Goal**: AutoProxy takes autonomous actions within guardrails. Replaces meetings and manual coordination. Monitors compliance.

| Feature | Stories | Target Persona | Priority |
|---------|---------|---------------|----------|
| Proactive issue detection | P4-01 | Priya | Must-have |
| Autonomous task execution | P4-02 | System | Must-have |
| Executive decision support | P4-06 | Michael (COO) | Must-have |
| Policy compliance monitoring | P4-04 | Elena | Should-have |
| Meeting/report replacement | P4-03 | Sofia | Should-have |
| Onboarding automation | P4-05 | Elena | Could-have |

**Success gate**: 30% of routine tasks auto-executed without human involvement. Zero compliance violations missed. Executive decision turnaround time reduced by 60%.

**Technical foundation**:
- Action execution engine with guardrails and circuit breakers
- Monitoring rule engine (configurable thresholds, rate limiting)
- Historical precedent search
- Compliance rule engine
- Full audit trail with reversal capability

---

## 6. Success Metrics

### On-Site KPIs

| Metric | Baseline | Phase 1 Target | Phase 2 Target | Phase 3 Target | Phase 4 Target |
|--------|----------|---------------|---------------|---------------|---------------|
| Front desk interruptions per shift | 40-50 | 30 (-30%) | 20 (-50%) | 15 (-65%) | 10 (-75%) |
| Average question resolution time | 8 min | 3 min | 1 min | 30 sec | 15 sec |
| AutoProxy auto-response accuracy | N/A | 70% | 85% | 90% | 95% |
| Messages requiring human routing | 100% | 60% | 35% | 20% | 10% |
| Staff satisfaction (survey, 1-5) | 3.2 | 3.5 | 3.8 | 4.2 | 4.5 |
| Shift handoff time | 15 min | 15 min | 5 min | 3 min | 2 min |
| Task assignment time (report to assign) | 12 min | 5 min | 2 min | 1 min | Instant |

### Corporate KPIs

| Metric | Baseline | Phase 2 Target | Phase 3 Target | Phase 4 Target |
|--------|----------|---------------|---------------|---------------|
| Executive daily triage time | 90 min | 75 min | 45 min | 20 min |
| Regional manager message volume | 80-120/day | 70/day | 40/day | 20/day |
| Campaign launch question volume (per property) | 8-12 questions | 8-12 | 3-4 | 1-2 |
| Cross-property duplicate questions | Untracked | Detected | 70% auto-resolved | 90% auto-resolved |
| Report processing time (executive) | 45 min/day | 40 min | 15 min | 5 min |
| Weekly meeting hours (regional manager) | 8-10 hrs | 8-10 hrs | 5-6 hrs | 2-3 hrs |
| Policy question response time (HR) | 4-24 hours | 4-24 hrs | 1 hour | 5 min |
| Compliance violations caught proactively | 0% | 0% | 30% | 80% |

### System Health KPIs

| Metric | Target |
|--------|--------|
| AutoProxy response latency (p95) | < 5 seconds |
| System uptime | 99.9% |
| False positive rate (incorrect auto-responses) | < 5% |
| Escalation accuracy (right person, right level) | > 90% |
| Autonomous action reversal rate | < 2% |
| Knowledge base answer relevance score | > 0.85 |

---

## 7. Risks and Mitigations

### On-Site Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Wrong answer to a guest-impacting question** (e.g., wrong checkout time leads to early room entry) | High | Medium | Confidence threshold system. Guest-impacting categories start at 0.95 threshold. Human approval required below threshold. Audit trail for accountability. |
| **Staff distrust** -- staff ignore AutoProxy and revert to shoulder-tapping | Medium | High | Gradual rollout. Start with low-risk queries (room status). Visible accuracy tracking. Staff input on what AutoProxy should/should not handle. Quick win demonstration in first week. |
| **Over-reliance** -- staff stop thinking critically because AutoProxy handles everything | Medium | Low (Phase 1-2), Medium (Phase 3-4) | AutoProxy never presents opinions as facts. Sources are always cited. Periodic "manual mode" training days. Critical decisions always require human confirmation. |
| **Noise creation** -- AutoProxy generates more messages than it eliminates | Medium | Medium | Strict message budget per channel per hour. Consolidation of related updates into single messages. User-configurable notification preferences. Weekly noise audit metric. |

### Corporate Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Cross-property data leakage** -- information from one property visible to unauthorized users at another | Critical | Medium | Property-scoped data access enforced at the Ash policy layer (existing multi-tenancy model). AutoProxy inherits the actor's permissions -- it cannot see or share data the user cannot access. Cross-property features (digests, pattern detection) only available to users with roles at multiple properties. Audit log for every cross-property data access. |
| **Executive trust deficit** -- COO does not trust AI summaries and double-checks everything, negating time savings | High | High | Start with "shadow mode" -- executive sees the digest alongside raw data for 4 weeks. Track where the digest was accurate vs. where the executive found something it missed. Iteratively improve. Never hide raw data access -- digest is an addition, not a replacement. |
| **Campaign misinformation** -- AutoProxy gives a wrong answer about a campaign and properties implement incorrectly | High | Medium | Marketing manager reviews and approves all auto-generated Q&A before activation. Unknown questions route to marketing, not auto-answered. Campaign Q&A has explicit "I don't know" responses for edge cases. Quick-kill switch to disable campaign auto-response. |
| **Escalation chain gaming** -- staff learn that escalating to a higher level gets faster responses and bypass lower levels | Medium | Medium | Escalation audit: track escalation frequency per user. Flag users with abnormally high escalation rates. Escalation chain enforced by AutoProxy (cannot skip levels without system override). GM visibility into escalation patterns for their property. |
| **Regional manager information asymmetry** -- AutoProxy resolves issues at property level that the regional manager should have known about | Medium | Medium | Configurable "FYI" threshold: issues above a certain severity are auto-cc'd to the regional manager even if resolved at property level. Weekly summary includes "issues resolved without your involvement" section. Regional manager can adjust the FYI threshold per category. |
| **Autonomous action error at scale** -- AutoProxy makes a wrong autonomous decision that affects multiple properties simultaneously | Critical | Low | Autonomous actions are property-scoped (never cross-property by default). Circuit breaker: if error rate exceeds threshold, all autonomous actions pause globally. Rollback capability within configurable window. Autonomous features require explicit opt-in per property. Gradual rollout: start with a single property, expand over weeks. |

### Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **LLM latency spikes** degrade the real-time experience | High | Medium | Response timeout with graceful fallback ("I'm looking into this -- routing to a team member"). Cache common queries. Pre-compute answers for predictable questions (e.g., daily checkout list). |
| **LLM cost at scale** -- per-message AI processing becomes expensive | Medium | Medium | Tiered processing: simple pattern matching for common queries (no LLM needed), LLM only for complex/novel messages. Batching for non-urgent classification. Cost tracking per property with alerts. |
| **Knowledge base staleness** -- SOPs and policies change but the knowledge base is not updated | High | High | Document expiration dates. Quarterly review reminders. Version tracking with change alerts. Flag answers from documents older than the configured freshness threshold. |
| **Model hallucination** -- AutoProxy generates plausible but incorrect information not grounded in system data | Critical | Medium | All factual responses must cite a specific data source (reservation ID, room record, document section). Responses that cannot cite a source are flagged as "uncertain" and routed to a human. No free-form generation for operational data -- only structured retrieval. |

---

## 8. Non-Goals

The following are explicitly out of scope for AutoProxy:

1. **Guest-facing communication** -- AutoProxy operates internally only. Guest messaging (pre-arrival emails, in-stay chat, post-stay surveys) is a separate product concern. AutoProxy may help staff draft guest communications, but it does not send messages to guests directly.

2. **Replacing human judgment for financial decisions** -- AutoProxy can surface data and recommend, but it never autonomously approves refunds, comps, rate overrides, or payment adjustments. These always require human authorization.

3. **Real-time voice processing** -- AutoProxy processes text messages through the Comms domain. Radio communication, phone calls, and voice memos are out of scope. A future voice-to-text integration could feed into AutoProxy, but that is a separate initiative.

4. **External vendor communication** -- AutoProxy does not communicate with external parties (suppliers, OTAs, travel agents). It operates within the Amos user base.

5. **Performance reviews or HR evaluation** -- AutoProxy tracks operational metrics but does not generate performance assessments or recommend disciplinary action. Compliance monitoring (Phase 4) flags policy violations but does not make employment decisions.

6. **Replacing the Amos UI** -- AutoProxy is a messaging layer, not a replacement for the PMS interface. Staff still use the Amos UI for complex operations (creating reservations, processing payments, managing rates). AutoProxy handles the conversational layer.

7. **Multi-language support (initial release)** -- Phase 1-2 operate in English only. Multi-language support is a Phase 3+ consideration based on deployment needs.

8. **Third-party PMS integration** -- AutoProxy reads data from Amos domains only. It does not integrate with external PMS systems. This is consistent with the Amos product vision of being the single source of truth.

---

## 9. Dependencies

### Internal (Amos Platform)

| Dependency | Required By | Status | Notes |
|------------|-------------|--------|-------|
| **Comms domain (Channel, Message)** | Phase 1 | Complete (Layer 2, Phase 12) | AutoProxy sends/receives through the existing Comms infrastructure |
| **Comms policies and hardening** | Phase 1 | Planned (Layer 3, Phase 11) | Membership-based message authorization must be in place |
| **Tasks domain** | Phase 1 (smart routing) | Complete (Layer 2, Phase 11) | Task creation from AutoProxy-classified messages |
| **Staff domain (schedules)** | Phase 1 (routing to on-duty) | Complete (Layer 2) | Determines who is currently on shift for routing |
| **Reservations domain** | Phase 1 (room status queries) | Complete (Layer 2) | Source data for room/reservation queries |
| **Villas domain** | Phase 1 (room status queries) | Complete (Layer 2) | Source data for room status and housekeeping state |
| **Payments domain** | Phase 1 (folio queries) | Complete (Layer 2) | Source data for billing/payment queries |
| **Identity domain (roles, properties)** | Phase 1 (routing, permissions) | Complete (Layer 2) | User roles determine routing targets and access scope |
| **Layer 3 policies (all domains)** | Phase 1 | Planned (Layer 3) | AutoProxy inherits actor permissions; policies must be enforced |
| **Property knowledge base (new resource)** | Phase 2 | Not started | New resource: PropertyDocument or similar, in a Knowledge domain |
| **Property attributes/tags (new or extended)** | Phase 3 (intelligent broadcast) | Not started | Properties need structured attributes (amenities, type, region) for broadcast targeting |
| **PubSub / real-time messaging** | Phase 1 (low latency delivery) | Not started | AutoProxy responses need real-time delivery, not polling |

### External (Third-Party)

| Dependency | Required By | Notes |
|------------|-------------|-------|
| **LLM API (Claude or equivalent)** | Phase 1 | Message classification, intent detection, response generation. Must support function calling for structured data retrieval. |
| **Embedding model** | Phase 2 (knowledge base) | Document embedding for RAG retrieval. Can be same provider as LLM or separate. |
| **Vector storage** | Phase 2 (knowledge base) | pgvector (Postgres extension) preferred to avoid new infrastructure. Stores document embeddings for semantic search. |
| **Oban (background jobs)** | Phase 1 | Message processing pipeline should be async. Oban is already identified as a Layer 3+ addition. |
| **Phoenix PubSub** | Phase 1 | Real-time message delivery for AutoProxy responses. Already identified for Layer 2 Phase 13. |

### Organizational

| Dependency | Required By | Notes |
|------------|-------------|-------|
| **Pilot property selection** | Phase 1 | Need one property willing to trial AutoProxy with real operations for 4 weeks |
| **Executive sponsor** | Phase 3 | Corporate features need C-suite buy-in and willingness to use the digest system |
| **Knowledge base content** | Phase 2 | Properties need to provide SOPs, house rules, and policies for initial knowledge base seeding |
| **Escalation chain definition** | Phase 2 | Organization must define its escalation hierarchy (who reports to whom, per category) |
| **Campaign brief templates** | Phase 3 | Marketing must standardize campaign brief format for AutoProxy ingestion |

---

## 10. Prioritization (RICE Scoring)

Scoring criteria:
- **Reach**: Number of users impacted per quarter (Low = <20, Medium = 20-100, High = 100-500, Very High = 500+)
- **Impact**: Business value (0.25 = minimal, 0.5 = low, 1 = medium, 2 = high, 3 = massive)
- **Confidence**: Estimate certainty (100% = high, 80% = medium, 50% = low)
- **Effort**: Person-months to build

### Phase 1 Features

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|---------|-------|--------|------------|--------|------------|----------|
| Message classification engine | Very High (500) | 3 | 80% | 3 | 400 | 1 |
| Direct question answering | High (200) | 3 | 80% | 2 | 240 | 2 |
| Confidence scoring | Very High (500) | 2 | 90% | 1 | 900 | 3 (foundational) |
| Context enrichment | High (200) | 2 | 70% | 2 | 140 | 4 |
| Smart routing | High (200) | 2 | 60% | 3 | 80 | 5 |
| DND / focus mode | Medium (50) | 1 | 90% | 0.5 | 90 | 6 |

### Phase 2 Features

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|---------|-------|--------|------------|--------|------------|----------|
| Response quality tracking | Very High (500) | 2 | 90% | 1 | 900 | 1 |
| Response approval workflow | High (200) | 2 | 80% | 1.5 | 213 | 2 |
| Property knowledge base | High (200) | 3 | 70% | 3 | 140 | 3 |
| Escalation chain config | High (300) | 2 | 80% | 2 | 240 | 4 |
| Cross-property question detection | Medium (80) | 3 | 50% | 3 | 40 | 5 |
| Shift handoff summaries | High (200) | 1 | 80% | 1 | 160 | 6 |

### Phase 3 Features

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|---------|-------|--------|------------|--------|------------|----------|
| Executive digest | Low (10) | 3 | 80% | 2 | 12 | 1 (strategic) |
| Report triage | Low (15) | 3 | 70% | 2 | 16 | 2 |
| Campaign Q&A automation | Medium (30) | 3 | 60% | 3 | 18 | 3 |
| Intelligent broadcast | Medium (50) | 2 | 70% | 2 | 35 | 4 |
| Cross-property intelligence | Medium (80) | 2 | 50% | 4 | 20 | 5 |
| Predictive routing | High (300) | 1 | 50% | 3 | 50 | 6 |
| Data request smart routing | Medium (30) | 1 | 60% | 2 | 9 | 7 |

**Note on Phase 3 scoring**: Executive and corporate features have low Reach (few users) but disproportionately high strategic value. The executives making purchasing/renewal decisions are the users of these features. RICE scores alone underweight these; the "strategic" tag indicates features prioritized above their raw score for business reasons.

### Phase 4 Features

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|---------|-------|--------|------------|--------|------------|----------|
| Proactive issue detection | High (200) | 3 | 60% | 3 | 120 | 1 |
| Autonomous task execution | High (300) | 3 | 50% | 4 | 113 | 2 |
| Executive decision support | Low (10) | 3 | 50% | 3 | 5 | 3 (strategic) |
| Policy compliance monitoring | Medium (30) | 2 | 60% | 2 | 18 | 4 |
| Meeting replacement (interactive digest) | Medium (20) | 2 | 50% | 3 | 7 | 5 |
| Onboarding automation | Medium (30) | 1 | 50% | 2 | 8 | 6 |

### Overall Priority Stack (Top 10 across all phases)

| Rank | Feature | Phase | Rationale |
|------|---------|-------|-----------|
| 1 | Message classification engine | 1 | Everything depends on this. No classification, no routing, no auto-response. |
| 2 | Confidence scoring and threshold | 1 | Safety net. Without this, wrong answers erode trust permanently. |
| 3 | Direct question answering | 1 | The "magic moment" -- the first time a housekeeper gets an instant answer. Proves the concept. |
| 4 | Response quality tracking | 2 | Cannot improve what you cannot measure. Enables the entire learning loop. |
| 5 | Response approval workflow | 2 | Human-in-the-loop for edge cases. Builds trust and generates training data simultaneously. |
| 6 | Escalation chain configuration | 2 | Unlocks the vertical scaling thesis -- resolving at the lowest level possible. |
| 7 | Property knowledge base | 2 | Dramatically expands what AutoProxy can answer without system data (SOPs, policies, procedures). |
| 8 | Executive digest | 3 | Strategic: the person writing checks sees direct value. Low reach but maximum influence on product adoption. |
| 9 | Campaign Q&A automation | 3 | Highest-ROI corporate feature. One upload eliminates hundreds of redundant conversations. |
| 10 | Proactive issue detection | 4 | Shifts AutoProxy from reactive to proactive. The moment it catches a problem before a human reports it, trust is cemented. |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **AutoProxy** | The AI message proxy layer described in this PRD |
| **Shoulder-tapping** | The act of interrupting someone to ask a question or make a request that could have been resolved through information already available in the system |
| **Confidence score** | A 0.0-1.0 rating of how certain AutoProxy is in its response, based on data availability and query clarity |
| **Campaign knowledge base** | A temporary, scoped knowledge base generated from a campaign brief, active for the campaign's duration |
| **Property knowledge base** | A permanent, property-scoped collection of SOPs, policies, and procedures that AutoProxy can reference |
| **Executive digest** | An AI-generated summary of cross-property operations, delivered on a schedule, highlighting exceptions and decisions needed |
| **Escalation chain** | A defined hierarchy of message routing: property staff, department head, GM, regional manager, executive |
| **Circuit breaker** | An automatic safety mechanism that pauses autonomous actions when error rates exceed a threshold |
| **Shadow mode** | A validation period where AutoProxy's outputs are shown alongside traditional methods, allowing users to build trust before relying on them exclusively |

## Appendix B: Relationship to Amos Architecture

AutoProxy is not a separate system. It is a layer within Amos that leverages the existing domain model:

```
                          +------------------+
                          |    AutoProxy     |
                          |  (Intelligence)  |
                          +--------+---------+
                                   |
                    Reads from / Writes to
                                   |
          +------------------------+------------------------+
          |          |          |          |          |      |
     +----+---+ +---+----+ +--+---+ +----+---+ +---+----+  |
     | Comms  | | Tasks  | | Res. | | Staff | | Villas |  ...
     +--------+ +--------+ +------+ +--------+ +--------+
```

- **Comms**: AutoProxy's communication channel. All messages flow through Channel/Message.
- **Tasks**: AutoProxy creates, assigns, and monitors tasks.
- **Reservations**: Source data for room status, guest, and booking queries.
- **Staff**: Source data for routing (who is on duty) and scheduling.
- **Villas**: Source data for room status and housekeeping state.
- **Payments**: Source data for folio and billing queries.
- **Identity**: Source data for user roles, properties, and permissions.
- **Catalog**: Source data for rate and pricing queries.

AutoProxy inherits the actor model. When it takes action on behalf of a user, it operates within that user's permission scope. It cannot see or modify data the user cannot access. This is enforced by the Ash policy layer, not by AutoProxy's own logic.
