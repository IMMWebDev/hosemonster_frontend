# Hose Monster — Frontend Style Guide

> Source of truth: **Hose Monster Web Styleguide, Sept 2026** (the designer's
> bundled HTML). It supersedes the Figma "Web Styleguide" page this build was
> originally made from; where the two disagree, the new document wins.

Earlier source, kept for reference: Figma → Hose Monster → "Web Styleguide"
<https://www.figma.com/design/YkA269pTHE9uSRKE3hsoud/Hose-Monster?node-id=1-3525>

This document explains how the design system is wired into the Hydrogen
storefront and the rules to follow when building pages.

---

## The one rule

**Raw values go in `tokens.css`. Everywhere else uses `var()`.**

If you are typing a hex code, a font size, or a border radius anywhere except
`app/styles/tokens.css`, stop — the value belongs in the token layer.

```css
/* ✗ Never */
.hero-title { color: #1c3a55; font-size: 60px; }

/* ✓ Always */
.hero-title { color: var(--color-text); font-size: var(--text-h1); }
```

---

## File structure

Stylesheets load in this order, set in [`app/root.jsx`](app/root.jsx). The order
is deliberate — do not shuffle it.

| # | File | Owns |
|---|------|------|
| 1 | `app/styles/tokens.css` | Every design value. The only file with raw hex/px. |
| 2 | `app/styles/reset.css` | Structural normalization only. No type scale. |
| 3 | `app/styles/typography.css` | `@font-face`, heading + body styles. |
| 4 | `app/styles/layout.css` | Breakpoints + container system. |
| 5 | `app/styles/components.css` | Global primitives — buttons. |
| 6 | `app/styles/app.css` | Page/component rules not yet moved to modules. |

### Where does my CSS go?

- **A value used in more than one place** → `tokens.css`
- **A component used across many pages** (buttons) → `components.css`
- **Page scaffolding** (containers, breakpoints) → `layout.css`
- **Anything specific to one component** → a co-located `*.module.css`

CSS Modules work out of the box with Vite — no config needed. Name the file
`ComponentName.module.css` next to the component:

```
app/components/
  Header.jsx
  Header.module.css
```

```jsx
import styles from './Header.module.css';

export function Header() {
  return <header className={styles.header}>…</header>;
}
```

```css
/* Header.module.css — class names are scoped automatically */
.header {
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: var(--border-width) solid var(--color-border);
}
```

New components should use modules. `app.css` is legacy — move rules out of it
opportunistically as you touch each component, not in one big sweep.

---

## Layout & breakpoints

Ported from our standard styled-components system (`vars.screen` + `Container`).
Lives in [`app/styles/layout.css`](app/styles/layout.css).

### Breakpoints

| Name | Query |
|---|---|
| `desktopLg` | `(min-width: 1440px)` |
| `desktopNav` | `(max-width: 1250px)` |
| `desktop` | `(min-width: 1100px)` |
| `tablet` | `(max-width: 1099px)` |
| `mdTablet` | `(max-width: 699px)` |
| `tabletOnly` | `(min-width: 500px) and (max-width: 1099px)` |
| `mobile` | `(max-width: 499px)` |
| `largerThanPhone` | `(min-width: 500px)` |

`smallerThanDesktop` is identical to `tablet`, and `desktopOnly` to `desktop`.
Both spellings exist in `breakpoints.js` so ported code reads naturally, but
prefer `tablet` / `desktop`.

**⚠ Breakpoints cannot be tokens.** `@media (max-width: var(--x))` is invalid
CSS — media conditions are evaluated before custom properties resolve. So px
values are written literally in every `@media` rule. The table in `layout.css`
is the source of truth; [`app/lib/breakpoints.js`](app/lib/breakpoints.js)
mirrors it for JS (`matchMedia`). **Change a breakpoint in both places.**

Write desktop-first, matching the house system: base rule is desktop, then
`max-width` queries narrow it. When two `max-width` blocks overlap, the narrower
one must come *later* in the file to win.

### Container

Two options.

**`.container`** — a centered, padded, max-width column. Use when nothing needs
to escape it.

**`.container-grid`** — same, but with named grid lines so children can break
out to the viewport edge:

```
full-width-start                                      full-width-end
      |  gutter  |          content          |  gutter  |
           content-start              content-end
```

```html
<section class="container-grid">
  <h2>Sits in the content column automatically</h2>
  <div class="full-width">Edge to edge</div>
  <div class="content-break-right">Content-start to right edge</div>
</section>
```

Direct children default to the content column, so most markup needs no class.
Helpers: `.full-width`, `.content`, `.content-break-left`,
`.content-break-right`, `.subgrid`. Suppress block padding with
`.container-flush`, `.container-flush-top`, `.container-flush-bottom`.

### Spacing

| | Desktop | `tablet` | `mobile` |
|---|---|---|---|
| Gutter (inline) | 32px | 24px | 16px |
| Block padding | 64px | 48px | 32px |

### One content width

**1440px, sitewide.** `--container-max` is the single value; a module that
genuinely needs to be wider or narrower overrides it locally, nothing else does.

Everything centred on the page caps at `--container-outer`
(`--container-max` + 2 gutters) so its *content* lands at exactly 1440px with
gutters outside. That is what makes the header, footer, and page sections share
the same vertical edges. Verified: at 1920px all four regions sit at 240 → 1680.

The Header and Footer therefore use `--container-gutter` (32/24/16), **not** the
28px and 44px their Figma frames specify. Those two numbers disagree with each
other in the design, so they read as drawn rather than systematic; matching the
page grid matters more than matching them.

### `box-sizing: border-box` is load-bearing

The reset sets it globally. Without it `max-width` measures the content box and
padding is added on top, so a 1440px container renders 1504px wide and nothing
lines up. Do not remove that rule.

---

## Colors

Two tiers. **Use the semantic names in components**, never the primitives —
that indirection is what lets design swap a color in one place.

### Primitives

Source: **Hose Monster Web Styleguide, Sept 2026** (§01). Two brand colours
carry the identity; everything else is ink, surface or border.

| Token | Value | Role |
|---|---|---|
| `--brand-orange` | `#eb3f21` | CTAs, eyebrows, accents, hover borders, active states |
| `--brand-orange-hover` | `#c62f14` | Hover **fill** for orange buttons. Never a text colour. |
| `--brand-navy` | `#1d3a54` | Headings, dark sections, outline buttons, hero scrims |
| `--deep-navy-ink` | `#0b1721` | The only navy that clears 4.5:1 **on** orange |
| `--neutral-50` | `#f5f6f7` | Light surface — alternating sections, callouts, icon tiles |
| `--neutral-100` | `#e8e8e8` | Border — all 2px card and control strokes |
| `--photo-well` | `#0e1a25` | Behind product images in cards |

Four inks, and only four:

| Token | Value | Use for |
|---|---|---|
| `--ink-body` | `#41586e` | Paragraph copy on white |
| `--ink-muted` | `#5c7186` | Card specs, labels, secondary copy |
| `--ink-on-navy` | `#c3d0dc` | Body copy on navy grounds |
| `--ink-faint` | `#a5b3c0` | Counts, chevrons, **non-text marks only** |

`--brand-gold` and `--neutral-500` are **retired** — the new palette contains no
gold and no warm near-black. `--brand-red` survives as an alias of
`--brand-orange` so existing references keep resolving; the colour has one name
now and it is orange.

The old block of fourteen one-off greys (`#4a4a4a`, `#3a3a3a`, `#666666`,
`#2f2f2f`, `#9a9a9a` …) is gone. Those names still exist in `tokens.css` because
a dozen stylesheets read them, but each is now an alias onto one of the four
inks. Retire a name once its last consumer goes.

**Still off-palette:** `--hero-meta-rule` and `--newsletter-input-border`. Both
are rules on *navy* grounds, where the single `#E8E8E8` border is near-white and
far too loud. Open with design.

### Semantic — use these

| Token | Points at | Use for |
|---|---|---|
| `--color-text` | navy | Headings |
| `--color-text-body` | ink-body | Paragraph copy on white |
| `--color-text-muted` | ink-muted | Card specs, labels, secondary copy |
| `--color-text-soft` | ink-muted | Older alias of the above |
| `--color-text-inverse` | white | Text on dark or orange fills |
| `--color-text-on-navy` | ink-on-navy | Body copy on navy grounds |
| `--color-text-accent` | orange | Eyebrows, card CTAs — **19px / 700 only** |
| `--color-text-on-orange` | deep-navy-ink | Text sitting on an orange fill |
| `--color-text-faint` | ink-faint | Counts, chevrons, non-text marks |
| `--color-surface` | white | Default background |
| `--color-surface-alt` | neutral-50 | Alternating sections |
| `--color-surface-subtle` | neutral-100 | Placeholder fills |
| `--color-surface-inverse` | **navy** | Footer, dark sections (was neutral-500) |
| `--color-border` | neutral-100 | All 2px card and control strokes |
| `--color-border-strong` | navy | Emphasized borders |
| `--color-action` | orange | Primary button fill |
| `--color-action-hover` | orange-hover | Hover fill |

### Contrast rules for orange (§09) — not optional

Brand orange is a light colour, which constrains what may sit on it. Measured:

| Pairing | Ratio | Passes |
|---|---|---|
| `#EB3F21` on white | 3.99:1 | 19px / 700 only |
| white on `#EB3F21` | 3.99:1 | 19px / 700 only |
| white on `#BC321A` | 5.82:1 | any size |
| `#1D3A54` on `#EB3F21` | 2.95:1 | **never use** |

- Orange text must be **19px and bold**. Below that the colour has to change.
  This is why `--text-eyebrow` and `--text-button` are both 19px.
- **Orange on navy measures 2.95:1** — but §09 scopes the exception narrowly,
  to "the footer eyebrow and required asterisks". In practice that is the
  newsletter band, and that one is white. Every SECTION eyebrow in every
  sprint-04 comp is `#EB3F21` whatever the ground, including ones on solid navy
  (Fire Flow’s "Optional, not required", Shop’s "Everything, in one place").
  Design has accepted the ratio there. Do not white them out without the comps
  changing first — that was tried and reverted.

---

## Typography

Two commercial families:

- **Nimbus Sans Extd** — display/headings. Bold 700, Black 900. Always uppercase.
- **Gopher** — body and UI. Regular 400, Medium 500, Bold 700.

| Style | Token | Size | Font |
|---|---|---|---|
| H1 · Page headline | `--text-h1` | `clamp(26px, 3.1vw, 40px)` / 1.1 | Nimbus Bold |
| H2 large · Major section | `--text-h2-lg` | `clamp(28px, 3.2vw, 42px)` / 1.1 | Nimbus Bold |
| H2 · Standard section | `--text-h2` | `clamp(24px, 2.6vw, 32px)` / 1.1 | Nimbus Bold |
| H3 · Sub-section | `--text-h3` | 20px / 1.2 | Nimbus Bold |
| Section eyebrow | `--text-eyebrow` | 19px / 1.1, 0.08em, uppercase, orange | **Gopher Bold** |
| Button | `--text-button` | 19px / 1.0 | Gopher Bold |
| UI label | `--text-ui` | 16px | Gopher |
| Body large | `--text-body` | 16px / 1.6 | Gopher |
| Body | `--text-body-sm` | 15.5px / 1.6 | Gopher |
| Detail | `--text-detail` | 13.5px / 1.6, muted ink | Gopher |
| Card title | `--text-card-title` | 15px / 1.3, uppercase | Nimbus Bold |
| Price | `--text-price` | 18px, navy | Gopher Bold |

**The headings are clamps, and there is no mobile override any more.** A
`:root` inside a media query overrides a clamp outright, pinning the heading to
one size below the breakpoint — which is the opposite of what the clamp is for.
The old step-down blocks for `--text-h1` / `--text-h2` / `--text-h3` have been
deleted; do not add them back. Change the clamp instead.

**The eyebrow is Gopher, not Nimbus.** It used to be Nimbus Black at 18px with
no tracking. It is the one tracked style in the system, and its 19px is an
accessibility floor rather than a preference — see the contrast rules above.

Body text is the default — a bare `<p>` already renders as B1. No class needed.

**Pick heading levels for document structure, not for size.** If an `<h2>`
needs to look like H1, use `<h2 className="h1">`.

---

## Buttons

One geometry, five fills (§04). Paired CTAs therefore always match in height.

```
font-size: 19px · font-weight: 700 · Gopher
min-height: 56px · padding: 0 32px · box-sizing: border-box
border-radius: 999px · white-space: nowrap · justify-content: center
transition: 250ms ease
```

```jsx
<button className="btn btn--primary">Shop equipment</button>
<a href="/smart-monster" className="btn btn--secondary">Explore Smart Monster™</a>
```

| Variant | Fill | Border | Text | Where |
|---|---|---|---|---|
| `.btn--primary` | orange | orange | white | light grounds |
| `.btn--secondary` | white | navy | navy | light grounds |
| `.btn--tertiary` | none | border grey | navy | light grounds (26px side padding) |
| `.btn--inverse` | white | white | orange | orange grounds (§04 "primary on orange") |
| `.btn--secondary-on-orange` | none | white | white | orange grounds |

Three rules that are easy to undo by accident:

1. **Height comes from `min-height`, never a fixed height**, so vertical padding
   cannot fight it. There is no `--space-button-y` any more; reach for
   `--button-height`.
2. **19px / 700 is an accessibility constraint.** White on orange measures
   3.99:1 and only clears AA as large text. Shrink the label and the primary
   button stops being legal.
3. **No text-transform.** Labels are sentence case as authored; `capitalize` was
   mangling copy like "Shop parts & accessories". And no arrow glyphs in labels.

Every variant carries a 2px border even where the spec draws none — on filled
variants it matches the fill. That is what keeps all five the same height.

Hover is the house rule, not the spec: **a button darkens what it already is.**
§01 names the orange hover fill (`#c62f14`) but specs no hover for the other
four. Outlined buttons fill with their own border colour; the tertiary borrows
the navy it already uses for its label, since filling with its own pale border
would read as disabled.

Strapi-driven content emits `.cms-button`, styled identically in `app.css` —
keep the two in step or a CMS button and a hand-written one will not line up.
In hand-written code, prefer `.btn`.

---

## ⚠ Open items — needs design input

The **Hose Monster Web Styleguide (Sept 2026)** replaced the Figma-derived
styleguide this build was originally made from. Items 1–6 below were all raised
against that older document and are now closed by the new one: the palette is
named by role, the type scale is given as clamps, the mobile scale is the clamp
itself, and §05 finally specs interaction states. What follows is what the new
styleguide leaves open.

### A. Orange as a link hover, below 19px

`reset.css` turns every non-button anchor orange on hover, and Header, Footer
and Product Feed restate it. §09 forbids orange text below 19px / 700 — but the
hover states were invented by this build because the old styleguide had none, so
the spec condemns the colour without supplying a replacement. The footer cases
are fixed (§09 says orange on navy is white); the light-ground ones are not.

### B. The 1440px container

`--container-outer` is `1440 + 2 × gutter`, so content lands at exactly 1440px
with the gutters outside it — a deliberate house standard, recorded above under
"One content width". §06 reads 1440px as the **outer** box, which would put
content at 1353.6px. Related: `reset.css` puts a 16px margin on `<main>` that the
legacy non-module routes rely on, so zeroing `--main-gutter` needs those checked
first.

### C. Card chrome is restated in eight modules

§05 says "three patterns, one chrome", but there is no shared card class —
Card Grid, Link Cards, Product Cards, Product Feed, Category Grid, Feature
Cards, FAQ and Testimonials each declare their own border, radius, hover and
timing. Building a shared `.card` is the difference between about 6 edits and
about 24. The tokens are in place either way (`--shadow-card-hover`,
`--card-lift`, `--card-image-scale`, `--duration-control`); nothing consumes them
yet.

### D. Sections do not alternate automatically

§06 says sections alternate white and `#f5f6f7`. Only `faq`, `link-cards` and
`text-media` have a background field, and `BlockManager` passes no index — so
the rhythm is whatever an author sets. Either alternate by index in
`BlockManager` (one edit, every page) or add the field to the nine remaining
Strapi schemas (18 edits, and authors can still break it).

### E. Controls that do not exist yet

§07 specs removable filter chips and numbered pagination with a navy-filled
current page. Neither is built. The sort select and its label are now on spec.

### F. Eight literals below the smallest named step

The scale now bottoms out at 13.5px (`--text-detail`). Product Feed, Product
Cards, Page Hero, Link Cards and Newsletter each carry a literal below that
(12px, 12.5px, 13px, 14px) with a comment saying it came from the design. Either
the design has values the styleguide does not name, or they all move up.

### G. Two rules on navy grounds

`--hero-meta-rule` and `--newsletter-input-border` are the last off-palette
hexes. §01 gives one border colour and it is a light-ground value.

### H. The hero-callout divider

§06 names a 1px `#E0E0E0` divider; §01 says `#E8E8E8` is the one border colour
and covers all strokes. Either the spec contradicts itself or the callout
hairline is a deliberate exception — taking §06 literally adds a sixth neutral.

### I. FAQ behaviour

§08 asks for a two-column flow with only one panel open at a time. The
two-column layout was overridden deliberately (see the module comment); the
single-open behaviour has not been decided.

### J. Body copy sizes — CLOSED, on the designer’s values

The original Figma specced B1 at 14px and B2 at 12px. Both were raised at the
client’s direction on **2026-08-26** (to 18px and 16px) because 14px read as fine
print on a large display. §03 of the Sept 2026 styleguide asks for **16px** and
**15.5px** — between the two — and the client has taken the designer’s values.
The divergence is closed and `tokens.css` no longer carries the do-not-revert
note.

Two things moved with them:

- **`--text-body-lg` is retired.** It existed to sit one step *above* body copy,
  which at 20px it no longer would once "Body large" became 16px. Its two
  consumers (Tabbed Cards intro, CTA Banner body) now read `--text-body`.
- **Prices were pinned first.** `.cardPrice` in Product Cards and Product Feed
  used to ride `--text-body`; they are on `--text-price` (18px) so this change
  did not silently shrink them.

Still open from the same table: §03 sets body copy at **Gopher 400**, and
sixteen rules currently pair a body size with `--weight-medium` (500) —
including the `body` element default in `typography.css`. Taking that row is a
separate, one-command change.


## Fonts — Adobe Fonts kit

**The brand fonts are Adobe Fonts (Typekit), a hosted service. There are no
font files to commit, and none should be.**

The kit ID is a constant at the top of [`app/root.jsx`](app/root.jsx):

```js
const TYPEKIT_KIT_ID = 'zny1qeh';
```

`Layout` emits the kit `<link>` plus a `crossorigin` preconnect from it, first
in `<head>` so the request starts before our own stylesheets.

**Not an env var, deliberately.** A kit ID is public — it ships in the page
source — it is identical in every environment, and one Adobe project covers
every domain registered to it. Making it configurable bought nothing except a
step that could be missed on Oxygen, silently dropping the brand fonts in
production. To change kits, edit that line. Adding *weights* to the existing
kit needs no code change at all.

### Real family names

Adobe serves these families under names that differ from their Figma labels.
The CSS must use Adobe's names:

| Figma label | Actual CSS family name |
|---|---|
| Nimbus Sans Extd | `nimbus-sans-extended` |
| Gopher | `gopher` |

`tokens.css` uses the correct names. Do not "tidy" them to match Figma — they
would stop matching and silently fall back.

### Current kit: `zny1qeh` — complete

Verified in-browser on 2026-08-26. 25 faces registered, `font-display: swap`.
All five faces the design uses resolve to themselves rather than being
substituted by a nearby weight:

| Family | Weight | Token | Used by |
|---|---|---|---|
| `gopher` | 400 Regular | `--weight-regular` | B2 Small Body Copy |
| `gopher` | 500 Medium | `--weight-medium` | B1 Standard Body Copy |
| `gopher` | 700 Bold | `--weight-bold` | Buttons |
| `nimbus-sans-extended` | 700 Bold | `--weight-bold` | H1, H2 |
| `nimbus-sans-extended` | 900 Black | `--weight-black` | Eyebrow (Figma H3) |

The kit also carries `nimbus-sans`, `nimbus-sans-condensed` and assorted
italics the site does not use. Not worth trimming — browsers only download a
face when text actually matches it, so unused faces cost a few KB of CSS and
zero font requests.

### ⚠ Hard-reload after any kit change

The kit CSS is served `max-age=600, stale-while-revalidate=604800`. A browser
will keep serving the **old** kit — for up to a week — while refreshing in the
background. Newly added weights look "missing" when they are already in the
kit. This bit us once already. Check the source before debugging anything:

```bash
curl -s https://use.typekit.net/zny1qeh.css | grep -c @font-face
```

To force the browser to catch up, refetch past the cache and reload:

```js
await fetch('https://use.typekit.net/zny1qeh.css', {cache: 'reload'}); location.reload();
```

### Full weight availability, for reference

| Family | Foundry | Available in Adobe Fonts |
|---|---|---|
| Nimbus Sans Extended | URW Type Foundry | Light 300, Regular 400, Bold 700, Black 900 (no italics) |
| Gopher | Adam Ladd | Hairline through Heavy, italics throughout |

Domains: the kit must list `localhost`, the Oxygen preview domain, and
production. Unlike the raw asset URLs described below, kits **are**
domain-locked.

The CSP in [`app/entry.server.jsx`](app/entry.server.jsx) is pre-wired:
`use.typekit.net` in `styleSrc` and `fontSrc`, and `p.typekit.net` in
`styleSrc` — the kit stylesheet opens with an `@import` of
`p.typekit.net/p.css`, and an `@import` is fetched under `style-src`, not
`connect-src`. Without these Hydrogen's default CSP blocks webfonts silently,
which is genuinely nasty to debug.

### Why the old site works without any of this

`wp-content/themes/es99/style.css` hardcodes `@font-face` rules pointing at raw
`https://use.typekit.net/af/<hash>/...` URLs lifted out of a kit's generated
CSS. Those assets are **unauthenticated** — they return `200` with
`access-control-allow-origin: *` from any origin, with or without a `Referer`.
That is why hosemonster.com renders the brand fonts without owning a kit for
them. It is not authorisation; it is an absent check.

Three reasons not to repeat it:

1. **It cannot produce the design.** The theme only pins Nimbus 700, Gopher 400
   and Gopher 700 — no Nimbus 900 (every eyebrow) and no Gopher 500 (all
   standard body copy). The per-face hashes are opaque and cannot be derived.
2. **Silent breakage.** The URLs are pinned to `/30/` and `v=3` against an
   internal asset hash. When Adobe rotates them the fonts vanish with nothing
   failing in CI.
3. **Licence.** Adobe's TOU covers kit delivery on registered domains.

The kit that *is* referenced properly in that theme — `pmz5erz` — contains
**Calibri only**, four faces. It does not include either brand family.

### Third family

The old theme also loads `alverata` (700). It does not appear in the Figma
styleguide and is not carried over. Confirm it is genuinely retired.

Until the kit ID is set the fallback stacks render. Layout and spacing are
correct; the brand look is not.

---

## Re-syncing with Figma

Because token names mirror the Figma structure, the file can be re-read and
diffed against `tokens.css` later. When design changes, update `tokens.css`
only — components pick it up automatically.
