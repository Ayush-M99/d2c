# ChatSpaces — Design Brief for Claude Design

## Context
Backend (Steps 1-6) is complete: Express + Socket.IO gateway, 5 services, Redis/Postgres/Kafka. Frontend hasn't been built yet. Before writing UI code, we need polished design mockups. Flutter mobile is too risky right now — we're going **web-first** (PWA → mobile-app later). This file is a self-contained prompt that can be pasted into Claude (or any design AI / human designer) to produce high-fidelity mockups.

The intended outcome: a complete visual design system + screen mockups for ChatSpaces that the engineering team can implement faithfully.

---

# 🎨 DESIGN BRIEF: ChatSpaces

> **Paste everything below into Claude Design / Figma AI / your designer.**

---

## 1. Product

**ChatSpaces** is a proximity-based, anonymous, real-time chat platform.

You open the app → see a live map of where people are chatting nearby → drop into a "GeoSpace" (a 50m or 200m radius zone) → discover threads happening right around you → join, get a random anonymous name, talk in real time, leave. Nothing persists. No accounts. No identity.

Think **Yik Yak × Snap Map × Discord**, but anonymous, ephemeral, hyper-local.

### Star Features
- 🗺️ **Live map of hotspots** (where conversations are happening near you)
- 💬 **Seamless threads** (Hot Now / For You / Search)
- 💎 **Premium DMs** (gold-accented, paid feature)
- 👁️ **View-once images** (with cinematic reveal animation)
- 🌓 **Dark/light mode** (auto-switches with local sunrise/sunset)
- 🌍 **Time-aware map** (map style follows user's local time of day)

### Audience
Urban users 18-30, second/third-tier Indian cities + global. Privacy-first crowd. Reads The Verge. Uses Linear, Arc, Telegram. Does **not** want another Instagram clone.

---

## 2. Brand

| | |
|---|---|
| **Name** | ChatSpaces |
| **Tagline** | "Talk to your block." |
| **Personality** | Modern, quiet, mysterious, premium. Not childish. Not corporate. |
| **Voice** | Confident, terse, never shouty. Lowercase microcopy. |
| **References** | Linear, Arc Browser, Things 3, Apple Maps, Snap Map |

Avoid: gradients-as-decoration, drop-shadow-heavy "neumorphism", corporate stock illustrations, mascots, emoji overload.

---

## 3. Visual System

### 3.1 Color Tokens

**Dark Mode (default)**
| Token | Hex | Use |
|---|---|---|
| `surface/deep` | `#08080F` | App background |
| `surface/elevated` | `#14141F` | Cards, sheets |
| `surface/overlay` | `#1F1F2E` | Modals, popovers |
| `border/subtle` | `#2A2A3D` | Dividers, card borders |
| `primary` | `#6366F1` | Indigo — CTAs, links |
| `primary/glow` | `#818CF8` | 30% alpha for halos |
| `accent` | `#22D3EE` | Cyan — highlights |
| `premium` | `#F59E0B` | Gold — DM-only |
| `danger` | `#EF4444` | Errors, hot pins |
| `success` | `#10B981` | Confirmations |
| `text/primary` | `#F1F5F9` | Main copy |
| `text/secondary` | `#94A3B8` | Meta, labels |
| `text/muted` | `#64748B` | Timestamps |

**Light Mode**
| Token | Hex |
|---|---|
| `surface/deep` | `#FAFBFC` |
| `surface/elevated` | `#FFFFFF` |
| `surface/overlay` | `#F1F5F9` |
| `border/subtle` | `#E2E8F0` |
| `primary` | `#4F46E5` |
| `accent` | `#0891B2` |
| `premium` | `#D97706` |
| `danger` | `#DC2626` |
| `text/primary` | `#0F172A` |
| `text/secondary` | `#475569` |
| `text/muted` | `#94A3B8` |

### 3.2 Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display | Geist Sans | 600-700 | 28-56px |
| UI / Body | Inter | 400-500 | 14-20px |
| Mono | JetBrains Mono | 400 | 12-14px |
| Display tracking | -2% (tight) | | |
| Body tracking | 0 | | |

**Type scale**: 12 · 14 · 16 · 20 · 28 · 40 · 56

### 3.3 Spacing (8pt grid)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

### 3.4 Radius
- `radius/sm` = 6px (pills, badges)
- `radius/md` = 12px (cards, inputs)
- `radius/lg` = 24px (modals, sheets)
- `radius/full` = 9999px (avatars, FAB)

### 3.5 Elevation
- `shadow/soft` = `0 4px 20px rgba(0,0,0,0.08)`
- `shadow/lift` = `0 12px 40px rgba(0,0,0,0.12)`
- `glow/primary` = `0 0 40px rgba(99,102,241,0.25)`
- `glow/premium` = `0 0 60px rgba(245,158,11,0.30)`

### 3.6 Iconography
- Lucide Icons (1.5px stroke, 20px default, 24px in nav)
- All icons monochrome — they take their color from text token

---

## 4. The Map (Hero Component)

The map is the single most important UI element. It's the home screen.

### Map Tech
- Mapbox GL JS (or MapLibre fork) with **custom style JSON**
- Two style files needed: `chatspaces-dark.json` and `chatspaces-light.json`

### Time-Aware Theming
- App reads user's IANA timezone + current hour
- Calculate local sunrise/sunset (use `suncalc` lib)
- Before sunrise / after sunset → dark map + dark UI
- After sunrise / before sunset → light map + light UI
- **Transition**: 30-minute fade window at sunrise/sunset (interpolate map paint properties)
- User override: Settings → Theme → `Auto / Light / Dark`

### Map Style Specifics

**Dark map**
- Land: `#08080F` (matches app surface)
- Water: `#0E1A2B`
- Roads (primary): `#1F1F2E`
- Roads (secondary): `#14141F`
- Labels: `#94A3B8`, font Inter Medium, halo `#08080F`
- POI labels hidden (too noisy for chat app)

**Light map**
- Land: `#FAFBFC`
- Water: `#DBEAFE`
- Roads (primary): `#E2E8F0`
- Roads (secondary): `#F1F5F9`
- Labels: `#475569`, halo `#FFFFFF`

### Hotspot Pins
- Each GeoSpace with active users renders as a **pulsing pin**
- Center dot: 12px, color = activity intensity
  - 1-5 users → `accent` (cyan)
  - 6-20 → `primary` (indigo)
  - 21+ → `danger` (red, "🔥 hot")
- 3 concentric rings expanding outward, 0% → 200% scale, opacity 0.6 → 0, 2.5s loop, staggered 0.5s
- Label below pin: `"☕ 12"` (emoji from venue category + count)
- Tap → camera flies in (smooth 600ms easeOutQuart) + bottom sheet auto-expands with that GeoSpace's threads

### "You Are Here" Pin
- Filled circle, 16px, primary color
- Outer breathing ring (1.5x scale, 2s ease-in-out loop)
- White inner dot 4px

---

## 5. Screens

> Generate **mobile mockups first** (375 × 812 iPhone). Tablet & desktop variants secondary.
> For each screen, produce **dark mode AND light mode**.

### Screen 1 — Onboarding (3 slides, swipeable)
Edge-to-edge. Subtle particle field background (R3F).
- **Slide 1**: Animated mini-map with 3 pulsing dots → Headline "find your block" + sub "see who's chatting nearby"
- **Slide 2**: Anonymous geometric avatar revealing → "no name. no history."
- **Slide 3**: Big "Enable location" button (primary) + small "Peek without location" link → "tap. talk. go."
- Pagination dots bottom-center
- "Skip" link top-right (text/muted)

### Screen 2 — Map Home (HERO)
```
┌─────────────────────────────┐
│ ☰    chatspaces        👤   │  ← top bar (translucent blur)
├─────────────────────────────┤
│                             │
│         . .                 │
│       ⊙ ☕12 ⊙              │
│                             │
│            ⌖                │  ← MAP fills 60% viewport
│           YOU               │
│                             │
│       ⊙ 🍺5 ⊙               │
│                             │
├─────────────────────────────┤
│ ▔▔▔ drag handle ▔▔▔         │  ← collapsed bottom sheet
│ around you · 47 chatting    │
│ [🔥 hot]  [✨ for you]      │
│ ┌──────────────────────┐    │
│ │ "Anyone at the cafe?"│    │
│ │ #cafe · 8 active     │    │
│ └──────────────────────┘    │
│                             │
│                       (+)   │  ← FAB: new thread
└─────────────────────────────┘
```
- Top bar: glass blur, 56px tall, slim divider below
- Bottom sheet has 3 snap points: collapsed (120px), half (50%), full (90%)
- FAB bottom-right, 56px, primary bg + shadow + glow on hover
- Map gestures: pan, pinch zoom, double-tap zoom-in, two-finger zoom-out

### Screen 3 — GeoSpace Threads (bottom sheet expanded / full)
- Tab pills at top: `🔥 Hot` / `✨ For You` / `🔍 Search`
- Search tab reveals input field below pills
- **Thread Card** (repeating element):
  - Title (16px, semibold)
  - Tag chips below title (small, primary tinted)
  - Avatar stack (3 avatars max, then "+N") right side
  - Last message preview (italic, text/secondary, 1 line truncate)
  - Activity row: `"8 active · 2m ago"` (mono font, text/muted)
  - Card padding: 16px
  - Card spacing: 12px between cards
  - Hover: subtle lift + border glow
  - Press: scale 0.98
- Cards stagger-fade in (50ms delay each, 200ms duration)

### Screen 4 — Thread View (Chat)
```
┌─────────────────────────────┐
│ ←  Anyone at the cafe? ⋯  │  ← header
│    ☕ · 8 active            │
├─────────────────────────────┤
│  Brave Otter                │
│  ┌──────────────────────┐   │
│  │ yo who's downstairs? │   │ ← left bubbles
│  └──────────────────────┘   │
│                       2:43p │
│                             │
│                  Quiet Wolf │
│      ┌──────────────────┐   │
│      │ me, table near   │   │ ← right bubbles (you)
│      │ the window       │   │
│      └──────────────────┘   │
│                       2:44p │
│                             │
│  · · ·                      │ ← typing indicator
├─────────────────────────────┤
│ 📎 [type a message…]    ➤  │ ← composer
└─────────────────────────────┘
```
- Bubbles: left = surface/elevated, right = primary @ subtle alpha
- Display name above each bubble (small, color-coded by hash of name)
- Timestamps appear on hover (desktop) or long-press (mobile)
- Reply: long-press bubble → quote-reply UI inline
- Image attachments: rendered as **blurred preview tile** with `👁 view once` label overlay
- System messages (`Brave Otter joined`): inline center, text/muted, 12px
- Composer: rounded `radius/lg`, surface/overlay bg, expanding to max 5 lines, send button morphs from disabled gray to primary when text exists

### Screen 5 — View-Once Image Reveal ⭐ (signature moment)
1. Tap blurred image tile in chat
2. Full-screen takeover with **GSAP origami unfold** animation:
   - Image starts as folded paper (4 panels)
   - Unfolds in sequence (top, right, bottom, left), 800ms total, easeOutBack
3. 8-second countdown ring animates around top edge of image (stroke-dashoffset)
4. Subtle "screenshot disabled" indicator (pill, text/muted) top-center
5. After 8s OR tap-to-dismiss:
   - Image **dissolves into particles** using Three.js shader (each pixel becomes a particle, drifts up + fades)
   - 1.2s duration, easeInQuart
6. Returns to chat, server gets `view_confirmed` event
7. In chat, the tile updates to show `👁 viewed` (text/muted, no image preview anymore)

### Screen 6 — DM (Premium Feature)
**DM List**
- Header: `Direct Messages` + `💎 PRO` badge
- Each conversation card has 4px **gold left border**
- Conversation card: avatar + display name + last message preview + time
- Empty state: gold gradient illustration + "Connect privately. Upgrade to unlock DMs" CTA

**DM Chat**
- Same layout as thread chat BUT:
  - Header has subtle gold gradient stripe at bottom edge
  - Bubbles tinted slightly warmer
  - Premium badge in header

**Locked State (free user)**
- Blurred preview of DM list
- Center modal: gold gradient, "Premium" headline, feature bullets, gold CTA button "Upgrade — ₹99/mo"

### Screen 7 — Create Thread (Bottom Sheet)
Slides up from bottom, 75% viewport height, drag handle on top.
- Section 1: Title input (autoFocus, large 20px text, char counter `0/120` bottom-right)
- Section 2: "What kind?" — 4 icon buttons in row:
  - 💬 Text · 📊 Poll · ❓ Q&A · ⏱️ Countdown
  - Selected has primary bg + filled icon
- Section 3: Tags — input with autocomplete, selected tags appear as removable chips
- Section 4 (conditional, poll): "Options" — list of inputs, "+ add option" link
- Bottom: "Create thread" button (full width, primary), disabled until valid
- **Dedup conflict**: if backend returns similar threads, slide-in card above the create button:
  - Header: "Similar threads exist:"
  - 2-3 thread cards, each with "Join instead" CTA
  - "Create anyway" link below

### Screen 8 — Profile / Settings
- Top: anonymous avatar (geometric SVG, deterministic from session hash) + "Anonymous" label + session ID truncated mono
- "Display names you've used" section: collapsible list (Brave Otter in #cafe-thread, Quiet Wolf in #poll-thread, etc.)
- Settings list (icon + label + value/chevron):
  - 🎨 Theme — segmented control: `Auto / Light / Dark`
  - 🏷️ Interests — comma list of tags, edit icon
  - 👯 Paired friends — `2 / 5` + chevron
  - 🔒 Privacy
  - ℹ️ About
  - 🚪 Reset session (danger color)
- Bottom: premium upsell card (gold gradient, "Unlock DMs and more" + CTA)

### Screen 9 — Pair Code (Friend Connect)
Tabs: `Show code` / `Enter code`

**Show**
- Big 6-digit number, JetBrains Mono, 56px, letter-spacing 0.2em
- Countdown ring around the number (5 min TTL)
- "Share this code" subtitle
- Copy button below

**Enter**
- 6 OTP-style boxes, 48x56 each, mono font 32px
- Auto-advance on type, auto-submit on completion
- Success: green check + "Friend added 🎉" + GSAP confetti burst
- Error: red shake animation

---

## 6. Component Library

Generate a single **Components Sheet** showing all of these in one view (light + dark).

### Buttons
- Primary (solid indigo, white text, lift on hover)
- Secondary (ghost, indigo border, transparent)
- Tertiary (text-only, primary color)
- Premium (gold gradient, white text, gold glow)
- Danger (solid red)
- Icon button (44x44, ghost bg, hover surface/overlay)
- FAB (56x56, solid primary, drop shadow + glow)
- Sizes: sm (32h) / md (40h) / lg (48h)
- States: default · hover · pressed · disabled · loading (spinner)

### Inputs
- Text input (single line)
- Textarea (multi-line, expanding)
- OTP/code input
- Search input (with icon prefix)
- Select / dropdown
- Tag input (chips)
- States: default · focus · filled · error · disabled

### Cards
- Thread card (with all variations)
- DM conversation card (with gold border)
- Settings row card
- Empty state card

### Avatars
- Generated geometric (mandala style, deterministic from hash)
- 24 / 32 / 40 / 56 / 80 sizes
- Stack variant (3 overlapping with `+N`)

### Badges & Pills
- Tag pill (tinted bg)
- Status badge (active / hot / new)
- Premium badge (gold)
- Notification dot (8px red)
- Count badge (e.g. `12`)

### Other
- Bottom sheet (with drag handle)
- Modal (centered, with backdrop)
- Toast (slide in from top, 4 variants: info/success/warn/error)
- Skeleton loader (shimmer)
- Dividers (subtle horizontal line)
- Tab bar pills (segmented)
- Map pin (3 intensity variants)

---

## 7. Animation Spec Sheet

Provide motion specs for these **3 hero moments**:

### A. Landing Entrance (GSAP)
- Particles fade in over 1.2s
- Headline: split into words, each word reveals with `y: 30 → 0`, opacity `0 → 1`, stagger 80ms, ease `power3.out`
- Subline: fades in 400ms after headline
- CTA buttons: spring scale `0.8 → 1` with subtle bounce, 600ms after subline

### B. View-Once Image Reveal (GSAP + Three.js)
- See Screen 5 above
- Provide keyframe diagram (folded → unfolded → countdown → dissolve)

### C. Friend Pair Success (GSAP)
- Check mark draws in (SVG stroke-dashoffset, 400ms)
- Background flashes success green for 200ms
- Confetti particles burst from check center, 30 particles, gravity, 1.5s
- "Friend added!" text fades in below check

### Other reusable animations
- Page transition: 300ms fade + 8px y-translate (Framer Motion)
- Card stagger: 50ms delay per item, 200ms duration
- Bubble enter: 200ms, slide-up 12px + fade
- Modal: 250ms scale `0.95 → 1` + fade, easeOutBack
- Bottom sheet: 350ms spring (stiffness 300, damping 30)

---

## 8. Accessibility

- WCAG **AA** contrast in both themes (verify with checker)
- Min hit target: 44 × 44 px
- Keyboard navigation for ALL interactions (focus rings: 2px primary, 2px offset)
- Reduced-motion: disable particles, GSAP, use `opacity` only transitions
- ARIA labels on all icon-only buttons
- ARIA live regions for new messages (polite)
- Color is never the only signal (also use icon/text)

---

## 9. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| 320 - 767 | Mobile: stacked, bottom-sheet driven |
| 768 - 1023 | Tablet: split (map left 60%, thread panel right 40%) |
| 1024 - 1439 | Desktop: 3-column (sidebar nav 240px · map flex · thread panel 400px) |
| 1440+ | Same as desktop, content max-width 1440px centered |

---

## 10. Deliverables Requested

Please produce:

1. ✅ **Mockups** for all 9 screens, mobile-first, both light + dark = **18 frames**
2. ✅ **Tablet variant** for Screen 2 (Map Home) and Screen 4 (Thread View)
3. ✅ **Desktop variant** for Screen 2 (Map Home)
4. ✅ **Component sheet** (1 frame, dark + 1 frame, light)
5. ✅ **Animation spec doc** with timing diagrams for the 3 hero moments
6. ✅ **Map style JSON** (Mapbox GL) — both `chatspaces-dark.json` and `chatspaces-light.json`
7. ✅ **Style guide PDF** with color tokens, typography, spacing, iconography
8. ✅ **Iconography pack** (custom Lucide overrides if any)

### Tone Guardrails
- ❌ No drop shadows on every element. Use elevation tokens only where meaningful.
- ❌ No rainbow gradients. Premium gold + primary indigo are the only gradients.
- ❌ No mascots, no illustrations of people. Use abstract geometry only.
- ❌ No skeuomorphism (no fake leather, no 3D buttons).
- ✅ Generous whitespace.
- ✅ Lowercase microcopy (`tap. talk. go.`).
- ✅ Mono for anything that's a code, time, or count.
- ✅ Premium = gold accent, sparingly.

---

## End of Brief

Total scope: ~22 frames + 2 JSON files + 1 PDF + 1 doc.

Estimated designer time: 2-3 days for first pass. After approval, frontend implementation per separate engineering plan.

---

# Verification (after design returns)

1. Designs cover all 9 screens × 2 themes = 18 frames minimum
2. Both Mapbox style JSONs are syntactically valid (test in Mapbox Studio)
3. Color tokens in design match the table in §3.1
4. Hit targets verified ≥44px on mobile mockups
5. Reduced-motion alternative documented for the 3 hero animations
6. Component sheet includes all variants listed in §6

Once designs are approved, engineering builds per the previously approved code plan (Vite + React + R3F + GSAP + Framer Motion + Tailwind, see git history of this file).
