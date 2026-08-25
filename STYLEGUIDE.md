# Hose Monster — Frontend Style Guide

Source of truth: **Figma → Hose Monster → "Web Styleguide"**
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

| Token | Value | Figma name |
|---|---|---|
| `--brand-navy` | `#1c3a55` | Brand / 100 |
| `--brand-gold` | `#e1b14b` | Brand / 200 |
| `--brand-red` | `#eb3f21` | Brand / 300 |
| `--neutral-100` | `#e8e8e8` | Neutral / 100 |
| `--neutral-500` | `#282727` | Neutral / 500 |

### Semantic — use these

| Token | Points at | Use for |
|---|---|---|
| `--color-text` | navy | Body copy, headings |
| `--color-text-muted` | neutral-500 | De-emphasized text |
| `--color-text-inverse` | white | Text on dark/red fills |
| `--color-text-accent` | red | Eyebrows, emphasis |
| `--color-surface` | white | Default background |
| `--color-surface-subtle` | neutral-100 | Cards, alternating sections |
| `--color-surface-inverse` | neutral-500 | Footer, dark sections |
| `--color-border` | neutral-100 | Default borders |
| `--color-border-strong` | navy | Emphasized borders |
| `--color-action` | red | Primary button fill |
| `--color-accent` | gold | Accent details |

---

## Typography

Two commercial families:

- **Nimbus Sans Extd** — display/headings. Bold 700, Black 900. Always uppercase.
- **Gopher** — body and UI. Regular 400, Medium 500, Bold 700.

| Figma style | Class | Size (desktop) | Font |
|---|---|---|---|
| H1 | `.h1` / `<h1>` | 60px / 0.98, −3px tracking | Nimbus Bold |
| H2 | `.h2` / `<h2>` | 52px / 1.0 | Nimbus Bold |
| H2.5 | `.h2-5` | 40px / 1.0 | Nimbus Bold |
| H3 (Eyebrow) | `.eyebrow` | 18px / 1.1, red | Nimbus Black |
| H4 (Button) | applied by `.btn` | 16px / 1.0 | Gopher Bold |
| B1 (Standard Body) | `.body` / default | 14px / 1.7 | Gopher Medium |
| B2 (Small Body) | `.body-sm` | 12px / 1.5 | Gopher Regular |

Body text is the default — a bare `<p>` already renders as B1. No class needed.

**Pick heading levels for document structure, not for size.** If an `<h2>`
needs to look like H1, use `<h2 className="h1">`.

---

## Buttons

Two variants, both pill-shaped with a 2px border.

```jsx
<button className="btn btn--primary">Shop Equipment</button>
<a href="/smart-monster" className="btn btn--secondary">Explore Smart Monster™</a>
```

| Variant | Fill | Border | Text |
|---|---|---|---|
| `.btn--primary` | red | red | white |
| `.btn--secondary` | white | navy | navy |

The primary's border matching its own fill is intentional — it keeps both
variants the same height so they align side by side.

Strapi-driven content emits `.cms-button` classes, which are styled identically
in `app.css`. In hand-written code, prefer `.btn`.

---

## ⚠ Known discrepancies — needs design input

These came out of reading the Figma file and should be resolved with whoever
owns the design before the palette is considered final.

### 1. Every ColorCard's hex label contradicts its own swatch

On all five color cards, the printed hex text does not match the color of the
swatch above it:

| Card | Swatch fill | Printed label |
|---|---|---|
| Neutral / 100 | `#e8e8e8` | `#F8F6F5` |
| Neutral / 500 | `#282727` | `#525252` |
| Brand / 100 | `#1c3a55` (navy) | `#9E442A` (rust) |
| Brand / 200 | `#e1b14b` (gold) | `#6D2613` (dark rust) |
| Brand / 200 | `#eb4021` (red) | `#6D2613` (dark rust) |

**`tokens.css` uses the swatch fills**, on this reasoning: the navy `#1c3a55`
and red `#eb3f21` swatches are independently corroborated by the text styles
(H1/H2/H2.5 and body are all `#1c3a55`; the Eyebrow style is `#eb3f21`),
whereas the printed labels include a duplicate (`#6D2613` twice) that looks
like un-updated copy-paste. Worth confirming.

### 2. Two cards are both named "Brand / 200"

The gold and red swatches share a name. Tokens call the red one `--brand-red`
and treat it as a third step; Figma should be renamed to match.

### 2b. Components use colors that aren't in the palette

The Navbar and Footer introduce four colors with no entry in the styleguide's
Colors section. They're in `tokens.css` under an "Off-palette" heading, kept
exact so the components match the design:

| Token | Value | Used by |
|---|---|---|
| `--nav-ink` | `#2f2f2f` | Main nav link text |
| `--nav-rule` | `#e2e2df` | Header bottom border |
| `--nav-rule-utility` | `#ededed` | Utility bar bottom border |
| `--legal-ink` | `#9a9a9a` | Footer legal line |

`--nav-ink` (`#2f2f2f`) is very close to `--neutral-500` (`#282727`) and may
have been meant as the same value. Worth confirming rather than assuming.

### 3. Near-miss color drift

The same color appears at two slightly different values:

- Navy: `#1c3a55` (type styles, brand swatch, Footer headings) vs `#1d3a54`
  (Button Explore border, Footer link text)
- Red: `#eb3f21` (eyebrow, Button Shop) vs `#eb4021` (brand swatch)

Tokens canonicalize to the more frequently used `#1c3a55` and `#eb3f21`.

The navy pair now shows up in three separate components, so this is a pattern
rather than a one-off. Defining it once as a Figma variable would stop it
recurring.

### 4. No mobile type scale

The Figma page specs a Desktop scale only. A 60px H1 overflows a 375px
viewport, so `tokens.css` includes step-downs at `48em` and `64em`. **These
values are invented, not designed** — replace them when design provides a
mobile scale.

### 5. No spacing scale

Spacing is not specced as a system. The `--space-*` scale is derived from
observed values (12/44/60px gaps, 17px button padding) regularized onto a 4px
grid. The 17px button padding is kept exact as `--space-button-*`.

### 6. No interaction states

Neither button component has hover, focus, active, or disabled variants in
Figma. `components.css` ships conservative defaults (primary darkens to navy,
secondary inverts) plus a `:focus-visible` outline required for accessibility.
Replace with designed states when available.

### 7. Body copy is 14px

B1 is specced at 14px. That is on the small side for long-form reading. Not
changed — flagging in case it was meant as a component size rather than the
global body default.

---

## ⚠ Fonts — Adobe Fonts kit not yet wired up

**The brand fonts are Adobe Fonts (Typekit), a hosted subscription service.
There are no font files to commit, and none should be.**

### Real family names

Adobe serves these families under names that differ from their Figma labels.
The CSS must use Adobe's names:

| Figma label | Actual CSS family name |
|---|---|
| Nimbus Sans Extd | `nimbus-sans-extended` |
| Gopher | `gopher` |

`tokens.css` uses the correct names. Do not "tidy" them to match Figma — they
would stop matching and silently fall back.

### How the old WordPress site does it — do not copy this

`wp-content/themes/es99/style.css` contains hardcoded `@font-face` rules
pointing at raw `https://use.typekit.net/af/<hash>/...` URLs, extracted from a
kit and pasted in. Those URLs still resolve, but they are version-pinned
(`v=3`) and tied to an internal asset hash. When Adobe rotates them the fonts
disappear with nothing failing in CI to warn you. Self-hosting or hotlinking
them from a new domain is also outside the Adobe licence.

The kit that *is* referenced properly in that theme — `pmz5erz` — contains
**Calibri only**. It does not include either brand family.

### How to wire it up here

1. In [fonts.adobe.com](https://fonts.adobe.com), open the Web Project
   containing `nimbus-sans-extended` and `gopher`, or create one with both.
2. Select the weights listed below.
3. Add this storefront's domains to the project — production, the Oxygen
   preview domain, and `localhost` for development.
4. Add the kit stylesheet in [`app/root.jsx`](app/root.jsx), alongside the
   other `<link rel="stylesheet">` tags:

   ```jsx
   <link rel="stylesheet" href="https://use.typekit.net/<kitId>.css" />
   ```

The CSP in [`app/entry.server.jsx`](app/entry.server.jsx) already allows
`use.typekit.net` for `styleSrc`, `fontSrc`, and `connectSrc`, so nothing else
is needed. Without those entries Hydrogen's default CSP blocks webfonts
silently — a genuinely nasty thing to debug, so it is pre-wired.

### ⚠ Weight gap — verify before building

The live site loads only these faces:

| Family | Weights available today |
|---|---|
| `nimbus-sans-extended` | 700 |
| `gopher` | 400, 700 |

The Figma styleguide additionally requires:

| Family | Weight | Used by |
|---|---|---|
| `nimbus-sans-extended` | **900** | Eyebrow / H3 |
| `gopher` | **500** | Standard Body Copy / B1 |

Both families likely offer these in Adobe Fonts and just need selecting in the
kit. **If they are not available, the design has to change** — the browser will
synthesize a fake bold, which looks visibly wrong on a display face. Confirm
when you build the kit.

### Third family

The old theme also loads `alverata` (700). It does not appear in the Figma
styleguide and is not carried over. Confirm it is genuinely retired.

Until the kit is added the fallback stacks render. Layout and spacing are
correct; the brand look is not.

---

## Re-syncing with Figma

Because token names mirror the Figma structure, the file can be re-read and
diffed against `tokens.css` later. When design changes, update `tokens.css`
only — components pick it up automatically.
