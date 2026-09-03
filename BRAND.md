# FinPlan brand

FinPlan's brand follows the NeoPop design language documented in
[`DESIGN.md`](./DESIGN.md) — sharp square geometry, a black-and-lime palette,
and a 3D "plunk" edge instead of shadows. This document covers the logo,
colour, type, voice, and social/app-icon specs; `DESIGN.md` covers the UI
component system built on top of the same tokens.

**Name:** FinPlan. **Tagline:** `plan with clarity.` (lowercase, with the
period — see Voice below).

---

## 1. Logo

### 1.1 The mark

A black (`#0d0d0d`) square tile with a lime NeoPop plunk extrusion on the
bottom and right, containing three ascending white steps (milestones).
`viewBox="0 0 512 512"`:

- Face: rect `0,0` → `432,432`, fill `#0d0d0d`.
- Right edge: polygon `(432,0) (512,80) (512,512) (432,432)`, fill `#A0B22D`
  (lime 600).
- Bottom edge: polygon `(0,432) (432,432) (512,512) (80,512)`, fill `#E5FE40`
  (lime 500).
- Steps: three white rects, width 80, heights 96 / 176 / 256, bottoms
  aligned at `y=352`, at `x = 72 / 176 / 280` (24px gaps).

The two small corner notches (top-right, bottom-left) where face and edges
don't meet are intentional — they read as a subtle skewed-tile silhouette,
matching CRED's plunk tiles. Keep them; don't square them off.

### 1.2 Files (`public/brand/`)

| File | Use |
| --- | --- |
| `finplan-mark.svg` | Full-colour mark. App icons, favicon, anywhere the mark stands alone. |
| `finplan-mark-mono-dark.svg` | Mark silhouette in solid `#0d0d0d` on transparent, steps cut out as negative space. For light backgrounds where the full-colour tile would be too heavy, or single-colour print. |
| `finplan-mark-mono-light.svg` | Same silhouette in solid `#ffffff`. For dark, colour-saturated backgrounds. |
| `finplan-wordmark.svg` | "FinPlan" in Manrope ExtraBold, -0.02em tracking, converted to path outlines (`fill="currentColor"` — no font needed to render it, and it tints via CSS `color`). |
| `finplan-lockup-dark.svg` | Mark + wordmark, wordmark in white. For dark surfaces. |
| `finplan-lockup-light.svg` | Mark + wordmark, wordmark in black. For light surfaces. |
| `finplan-og.png` | Static 1200×630 copy of the Open Graph image (see §5). |

In-app, don't reference these files directly — use
`src/components/brand/app-logo.tsx` (`<AppLogo />`), which inlines the same
mark as SVG so it needs no network round-trip and can be sized/coloured with
props. See §6.

### 1.3 Clear space & minimum size

- Clear space: reserve at least the mark's own step-width (80 of its 512
  units, i.e. ~16% of the mark's rendered size) on every side of the full
  lockup — don't crop the plunk edge or crowd it against other content.
- Minimum size: the mark alone should not render below 20px square (the
  three-step interior gets muddy below that). The full lockup (mark +
  wordmark) should not render below 96px wide.
- Never stretch the mark to a non-square aspect ratio, add a drop shadow,
  add rounded corners, or recolour the face/edges outside the two mono
  variants above.

---

## 2. Colour

| Token | Hex | Usage |
| --- | --- | --- |
| Black | `#0d0d0d` | Mark face, primary dark surface. |
| White | `#ffffff` | Mark steps, text on dark. |
| Lime (brand) | `#E5FE40` | Bottom plunk edge, primary accent, CTAs, active states. |
| Lime 600 | `#A0B22D` | Right plunk edge on a black face; bottom plunk edge on a lime face. |
| Lime 700 | `#727F20` | Right plunk edge on a lime face; lime text on light surfaces. |
| Success | `#06C270` | Positive money, on-track goals. |
| Error | `#EE4D37` | Negative money, destructive actions. |
| Warning | `#F08D32` | At-risk, due soon. |
| Info | `#144CC7` | Informational. |
| Grey 900 | `#121212` | Dark cards / popovers. |
| Grey 800 | `#161616` | Dark input surfaces. |
| Grey 600 | `#3D3D3D` | Dark borders, dark-face plunk edge. |
| Grey 400 | `#8A8A8A` | Disabled, dark-face plunk right edge. |
| Grey 200 | `#D2D2D2` | Light-face plunk bottom edge. |
| Grey 150 | `#E0E0E0` | Light borders, light-face plunk right edge. |
| Grey 100 | `#EFEFEF` | Light muted surface. |
| Grey 50 | `#FBFBFB` | Light app background. |

Full semantic token → Tailwind class mapping (`bg-card`, `text-muted-foreground`,
etc.) is in `DESIGN.md` §2. Never hardcode a hex value in a component —
these exist as CSS variables already.

---

## 3. Typography

| Role | Face | Tailwind |
| --- | --- | --- |
| UI / body | Manrope, 400–800 | `font-sans` |
| Display / headlines | Instrument Serif | `font-display` |

Both are SIL Open Font License (OFL 1.1) — free to embed, modify, and
redistribute. Full type scale and usage rules: `DESIGN.md` §3.

Static weights used only for server-side image generation (satori/`next/og`
and `scripts/generate-brand-assets.ts`, which cannot load woff2 or variable
fonts) live in `src/assets/fonts/`: `Manrope-ExtraBold.woff` (800),
`Manrope-Medium.woff` (500), `InstrumentSerif-Regular.woff` (400), plus
`Manrope-ExtraBold-LatinExt.woff` — a glyph-only fallback for the ₹ (rupee)
sign, which Google Fonts ships in Manrope's "latin-ext" unicode range rather
than "latin" (see the file header comments for how it's wired in). The
app's on-screen type is loaded separately via `next/font/google` in
`src/app/layout.tsx` — the two are independent; changing one doesn't affect
the other.

---

## 4. Voice

- **Lowercase, sentence-style** on marketing surfaces (landing, OG copy,
  taglines, empty states): "plan with clarity.", not "Plan With Clarity!".
- **Affirmative.** Say what FinPlan does, not what it doesn't.
- **No exclamation marks.** Confidence reads calm, not hyped.
- In-app functional copy (buttons, table headers, form labels, errors)
  keeps normal sentence case — the lowercase voice is for brand moments,
  not UI chrome. See `DESIGN.md` §3.1 for the exact boundary.

---

## 5. Social images (OG / Twitter)

- Size: 1200×630, PNG.
- Composition: black (`#0d0d0d`) background; lockup (mark + white wordmark)
  top-left; headline in Instrument Serif, ~72px, white, wrapped to fit;
  sub-line in Manrope Medium, ~22px, 50% white; a lime plunk card on the
  right with a bold INR figure (Manrope ExtraBold, black text on lime).
- Two implementations share this composition:
  - `src/app/opengraph-image.tsx` (+ `twitter-image.tsx`, which re-exports
    it) — generated at request time with `next/og`'s `ImageResponse`, real
    loaded fonts, always in sync with the live tagline/copy.
  - `public/brand/finplan-og.png` — a static copy built by
    `scripts/generate-brand-assets.ts` using `opentype.js` path outlines
    (no font-loading dependency at all), for anywhere a static asset is
    preferable to a generated route.
- Regenerate the static copy after changing the copy or layout in the
  script (§7) — the dynamic route reads its own copy from
  `opengraph-image.tsx` and needs no regen step.

---

## 6. App icons

| File | Size | Spec |
| --- | --- | --- |
| `public/icons/icon-192.png`, `icon-512.png` | 192², 512² | Mark at full bleed (`purpose: "any"`). |
| `public/icons/icon-maskable-192.png`, `icon-maskable-512.png` | 192², 512² | Mark scaled to 60%, centred, on a solid `#0d0d0d` backdrop — stays inside the OS maskable safe zone (`purpose: "maskable"`). |
| `public/apple-touch-icon.png` (+ `src/app/favicon.ico` copy) | 180² | Mark at 80%, centred, on solid `#0d0d0d`. |
| `public/favicon.ico` / `src/app/favicon.ico` | 16/32/48 (one .ico) | Mark at 86%, centred, on solid `#0d0d0d`, hand-packed PNG-in-ICO. |

All four are wired into `src/app/manifest.ts` (icons + shortcuts) and
`serwist.config.js` (`additionalPrecacheEntries`) so they're installable and
offline-available.

---

## 7. Regenerating assets

Everything under `public/brand/`, `public/icons/`, `public/apple-touch-icon.png`,
and both `favicon.ico` copies is derived — never hand-edit the PNGs or the
generated SVGs directly. Edit the recipe in
`scripts/generate-brand-assets.ts` (or the copy/colours inside it) and run:

```bash
npm run brand:assets
```

This uses `sharp` to rasterize SVG → PNG and `opentype.js` to convert brand
copy to path outlines (so the wordmark and static OG image need no
installed or embedded fonts to render correctly anywhere). The script logs
every file it writes with its final dimensions — check that output after
any change. If you touch the mark's geometry, update the recipe in §1.1
above and in `src/components/brand/app-logo.tsx` (which inlines the same
shapes rather than loading the SVG file) so both stay in sync.
