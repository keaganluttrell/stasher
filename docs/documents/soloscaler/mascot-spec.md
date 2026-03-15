---
title: "Soloscaler Mascot Specification — Stack"
description: "Production specification for Stack, the Soloscaler brand mascot: a self-multiplying geometric sprite embodying the soloscaler thesis"
date: 2026-03-15
group: documents/soloscaler
type: doc
id: "documents/soloscaler/mascot-spec"
links:
  - "20260314-skilled-ally-personality"
  - "20260314-solos-operating-system"
  - "20260314-autoproxy-attention-shield"
  - "20260314-tagline-unfair-advantage"
  - "20260314-core-values-system"
  - "20260314-brand-voice-principles"
  - "_map-soloscaler"
source: ""
created_by: agent
---

# Soloscaler Mascot Specification

**Version**: 1.0
**Status**: Ready for illustrator and motion design handoff

---

## 1. Character Overview

**Name**: Stack

**One-paragraph description**: Stack is a compact, rounded geometric sprite whose signature visual mechanic is self-multiplication. When working, Stack splits into trailing echo copies of itself at decreasing opacity -- one becomes many, dispatching to handle tasks in parallel, then reconverging into a single form. The echoes are not sidekicks or companions; they are Stack, distributed. This is the Soloscaler thesis made visible: one person, armed with the right systems, delivering what used to require a team. At rest, Stack is nearly invisible -- a calm, minimal presence that stays out of your way. In action, it multiplies with quiet confidence, handles what needs handling, and reports back without fanfare.

**Brand connection**: Stack is the mascot for Soloscaler and its platform [[20260314-solos-operating-system|SolOS]]. The multiplication mechanic maps directly to every product in the portfolio. When [[20260314-autoproxy-attention-shield|AutoProxy]] dispatches an AI response, an echo flies out. When Stacker processes parallel tasks, echoes work simultaneously. The mascot does not decorate the product -- it explains it. The name "Stack" also nods to Stacker (the command center product) and to the idea of stacking leverage. Stack embodies the brand personality of [[20260314-skilled-ally-personality|The Skilled Ally]]: direct, pragmatic, confident, generous, and sharp.

---

## 2. Visual Design Spec

### Base Form

Stack's body is a **rounded rectangle (squircle)** with a corner radius of approximately 30-35% of the shorter dimension. Not a circle (too generic), not a sharp rectangle (too corporate). The squircle reads as friendly, modern, and geometric without being childish.

**Proportions**:
- Body aspect ratio: approximately 1:1.15 (slightly taller than wide)
- Head-to-body: The character is all body. No distinct head. The face sits in the upper third of the form.
- Limbs: Small, simple. Two stubby arms (rounded rectangles, no hands). Two small legs or a flat base. Limbs are optional at sizes below 64px.

**Face**:
- Two dot eyes, horizontally centered in the upper third of the body
- Eye spacing: approximately 35% of body width, center to center
- Eyes are solid fills, not outlined. Default color: Electric Indigo accent
- No mouth at rest. A small arc or line appears only during specific expressive states (dry humor, error acknowledgment)
- No eyebrows, nose, ears, or other features. Simplicity is non-negotiable.

**Abstraction level**: Stack sits between Bugdroid (Android) and Duo (Duolingo) on the abstraction spectrum. More geometric and minimal than Duo, but with more personality than Bugdroid. The character should feel like it was designed in Figma, not drawn in Procreate. No texture, no gradients on the body fill, no realistic rendering. Flat color with optional subtle shading (one tone darker on the bottom 30% of the body).

**SVG target**: The base character (no echoes, no limbs) must fit in a single SVG path under 2KB. This is a hard constraint.

### The Echo System

The echo mechanic is Stack's defining visual feature. Rules:

- Echoes are identical copies of the base form (same shape, same proportions)
- Echoes appear behind and/or beside the primary Stack, offset by 8-16% of the body width per echo
- Default offset direction: trailing to the upper-right (suggesting forward motion to the lower-left)

**Echo opacity levels** (from the primary outward):
- Primary Stack: 100% opacity
- Echo 1: 70% opacity
- Echo 2: 40% opacity
- Echo 3: 20% opacity
- Echo 4 (maximum, used sparingly): 10% opacity

**Echo count by context**:
- Default/marketing: 2-3 echoes
- Active work state: 3-4 echoes (echoes dispatching)
- Peak activity/celebration: up to 5 echoes
- Rest/idle: 0-1 echoes (Stack is alone or has one faint shadow)
- Favicon/smallest sizes: 0 echoes (silhouette only)

### Distinguishing Features at a Glance

A person who has never seen Stack before should be able to describe it in one sentence: "A rounded shape that multiplies into fading copies of itself." If someone describes it differently, the design has drifted.

---

## 3. Color System

### Primary Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Body fill | Amber | `#F59E0B` | Primary Stack body, brand primary |
| Body shade | Deep Amber | `#D97706` | Bottom 30% shading, depth, pressed states |
| Highlight | Light Gold | `#FCD34D` | Top edge highlight, echo glow, hover states |
| Eyes / Accent | Electric Indigo | `#6366F1` | Eyes, interactive elements, tech-credibility accent |
| Accent Dark | Deep Indigo | `#4F46E5` | Accent pressed states, emphasis |
| Accent Light | Soft Indigo | `#A5B4FC` | Accent hover, secondary UI elements |

### Echo Opacity Tokens

| Echo | Light bg | Dark bg | CSS |
|------|----------|---------|-----|
| Echo 1 | `#F59E0BB3` | `#FCD34DB3` | `opacity: 0.7` |
| Echo 2 | `#F59E0B66` | `#FCD34D66` | `opacity: 0.4` |
| Echo 3 | `#F59E0B33` | `#FCD34D33` | `opacity: 0.2` |
| Echo 4 | `#F59E0B1A` | `#FCD34D1A` | `opacity: 0.1` |

On dark backgrounds, echoes use Light Gold (`#FCD34D`) as their base rather than Amber, so they read as luminous rather than muddy.

### Light Mode vs. Dark Mode

**Light mode** (default): Amber body, Electric Indigo eyes, optional Charcoal outline on complex backgrounds. **Dark mode**: Amber body (unchanged), Soft Indigo eyes for contrast, Light Gold echoes for luminous effect.

### Palette Rationale

Amber/gold connects directly to Sol/SolOS (sun imagery) and conveys warmth, energy, and approachability. It is critically underused in tech mascots. Electric Indigo provides necessary contrast and tech credibility. The amber-indigo combination is uncommon in tech branding, making Stack instantly distinguishable. This supports the [[20260314-tagline-unfair-advantage|"One person. Unfair advantage."]] positioning.

### Accessibility

All foreground-background combinations meet WCAG AA contrast (3:1 for graphics, 4.5:1 for text). Known weakness: Amber on pure white is 2.1:1 -- use 1px Charcoal outline or light gray surface as mitigation.

---

## 4. Personality Profile

### Core Traits

Stack's personality mirrors [[20260314-skilled-ally-personality|The Skilled Ally]] archetype and the [[20260314-core-values-system|five core values]]:

**Calm competence**: Radiates the composure of a professional bodyguard. Never panics, never rushes. When the inbox is on fire, Stack's expression does not change.

**Dry humor**: The humor lives in accompanying copy, not exaggerated expressions. "I handled the three things that didn't need you. Here's the one that does."

**Slight mischief**: Quiet satisfaction in catching an interruption before it reaches you. Not malicious -- like a chess player who saw the move three steps ahead.

**Transparency**: Always shows its work. The echoes are visible. The blocked messages are logged. Operates with Radical Honesty.

**Self-effacing**: Does not seek attention. During flow state, becomes nearly invisible. The user is the hero. Stack is the ally.

### Voice (in accompanying copy)

Consistent with [[20260314-brand-voice-principles|brand voice principles]]:

- "Blocked 12 interruptions today. You're welcome for that 47 minutes back."
- "That one needed you. The other nine didn't."
- "Focus mode: on. I've got the perimeter."
- "Streak broken. Deep work doesn't need a streak to matter."

### Do's and Don'ts

**Do**: Show proactive competence, minimal expressive gestures, opinions about interruptions, gracious failure handling, deadpan escalation for repeat offenders.

**Don't**: Make Stack cute for cute's sake, give it anxiety or overwhelm, let it be mean to the user, make it beg for attention, create backstory/lore, show excessive celebration.

---

## 5. Animation System

### Global Principles

- **Easing**: Custom cubic-bezier curves only. Standard: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`. Snap: `cubic-bezier(0.68, -0.55, 0.27, 1.55)`. Breathe: `cubic-bezier(0.37, 0, 0.63, 1)`.
- **Timing**: Fast when acting (150-300ms), slow when resting (3000-4000ms).
- **Anticipation**: Every significant movement begins with a subtle counter-motion (50-80ms).
- **Reduced motion**: All animations degrade to opacity transitions (150ms) when `prefers-reduced-motion: reduce` is active.

### Animation States

1. **Idle** — Gentle breathing pulse, 2-3px vertical bob, occasional blink every 4-6s. 0-1 echoes.
2. **Working (Echo Dispatch)** — Echoes emerge, fan out to tasks, work independently, reconverge with merge snap. The signature animation.
3. **Blocking** — Three tiers proportional to message insignificance. Tier 1 (junk): casual echo flick, 150ms. Tier 2 (low-signal): turn + echo intercept, 400ms. Tier 3 (borderline): full assessment + deliberate handling, 600ms.
4. **Letting Through** — Eyes widen, assess, step aside with presenting gesture. "This one's for you."
5. **Success** — The Wink (200ms), The Nod (350ms), or The Merge Snap (200ms). Never confetti or fireworks.
6. **Error** — Turns to face user directly. Eye contact. Subtle tilt. "Boss, you're going to want to handle this one."
7. **Focus Mode** — The one dramatic animation. Gather echoes, charge glow, pulse shockwave, then settle to 60% opacity with perimeter echoes.
8. **Loading** — Echoes dispatch and return in a loop (1800ms). 2-3 echoes on staggered paths.

---

## 6. Signature Moments

### 6.1 Daily Recap with Attitude
End-of-day summary with personality copy. Stack appears with echoes in a row, dissolving as stats present.

### 6.2 Repeat Offender Reactions
Escalating deadpan: normal → eyes narrow → handles without looking → sighs.

### 6.3 Streak System
Visual rings accumulate over consecutive focus days. Gracious reset: "Streaks reset. Deep work doesn't."

### 6.4 Anniversary Hat
Tiny, slightly crooked party hat. Business as usual otherwise. The contrast is the joke.

### 6.5 Year-End Review
Absurd time-saved comparisons. Echoes build bar charts.

### 6.6 Fourth Wall Break
Once a month max: Stack slowly turns to camera, blinks once, turns back. No notification. Subtle enough to question.

---

## 7. Design System Sizes

| Size | Renders as | Echoes | Format |
|------|-----------|--------|--------|
| 16px (favicon) | Silhouette only | None | SVG + ICO |
| 32px (notification) | Body + eyes | 0-1 | SVG + PNG |
| 48-64px (avatar) | Full character + arms | 1-2 | SVG + Lottie |
| 64-128px (in-product) | Full with all details | 2-3 | SVG + Lottie |
| 256px+ (hero) | Environmental context | 3-5 | SVG + PNG/WebP + Lottie |
| Variable (loading) | Loading loop | 2-3 | Lottie + CSS fallback |
| Variable (watermark) | Silhouette at 10-15% opacity | None | SVG |

---

## 8. Usage Guidelines

- Maintain echo mechanic at 32px+
- Minimum clear space: 1x body width on all sides (0.5x below 48px)
- Stack faces left by default (toward content it protects)
- Never on backgrounds matching Amber
- Never below 16px (use wordmark or Sol icon)
- Never in contexts contradicting brand values
- All implementations require reduced-motion fallback
- SVG mandatory where supported

---

## 9. Implementation Roadmap

| Phase | Weeks | Deliverables | Who |
|-------|-------|-------------|-----|
| 1: Character Design | 1-3 | Design sheet, construction grid, 5 key poses, size test | Illustrator |
| 2: Static Assets | 3-5 | All SVG sizes, favicon package, social avatars, watermarks | Production designer |
| 3: Animation System | 5-8 | Lottie files for 8 states, CSS fallbacks, reduced-motion variants | Motion designer |
| 4: Product Integration | 8-12 | SolOS/AutoProxy/marketing integration, component library | Frontend developer |
| 5: Personality Features | 12-16 | Recaps, streaks, easter eggs, 50+ copy lines | Frontend + copywriter |

---

## Appendix: Stack vs. Sol

Stack is the brand mascot. Sol (sun/signal motif) is the system icon. They share the amber/gold color system but never compete for the same visual space. Stack lives inside Sol's world -- if Sol is the sun, Stack draws its energy from it.

## Appendix: Competitive Differentiation

No major tech mascot uses multiplication/echoing as its visual device. Stack occupies a unique conceptual and visual space, distinct from GitHub's Octocat (creature-driven), Duolingo's Duo (expression-driven), and Android's Bugdroid (minimal geometry without narrative depth).

## Appendix: Technical Constraints

| Constraint | Value |
|------------|-------|
| Base SVG file size | Under 2KB |
| Minimum render size | 16px |
| Maximum echo count | 5 |
| Action animation | 150-300ms |
| Idle animation | 3000-4000ms |
| WCAG contrast | 3:1 graphics, 4.5:1 text |
| Reduced motion | Required for all states |
| Lottie frame rate | 30fps target, 60fps max |
