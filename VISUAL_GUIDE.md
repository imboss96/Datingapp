# 🎨 MATCH FEATURE - VISUAL GUIDE & SCREENSHOTS

## 🎯 User Interface Overview

### 1. DISCOVER PAGE (SwiperScreen)

```
┌────────────────────────────────────┐
│  ← lunesa  [Logo]   [Navbar]       │
├────────────────────────────────────┤
│                                    │
│     ┌────────────────────────┐     │
│     │                        │     │
│     │   [Profile Image]      │     │
│     │                        │     │
│     │                        │     │
│     │                        │     │
│     │  ┌──────────────────┐  │     │
│     │  │ Sarah, 28        │  │     │
│     │  │ 💚 75% Match     │  │     │
│     │  │ 📍 New York, NY  │  │     │
│     │  │                  │  │     │
│     │  │ Love photography │  │     │
│     │  │ & travel! Always │  │     │
│     │  │ up for adventure │  │     │
│     │  │                  │  │     │
│     │  │ #Photography     │  │     │
│     │  │ #Travel #Yoga    │  │     │
│     │  │                  │  │     │
│     │  │ [💬 Message]     │  │     │
│     │  └──────────────────┘  │     │
│     │                        │     │
│     └────────────────────────┘     │
│                                    │
│      ⟲        ✗    ⭐    ❤️       │
│    Rewind   Pass  Super  Like     │
│                                    │
└────────────────────────────────────┘
```

### Features on Discover:
- **Profile Card**: Full screen image with overlay
- **Match Score**: Percentage badge (top right)
- **User Info**: Name, age, location
- **Bio**: Preview text
- **Tags**: Interest tags with highlight for matches
- **Action Buttons**: 4 main actions
- **Message Button**: Quick access to chat

---

## 2. MATCH CELEBRATION (MatchModal)

```
┌──────────────────────────────────────────┐
│  🎉 CONFETTI FALLING (animated) 🎉      │
├──────────────────────────────────────────┤
│                                          │
│    ┌────────────────────────────────┐   │
│    │  🌅🎨🌅🎨🌅 GRADIENT 🌅🎨🌅  │   │
│    │                                │   │
│    │          ❤️❤️❤️                │   │
│    │        IT'S A MATCH!            │   │
│    │   You & Sarah like each other!  │   │
│    │                                │   │
│    │  ┌──────────────────────────┐  │   │
│    │  │   [Sarah's Photo]        │  │   │
│    │  │   🎀 with heart badge    │  │   │
│    │  └──────────────────────────┘  │   │
│    │                                │   │
│    │    Sarah, 28                    │   │
│    │    📍 New York                  │   │
│    │                                │   │
│    │    ┌──────────────────────────┐│   │
│    │    │ 🔥 Interest Compatibility││   │
│    │    │        75%                ││   │
│    │    │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░     ││   │
│    │    │ 👍 Great connection!     ││   │
│    │    └──────────────────────────┘│   │
│    │                                │   │
│    │    Common Interests:            │   │
│    │    [#Photography] [#Travel]    │   │
│    │    [#Yoga] +2 more             │   │
│    │                                │   │
│    │    "Love traveling and taking  │   │
│    │     photos of beautiful places"│   │
│    │                                │   │
│    │ [Keep Swiping] [💬 Message Now]│   │
│    │                                │   │
│    │  💬 Send your first message!   │   │
│    │                                │   │
│    └────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

### Features on Match Modal:
- **Celebration**: Animated header with gradient
- **Confetti**: 50 animated pieces falling
- **Profile Photo**: Large centered image with heart badge
- **Match Score**: Visual progress bar
- **Compatibility Text**: Dynamic feedback based on percentage
- **Bio Preview**: Quoted text
- **Common Interests**: Tagged interests
- **Clear CTA**: Two main action buttons

---

## 3. MATCHES LIST (MatchesList)

```
DESKTOP VIEW (3 columns):

┌──────────────────────────────────────────────────────────────┐
│  ❤️ Your Matches (24)                                        │
│  [Most Recent] [Best Match]                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │              │  │              │  │              │      │
│  │[Sarah Photo] │  │ [Alex Photo] │  │[Jamie Photo] │      │
│  │ 🔴 75%       │  │ 🔴 82%       │  │ 🔴 68%       │      │
│  │              │  │              │  │              │      │
│  │ Matched 3h   │  │ Matched 1d   │  │ Matched 2d   │      │
│  │ ago          │  │ ago          │  │ ago          │      │
│  │              │  │              │  │              │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ Sarah, 28    │  │ Alex, 26     │  │ Jamie, 30    │      │
│  │ 📍 New York  │  │ 📍 Brooklyn  │  │ 📍 Manhattan │      │
│  │              │  │              │  │              │      │
│  │ Love travel  │  │ Artist &     │  │ Foodie &     │      │
│  │ and photos.. │  │ creative...  │  │ adventurer.. │      │
│  │              │  │              │  │              │      │
│  │ #Photography │  │ #Art         │  │ #Food        │      │
│  │ #Travel      │  │ #Design      │  │ #Travel      │      │
│  │              │  │              │  │              │      │
│  │ 💬 5 msgs    │  │ 💬 12 msgs   │  │ 💬 0 msgs    │      │
│  │ [Chat] →     │  │ [Chat] →     │  │ [Chat] →     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ... more matches ...                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

MOBILE VIEW (1 column):

┌──────────────────────────┐
│ ❤️ Your Matches (24)     │
│ [Most Recent] [Best]     │
├──────────────────────────┤
│                          │
│ ┌──────────────────────┐ │
│ │   [Sarah Photo]      │ │
│ │   🔴 75%             │ │
│ │   Matched 3h ago     │ │
│ ├──────────────────────┤ │
│ │ Sarah, 28            │ │
│ │ 📍 New York          │ │
│ │                      │ │
│ │ Love travel and...   │ │
│ │                      │ │
│ │ #Photography #Travel │ │
│ │                      │ │
│ │ 💬 5 messages        │ │
│ │ [💬 Chat]           │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │   [Alex Photo]       │ │
│ │   🔴 82%             │ │
│ │   Matched 1d ago     │ │
│ │ ... (similar card)   │ │
│ └──────────────────────┘ │
│                          │
└──────────────────────────┘
```

### Features on Matches List:
- **Header**: Total match count, title
- **Sort Options**: Two buttons for sorting
- **Match Cards**: Grid layout (responsive)
- **Profile Image**: Full card width
- **Match Badge**: Percentage with heart icon
- **User Info**: Name, age, location
- **Bio Preview**: 2-line text preview
- **Common Interests**: Top 3 + count badge
- **Message Count**: Display conversation count
- **Chat Button**: Quick action button

---

## 4. ANIMATIONS & INTERACTIONS

### Double-Tap Animation
```
TAP ONCE                TAP TWICE (within 300ms)
  ↓                              ↓
Hover state            Heart appears at tap point
                               ↓
                        Heart floats upward
                               ↓
                        Heart fades (1 second)
                               ↓
                        Like recorded
```

### Swipe Animation
```
CARD STATE
┌────────────┐
│  Profile   │
│   Card     │  ← ORIGINAL
└────────────┘

SWIPING RIGHT (Like)
┌────────────┐
│  Profile   │→→→  (moving right)
│   Card     │
└────────────┘
                    ┌────────────┐
                    │   Next     │  ← APPEARING
                    │  Profile   │
                    └────────────┘

COMPLETION
                    ┌────────────┐
                    │   Next     │  ← FULLY VISIBLE
                    │  Profile   │
                    └────────────┘
```

### Match Celebration Animation
```
TIMELINE:
0ms   → Modal appears with scale transform
100ms → Confetti starts falling
200ms → Heart emoji bounces
400ms → Profile image bounces
800ms → Background confetti fades
2000ms → Animation loop complete

CONFETTI BEHAVIOR:
- 50 pieces
- Random colors (red, gold, green, blue, pink)
- Fall from top to bottom
- Rotate 360° during fall
- Fade to transparent
- 2-second duration
```

### Button Interactions
```
NORMAL STATE
┌─────────────┐
│   Button    │
└─────────────┘

HOVER STATE
┌─────────────┐
│   Button    │  (slight scale increase)
│  (elevated) │  (shadow increase)
└─────────────┘

ACTIVE/CLICK STATE
┌─────────────┐
│   Button    │  (scale 95%)
│ (pressed)   │  (minimal shadow)
└─────────────┘
```

---

## 5. RESPONSIVE DESIGN

### Breakpoints

```
MOBILE (< 768px)
├─ Full width single card
├─ Portrait orientation
├─ Bottom navigation tabs
├─ Touch-optimized (44px+ targets)
└─ Stack layouts vertically

TABLET (768px - 1024px)
├─ 2 columns in grid view
├─ Landscape/Portrait support
├─ Side navigation optional
└─ Medium-sized cards

DESKTOP (> 1024px)
├─ 3 columns in grid view
├─ Landscape only (typically)
├─ Sticky side navigation
└─ Large cards with hover effects
```

### Example: Match Cards Responsive
```
Mobile (1 col):         Tablet (2 col):         Desktop (3 col):
┌─────┐               ┌─────┐  ┌─────┐         ┌─────┐ ┌─────┐ ┌─────┐
│ 75% │               │ 75% │  │ 82% │         │ 75% │ │ 82% │ │ 68% │
│     │               │     │  │     │         │     │ │     │ │     │
│ [I] │               │ [I] │  │ [I] │         │ [I] │ │ [I] │ │ [I] │
│     │               │     │  │     │         │     │ │     │ │     │
│[Msg]│               │[Msg]│  │[Msg]│         │[Msg]│ │[Msg]│ │[Msg]│
└─────┘               └─────┘  └─────┘         └─────┘ └─────┘ └─────┘
┌─────┐               ┌─────┐  ┌─────┐
│ 82% │               │ 68% │  │ 71% │
│     │               │     │  │     │
│ [I] │               │ [I] │  │ [I] │
│     │               │     │  │     │
│[Msg]│               │[Msg]│  │[Msg]│
└─────┘               └─────┘  └─────┘
```

---

## 6. COLOR SCHEME

```
PRIMARY COLORS:
┌──────────────────────────────────────┐
│ ❤️  Red/Pink Gradient                │
│ From: #FF5454 (Bright Red)           │
│ To: #FF69B4 (Hot Pink)               │
└──────────────────────────────────────┘

ACCENT COLORS:
┌──────────────────────────────────────┐
│ 💚 Green: #10B981 (for Like/Match)   │
│ 💙 Blue: #3B82F6 (for SuperLike)     │
│ 💛 Gold: #FBBF24 (for Premium)       │
│ ❌ Red: #EF4444 (for Pass/Dislike)   │
└──────────────────────────────────────┘

BACKGROUNDS:
┌──────────────────────────────────────┐
│ Primary BG: #FFFFFF (White)          │
│ Secondary BG: #F9F9F9 (Light Gray)   │
│ Hover BG: #F0F8FB (Light Blue-Pink)  │
└──────────────────────────────────────┘

TEXT COLORS:
┌──────────────────────────────────────┐
│ Primary: #213366 (Dark Blue-Gray)    │
│ Secondary: #555555 (Gray)            │
│ Muted: #999999 (Light Gray)          │
│ White: #FFFFFF (Contrast)            │
└──────────────────────────────────────┘
```

---

## 7. TYPOGRAPHY

```
HIERARCHY:
┌─────────────────────────────┐
│ H1: Page Titles             │
│ Font: Bold, 28-32px         │
│ Example: "Your Matches"     │
├─────────────────────────────┤
│ H2: Section Headers         │
│ Font: Semibold, 24px        │
│ Example: "Sarah, 28"        │
├─────────────────────────────┤
│ H3: Card Titles             │
│ Font: Bold, 18px            │
│ Example: Match name         │
├─────────────────────────────┤
│ Body: Regular text          │
│ Font: Regular, 14-16px      │
│ Example: Bio preview        │
├─────────────────────────────┤
│ Small: Labels & hints       │
│ Font: Regular, 12-13px      │
│ Example: "Matched 3h ago"   │
└─────────────────────────────┘
```

---

## 8. ICON USAGE

```
NAVIGATION & ACTIONS:
🏠 Home              📍 Location
❤️ Like/Heart        💬 Message
❌ Pass/Reject       ⭐ Super Like
🔄 Rewind            ♻️ Refresh
🔒 Lock              🔓 Unlock
👤 Profile           ⚙️ Settings
🔥 Fire/Hot          📊 Stats
🎯 Target            💎 Premium
🌟 Star              🎉 Celebration
```

---

## 9. BUTTON STYLES

```
PRIMARY BUTTON (Like/Message):
┌──────────────────────────┐
│ [  ❤️  Like/Message  ]   │
│ BG: Red/Pink Gradient    │
│ Color: White             │
│ Padding: 10px 28px       │
│ Rounded: 4px (cards)     │
│ Rounded: 24px (rounded)  │
│ Shadow: Drop shadow      │
│ Hover: Darker shade      │
│ Active: Scale 95%        │
└──────────────────────────┘

SECONDARY BUTTON (Pass/Skip):
┌──────────────────────────┐
│ [  ✗  Pass  ]            │
│ BG: White                │
│ Color: Red               │
│ Border: 1.5px solid red  │
│ Padding: 12px 24px       │
│ Rounded: 24px            │
│ Shadow: Light shadow     │
│ Hover: Light red BG      │
│ Active: Scale 95%        │
└──────────────────────────┘

TERTIARY BUTTON (Rewind/Super):
┌──────────────────────────┐
│ [  ↷  Rewind  ]          │
│ BG: White                │
│ Color: Amber/Blue        │
│ Border: Light border     │
│ Padding: 12px 20px       │
│ Rounded: 24px            │
│ Shadow: Light shadow     │
│ Hover: Tinted BG         │
│ Active: Scale 95%        │
└──────────────────────────┘
```

---

## 10. SPACING & LAYOUT

```
MARGINS & PADDING:
xs = 4px     (tight)
sm = 8px     (small)
md = 16px    (medium)
lg = 24px    (large)
xl = 32px    (extra large)

COMMON SPACING:
Card padding: 16px (md)
Section gap: 24px (lg)
Button group gap: 12px (md)
Grid gap: 16px (md)

CARD DIMENSIONS:
Mobile: Full width - 16px margins
Tablet: (viewport width / 2) - 12px gap
Desktop: (viewport width / 3) - 16px gap
```

---

## 11. STATE INDICATORS

```
MATCH SCORE BADGE:
🔴 0-30%   (Cold)    - Gray
🟠 31-60%  (Warm)    - Orange
❤️ 61-80%  (Hot)     - Red
🔥 81-100% (Perfect) - Pink/Gold

MATCH STATUS:
✅ Matched        - Green check
🔄 Pending        - Yellow spinner
❌ Not Matched    - Gray cross

MESSAGE COUNT:
💬 0 messages     - Gray text
💬 1-5 messages   - Blue badge
💬 5+ messages    - Green badge
```

---

This visual guide provides a complete picture of the UI/UX for the match feature!
