# FinPlan Design System — NeoPop edition

FinPlan's UI follows CRED's **NeoPop** design language (source of truth:
[playground.cred.club](https://playground.cred.club) and the open-source
`@cred/neopop-web` primitives). This document is the contract every component
in `src/` must follow. Tokens live in `src/app/globals.css`; primitives live in
`src/components/ui/`; the living catalogue is the `/playground` route.

Read this before touching any UI file. When a component and this document
disagree, the document wins.

---

## 1. Principles

1. **Sharp, not soft.** Zero border radius everywhere. No pills, no rounded
   cards, no circular avatars. Corners are 90°.
2. **Depth through the plunk, not shadows.** The only elevation is the NeoPop
   *plunk*: a 3px extruded edge on the bottom and right, skewed 45°. No
   `box-shadow`, no blur, no glassmorphism, no gradients.
3. **Monochrome first, colour as a signal.** Surfaces are black/white/greys.
   Colour appears only for meaning: brand accent (acid lime) for the primary
   action and active state, green/red/orange/blue for success/error/warning/info,
   and the chart palette for data.
4. **Type carries hierarchy.** Heavy geometric sans for everything, a high
   contrast serif for page titles and hero moments, uppercase tracked labels
   for metadata. Text opacity tiers (90/70/50/30 %) replace grey swatches.
5. **Motion is mechanical.** Presses translate 3px into the plunk in 120 ms
   ease-in-out. No scale, bounce or spring. Respect `prefers-reduced-motion`.
6. **INR-first, numbers confident.** Tabular figures, one confident number per
   insight, Indian grouping (₹1,20,000), compact L/Cr forms where the app
   already does so.

---

## 2. Colour tokens

Defined in `globals.css` as CSS variables and exposed to Tailwind through
`@theme inline`, so `bg-card`, `text-muted-foreground`, `border-border` etc.
keep working. **Dark is the default theme.** Light is fully supported.

### 2.1 Palette (NeoPop `colorPalette`)

| Name          | 500       | Use                                    |
| ------------- | --------- | -------------------------------------- |
| popBlack      | `#0d0d0d` | app background (dark)                  |
| popBlack 400  | `#121212` | cards / popovers (dark)                |
| popBlack 300  | `#161616` | input background (dark)                |
| popBlack 200  | `#3D3D3D` | borders, plunk bottom (dark)           |
| popBlack 100  | `#8A8A8A` | plunk right (dark), disabled           |
| popWhite 500  | `#ffffff` | app foreground (dark) / surface (light)|
| popWhite 400  | `#FBFBFB` | app background (light)                 |
| popWhite 300  | `#EFEFEF` | muted surface (light)                  |
| popWhite 200  | `#E0E0E0` | borders, plunk right (light)           |
| popWhite 100  | `#D2D2D2` | plunk bottom (light face)              |
| neoPaccha     | `#E5FE40` | **brand accent** (lime)                |
| neoPaccha 600 | `#A0B22D` | accent plunk bottom                    |
| neoPaccha 700 | `#727F20` | accent plunk right                     |
| success/green | `#06C270` | positive money, on-track               |
| error/red     | `#EE4D37` | negative money, destructive            |
| warning/yellow| `#F08D32` | at-risk, due soon                      |
| info/blue     | `#144CC7` | informational                          |
| parkGreen     | `#3BFFAD` | chart                                  |
| orangeSunshine| `#FF8744` | chart                                  |
| poliPurple    | `#9772FF` | chart                                  |
| pinkPong      | `#FF426F` | chart                                  |
| mannna        | `#FFCB45` | chart                                  |
| yoyo          | `#AA3FFF` | chart                                  |

### 2.2 Semantic tokens (Tailwind class → meaning)

| Token / class              | Dark                        | Light                      |
| -------------------------- | --------------------------- | -------------------------- |
| `bg-background`            | `#0d0d0d`                   | `#FBFBFB`                  |
| `text-foreground`          | `rgba(255,255,255,.9)`      | `rgba(13,13,13,.9)`        |
| `text-subtle`              | `rgba(255,255,255,.7)`      | `rgba(13,13,13,.7)`        |
| `text-muted-foreground`    | `rgba(255,255,255,.5)`      | `rgba(13,13,13,.5)`        |
| `text-faint`               | `rgba(255,255,255,.3)`      | `rgba(13,13,13,.3)`        |
| `bg-card` / `bg-popover`   | `#121212`                   | `#FFFFFF`                  |
| `bg-muted`                 | `rgba(255,255,255,.06)`     | `rgba(13,13,13,.05)`       |
| `bg-accent` (hover wash)   | `rgba(255,255,255,.08)`     | `rgba(13,13,13,.06)`       |
| `border-border`            | `rgba(255,255,255,.1)`      | `rgba(13,13,13,.1)`        |
| `border-input`             | `#3D3D3D`                   | `#E0E0E0`                  |
| `bg-input` (field surface) | `#161616`                   | `#FFFFFF`                  |
| `bg-primary` (CTA face)    | `#FFFFFF`                   | `#0d0d0d`                  |
| `text-primary-foreground`  | `#0d0d0d`                   | `#FFFFFF`                  |
| `bg-secondary`             | `#0d0d0d`                   | `#FFFFFF`                  |
| `text-secondary-foreground`| `#FFFFFF`                   | `#0d0d0d`                  |
| `bg-brand` / `text-brand`  | `#E5FE40`                   | `#E5FE40` (bg) / `#727F20` (text) |
| `text-brand-foreground`    | `#0d0d0d`                   | `#0d0d0d`                  |
| `bg-success` / `text-success` | `#06C270`                | `#06C270` / text `#1E8057` |
| `bg-destructive` / `text-destructive` | `#EE4D37`      | `#EE4D37`                  |
| `bg-warning` / `text-warning` | `#F08D32`                | `#F08D32`                  |
| `bg-info` / `text-info`    | `#144CC7` / text `#89A5E3`  | `#144CC7`                  |
| `bg-sidebar`               | `#0d0d0d`                   | `#FFFFFF`                  |
| `ring` (focus)             | `#E5FE40`                   | `#0d0d0d`                  |
| `--chart-1..8`             | neon 400/500 shades         | 600 shades                 |

Tinted washes (`bg-success/10`, `bg-brand/10`, `border-destructive/30`, …)
are allowed and preferred over new colours.

**Never** introduce ad-hoc hex values in components. Recharts SVG fills use
`src/lib/finance/chart-colors.ts` (see §7).

---

## 3. Typography

Loaded in `src/app/layout.tsx` via `next/font/google` and exposed as
`--font-body`, `--font-display`, `--font-geist-mono`.

| Role      | Face (NeoPop original → ours)     | Tailwind                       |
| --------- | --------------------------------- | ------------------------------ |
| Sans / UI | Gilroy → **Manrope** (400–800)     | `font-sans` (default)          |
| Display   | PP Cirka → **Instrument Serif**    | `font-display`                 |
| Mono      | — → **Geist Mono**                 | `font-mono` (card numbers, codes) |

`font-heading` remains an alias of `font-display` for backwards compatibility.

### 3.1 Scale (NeoPop `FontVariant`)

| Style              | Size / weight / tracking / leading        | Class recipe |
| ------------------ | ----------------------------------------- | ------------ |
| Display XL (hero)  | 44–64px / serif 400 / -0.01em / 1.05      | `font-display text-5xl md:text-6xl leading-none` |
| Display L (page h1)| 32–36px / serif 400 / 0 / 1.1              | `font-display text-3xl md:text-4xl leading-tight` |
| Heading 22         | 22px / 800 / 0.2px / 1.25                 | `text-[22px] font-extrabold leading-tight` |
| Heading 18         | 18px / 700 / 0.2px / 1.25                 | `text-lg font-bold leading-tight` |
| Heading 16         | 16px / 700 / 0.2px / 1.25                 | `text-base font-bold` |
| Heading 14         | 14px / 700 / 0.2px / 1.25                 | `text-sm font-bold` |
| Body 14            | 14px / 500 / 0.4px / 1.5                  | `text-sm font-medium` (default body) |
| Body 13            | 13px / 500 / 0.4px / 1.5                  | `text-[13px]` |
| Body 12            | 12px / 400–500 / 0.4px / 1.5              | `text-xs` |
| Caps 12            | 12px / 700 / 2px / 1.25 / uppercase       | `np-caps text-xs` |
| Caps 10            | 10px / 700 / 2px / 1.25 / uppercase       | `np-caps` (default 10px) |
| Caps 8             | 8px / 700 / 1px / uppercase (tags)        | `np-caps text-[8px] tracking-[1px]` |
| Money L            | 28–34px / 800 / -0.01em / tabular         | `text-3xl font-extrabold tabular-nums tracking-tight` |
| Money M            | 20–22px / 800 / tabular                   | `text-xl font-extrabold tabular-nums` |

Rules:

- Body text defaults to weight 500 (NeoPop body is medium). Use 400 only for
  long paragraphs.
- Labels, eyebrows, section kickers, table headers, badge text, nav items on
  mobile: **`np-caps`** (uppercase, 700, 2px tracking, 50–70 % opacity).
- `h1` renders in the display serif automatically; `h2`–`h4` are sans 700.
- Numbers: always `tabular-nums`.
- Copy voice on marketing surfaces (landing, auth, empty states, onboarding
  welcome) is CRED-style lowercase sentences. In-app functional copy keeps
  sentence case.

---

## 4. Shape, spacing, and the plunk

- `--radius: 0`. All `rounded-*` utilities resolve to 0 through the theme.
  **Do not use `rounded-full`** — status dots are 6–8px squares, avatars are
  squares, progress bars have square ends. Replace every `rounded-full` you
  touch.
- Spacing: 4px grid. Cards pad 20px (`p-5`); dense rows pad 12–16px. Page
  container is `max-w-6xl` with `px-4 md:px-8`.
- Borders: 1px, `border-border` (10 % alpha) for structure; `border-input`
  for fields; `border-foreground` for emphasised outlines.

### 4.1 Plunk utilities (defined in `globals.css`)

```
.np-plunk            face with 3px bottom + right extruded edges (45° skew)
.np-plunk-press      adds :active behaviour — face translates (3px,3px), edges collapse
.np-plunk-lg         6px edges (hero cards, dialogs)
.np-edge-light       edge colours for a WHITE face   (bottom #8A8A8A, right #E0E0E0)
.np-edge-dark        edge colours for a BLACK face   (bottom #3D3D3D, right #8A8A8A)
.np-edge-brand       edge colours for a LIME face    (bottom #A0B22D, right #727F20)
.np-edge-danger      edge colours for a RED face     (bottom #B53A29, right #802A1D)
.np-edge-success     edge colours for a GREEN face   (bottom #059A59, right #047043)
```

The element with `.np-plunk` is the face. It reserves `margin: 0 3px 3px 0`
for the edges, so it never changes layout when pressed. The default edge
colours follow the theme (`--plunk-bottom`, `--plunk-right`) and suit
`bg-card` faces; use an `.np-edge-*` modifier when the face colour differs.

Where the plunk is used:

| Component            | Plunk?                                  |
| -------------------- | --------------------------------------- |
| Button default/secondary/brand/destructive | yes + press          |
| Button outline/ghost/link | no (1px press translate only)     |
| Card `elevated`      | yes (no press)                          |
| Dialog / Sheet panel | yes, `np-plunk-lg`                      |
| Summary/hero stat cards | yes                                  |
| Checkbox, Switch     | yes on press (edges appear)             |
| List rows, tables, inputs, tabs, badges | no                   |

---

## 5. Primitive API (`src/components/ui/*`)

Keep every existing export name and prop so call sites compile. Add the new
variants listed here.

### Button (`ui/button.tsx`)

- `variant`: `default` (white face on dark / black on light, plunk, press),
  `secondary` (theme-surface face with 1px `border-input`, plunk, press),
  `brand` (lime face, black caps text, plunk, press),
  `destructive` (red face, white text, plunk, press),
  `outline` (transparent, 1px `border-foreground/30` → `border-foreground` on hover),
  `ghost` (transparent, `hover:bg-accent`),
  `link` (inline, 1px bottom border in current colour, no padding).
- `size`: `xs` h-7 px-3 text-[10px], `sm` h-8 px-4 text-[11px],
  `default` h-10 px-5 text-xs (NeoPop *medium* 40px),
  `lg` h-12 px-8 text-[13px] (NeoPop *big* 50px),
  `icon` size-10, `icon-sm` size-8, `icon-xs` size-7, `icon-lg` size-12.
- Label style for all variants except `link`: `np-caps` (uppercase, 700,
  0.14em tracking). Icons `size-4`.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`.
  No rings, no glow.
- Disabled: face `#8A8A8A`/text 50 % (dark), edges transparent, no press.

### Card (`ui/card.tsx`)

- `bg-card border border-border` square. New prop `elevated?: boolean` →
  adds `np-plunk`. `size="sm"` keeps tighter padding.
- `CardTitle`: sans 700 16px. `CardDescription`: `text-muted-foreground`.
- `CardFooter`: top border, `bg-muted`.

### Badge (`ui/badge.tsx`) — NeoPop *Tag*

- Square, `np-caps text-[10px] tracking-[1.5px]`, padding `px-2.5 py-1`,
  height 22px, no border radius.
- `variant`: `default` (foreground face, background text),
  `secondary` (`bg-muted text-foreground`), `outline` (1px `border-border`),
  `brand` (lime/black), `success`, `warning`, `destructive`, `info`
  (dark: solid colour face with `#FBFBFB` text; light: 10 % tint face with
  coloured text — exactly NeoPop's light/dark tag configs), `ghost`, `link`.

### Input / Textarea / Select trigger / MoneyInput / PasswordInput

- Square box, `h-10`, `bg-input border border-input`, text 15px weight 600,
  placeholder `text-faint`, caret `caret-brand`.
- Focus: `border-foreground` (no ring). Invalid: `border-destructive`.
- Select popup and dropdown/popover panels: `bg-popover border border-border`
  square; item hover `bg-accent`; selected item shows a lime 2px left bar.
- `Label`: `np-caps text-muted-foreground` (10px, 700, 2px tracking).
  Give `Label` `mb-2` spacing via callers (unchanged).

### Tabs

- List: square, `border border-border bg-background p-0.5`, items flush.
- Trigger: `np-caps text-[11px]` `text-muted-foreground`; active =
  `bg-foreground text-background` (inverted block). `variant="line"` keeps
  transparent list with a 2px `bg-brand` underline on the active tab.

### Dialog / Sheet / Popover / Dropdown

- Overlay `bg-black/70`, no blur. Panels `bg-popover border border-border`,
  square, `np-plunk np-plunk-lg` on Dialog and Sheet (Sheet side=bottom gets
  no plunk). Titles sans 700 18px; close button ghost icon.

### Progress

- Track `h-2 bg-muted` square; indicator `bg-foreground` (or `bg-brand` via
  className). No rounded ends.

### Skeleton

- `bg-muted animate-pulse` square.

### Table

- Header cells `np-caps text-muted-foreground`; rows `border-b border-border`;
  hover `bg-accent`.

### Sonner toaster

- Square, `--border-radius: 0`, default toast `bg-popover border-border`;
  success/error/warning toasts use solid NeoPop colours with `#F8F8F8` text.

### New primitives

- `ui/switch.tsx` — NeoPop Toggle: 40×22 square track with 1px border, 20×20
  square knob with an 8×8 inner square; on = track `#B4EDD4`, knob `#38b36f`;
  off = track background, knob `#E0E0E0`. Built on `@base-ui/react/switch`.
- `ui/checkbox.tsx` — 20×20 square, 1px `border-foreground`; checked =
  foreground face with background tick; plunk edges appear while pressed.
  Built on `@base-ui/react/checkbox`.
- `ui/plunk.tsx` — `<Plunk>` wrapper component (`elevated` div helper) and
  `plunkClass()` util for composing the utilities in TSX.

### Avatar, Separator, ScrollArea, Calendar, DatePicker

- Square everywhere; calendar selected day = `bg-foreground text-background`,
  today = lime 2px bottom bar.

---

## 6. Layout chrome

- **Sidebar** (desktop): `bg-sidebar border-r border-border w-60`. Logo
  lockup at top. Nav items: sans 13px 600, `text-muted-foreground`;
  active: `text-foreground` with a 3px lime bar on the left edge and
  `bg-accent`. Section footer holds the theme toggle and sign-out.
- **Mobile top bar**: square, `border-b`. **Bottom nav**: `border-t`, labels
  in `np-caps text-[9px]`; centre quick-add is a `brand` plunk icon button.
- **PageHeader**: `h1` display serif 32/36px; description `text-muted-foreground`.
  `MetaStat` → square stat blocks with a caps label and a bold tabular number.
- **PageSection** title: `np-caps text-xs text-subtle` with a 12px lime rule
  before it (`before:` pseudo 12×2px) — no serif here.
- **InsightPanel**: square, `border border-border border-l-[3px] border-l-brand bg-brand/5`.
- **EmptyState**: dashed 1px border, caps title? No — title sans 700 18px,
  body muted, CTA `brand` button.

---

## 7. Charts

- Palette in `src/lib/finance/chart-colors.ts`: `DARK_CHART_PALETTE` (neon
  400/500 shades) and `LIGHT_CHART_PALETTE` (600 shades). `chartColorAt(i)`
  keeps returning a hex (dark palette) for compatibility; add
  `useChartPalette()` (client hook reading `resolvedTheme` from `next-themes`)
  for Recharts components and `chartCssVar(i)` → `var(--chart-N)` for inline
  HTML styles in server components.
- Recharts: no gradients; bars square (`radius={0}`); grid lines
  `border-border`; tooltips use the Card style; axis text `np-caps` 10px.

---

## 8. Brand

- Name: **FinPlan**. Tagline: *plan with clarity.* (lowercase).
- Mark: black square tile with a lime plunk edge containing three ascending
  white steps (milestones). Wordmark: "FinPlan" in Manrope 800, -0.02em.
  Assets in `public/brand/`; usage rules in `BRAND.md`.
- App icon: mark on `#0d0d0d`; maskable variant has 20 % safe padding.
- OG image: 1200×630, black, lockup left, display-serif headline
  "plan marriage, a home, and every milestone." with a lime plunk card.

---

## 9. Do / Don't

Do: square everything · plunk for elevation · caps labels · tabular numbers ·
theme tokens · lowercase marketing copy · 120 ms mechanical presses.

Don't: `rounded-*` (except `rounded-none`) · `shadow-*` · gradients ·
`backdrop-blur` · glow rings · pastel greys · inline hex · circular dots ·
soft springs · emoji as icons.
