---
title: "Comms Domain — Deferred Work"
description: "Deferred real-time and notification features for the Comms domain Phase 13, including PubSub, presence, and member anonymization."
date: 2025-03-14
tags: comms, real-time, pubsub, notifications, phoenix-channels, deferred
group: research
---

# Comms Domain — Deferred Work

## Phase 13: Real-time & Notifications

Phase 12 builds the data model only. Phase 13 adds the real-time layer:

- **Ash.Notifier.PubSub** on Message (publish create/destroy to channel topics)
- **Phoenix Channels** — `UserSocket` (JWT auth), `ChannelChannel` (per-channel topic handler)
- **Phoenix.Presence** — online/offline tracking, typing indicators
- **Unread counts** — module calculation or custom query spanning Message + ChannelMember (`WHERE id > last_read_message_id`)
- **Push notifications** for offline users (may need Oban from Layer 3)
- **Task-Channel auto-creation** wiring (needs Oban)

## Anonymize removed members (not delete chat history)

When a ChannelMember is removed from a channel, their messages should remain but with the sender anonymized (e.g. "Former Member") rather than deleted. This preserves chat history for remaining members while respecting the departed member's removal.

**Current Phase 12 approach:** ChannelMember is hard-deleted. Messages from removed members remain with their original `sender_id` FK. Anonymization logic is deferred.

**Future work:**
- On ChannelMember destroy, anonymize or nullify `sender_id` on that user's messages in the channel
- Or use a soft-reference pattern where the UI resolves "Former Member" when the sender is no longer a channel member
- Consider whether this is a data-layer concern (nullify FK) or a presentation-layer concern (UI checks membership)
