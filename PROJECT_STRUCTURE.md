# Project Structure & Architecture

> Living reference for the HoseMonster storefront. **Keep this updated whenever the
> site's architecture changes** (new integrations, routes, env vars, deploy changes).
> Last updated: 2026-07-08.

## Overview

A **Shopify Hydrogen** storefront (React Router 7) with a **Strapi v5 headless CMS**.

- **Shopify** owns commerce: products, collections, cart, checkout, customer accounts, blogs, policies, search.
- **Strapi** owns everything else (content): CMS pages built from dynamic-zone "modules", the header, the footer, and the 404 page.
- **Hosting:** the storefront runs on **Shopify Oxygen**; Strapi runs on **DigitalOcean**.

## Stack & versions

| | |
|---|---|
| `@shopify/hydrogen` | 2026.4.3 (latest per the Shopify CLI) |
| `react-router` / `@react-router/*` | 7.16 |
| `react` / `react-dom` | 18.3 |
| `vite` | 8 |
| `@shopify/cli` | 3.93.2 · `@shopify/mini-oxygen` 4.1.0 |
| `qs` | 6.x (Strapi query serialization) |
| Language | **JavaScript + JSDoc** (no TS source; types come from generated `.d.ts` + JSDoc) |
| React Router future flags | `v8_passThroughRequests` + `v8_trailingSlashAwareDataRequests` enabled (+ the Hydrogen preset's flags) |

> **Node:** the app requires Node **22 or 24**. This shell often defaults to Node **10**, which makes the Shopify CLI fail with `SyntaxError: Unexpected identifier`. Prefix commands with the nvm Node 22 path:
> `export PATH="/Users/eruiz/.nvm/versions/node/v22.22.2/bin:$PATH"`

## Deployment (Oxygen)

Set up via the **Hydrogen sales channel** (storefront "hosemonster"), GitHub-integrated:

- push **`staging`** → **Staging** environment (`staging-…myshopify.dev`, private/login-gated)
- merge PR into **`main`** → **Production** (`hosemonste…myshopify.dev`)
- any other branch → an ephemeral **Preview** deployment
- The deploy GitHub Action lives at `.github/workflows/oxygen-deployment-1000155700.yml` and must exist on a branch for pushes to it to deploy.
- **Plan is Grow** = 1 public environment. Production should be set **Public** (Hydrogen channel → Storefront settings → Environments → URL privacy); staging stays private.
- Deployments are **immutable** — env-var changes require a redeploy.

## Environment variables

| Variable | Source | Notes |
|---|---|---|
| `SESSION_SECRET`, `PUBLIC_STOREFRONT_API_TOKEN`, `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_ID`, `PRIVATE_STOREFRONT_API_TOKEN`, `PUBLIC_CUSTOMER_ACCOUNT_API_*`, `SHOP_ID` | Shopify | Auto-injected by Oxygen ("Read-only variables"); locally via `h2 env pull` |
| `STRAPI_API_URL` | Strapi | Origin only, no `/api`. Differs per environment (staging vs prod Strapi on DO) |
| `STRAPI_API_TOKEN` | Strapi | **Secret.** Bearer token for the Strapi REST API |
| `PREVIEW_SECRET` | Preview | **Secret.** Gates `/page-preview`; preview is disabled until set |

Local values live in `.env` (gitignored). Deployed values go in Oxygen → **Custom variables**, per environment, secrets marked secret.

## Directory structure

```
├── server.js                     # Oxygen worker entry (fetch handler → RR)
├── react-router.config.js        # RR config: hydrogenPreset + v8 future flags
├── vite.config.js                # hydrogen() + oxygen() + reactRouter() plugins
├── .graphqlrc.js                 # GraphQL codegen — Shopify schemas ONLY (Strapi is REST)
├── env.d.ts                      # Env + HydrogenAdditionalContext types (Strapi vars, context.strapi)
├── jsconfig.json                 # ~/* → app/* path alias
├── PROJECT_STRUCTURE.md          # ← this file
└── app/
    ├── root.jsx                  # Root layout/loader; fetches Shopify header + Strapi header/footer/404;
    │                             #   ErrorBoundary renders the CMS 404 inside PageLayout
    ├── routes.js                 # fs-routes + hydrogenRoutes()
    ├── entry.client.jsx / entry.server.jsx
    ├── lib/
    │   ├── context.js            # Builds Hydrogen context; injects `context.strapi` via additionalContext
    │   ├── strapi.js             # ★ Strapi REST client: fetch / getPage / getSingle / getPreview
    │   ├── strapi-media.js       # ★ resolves relative Strapi media URLs → absolute
    │   ├── fragments.js          # Shopify GraphQL fragments (cart, HEADER_QUERY, FOOTER_QUERY)
    │   ├── session.js, redirect.js, search.js, variants.js, orderFilters.js
    ├── components/
    │   ├── Header.jsx            # renders CMS header text (fallback shop name) + Shopify menu + cart/account/search
    │   ├── Footer.jsx            # renders CMS footer text + Shopify footer menu
    │   ├── PageLayout.jsx        # threads cmsHeader/cmsFooter to Header/Footer
    │   ├── cms/                  # ★ ALL Strapi CMS rendering
    │   │   ├── registry.js       #   __component → { Component, populate options }  (single source of truth)
    │   │   ├── BlockManager.jsx  #   renders a dynamic zone of modules
    │   │   ├── CmsLink.jsx       #   resolves Strapi link (internal/external)
    │   │   ├── NotFound.jsx      #   CMS 404 content
    │   │   └── modules/          #   one component per Strapi module __component
    │   │       ├── Wysiwyg.jsx        (module.wysiwyg)
    │   │       └── ImageContent.jsx   (module.image-content)
    │   └── … (cart, product, search, aside components — Shopify skeleton)
    ├── graphql/customer-account/ # Customer Account API GraphQL docs
    ├── routes/                   # see Routing below
    └── styles/app.css, reset.css # global CSS (incl. .cms-*, .footer-cms-copy, .cms-not-found)
```
`★` = added for the Strapi integration.

## Data fetching

- **Shopify (GraphQL):** `context.storefront.query(QUERY, {variables})`. Queries live at the bottom of route files or in `app/lib/fragments.js`. Types generated into `storefrontapi.generated.d.ts` via `npm run codegen`.
- **Strapi (REST):** `context.strapi.*` (see `app/lib/strapi.js`). No codegen — plain REST + `qs`. Cached with Hydrogen's `createWithCache`.

`context.strapi` methods:
| Method | Use |
|---|---|
| `fetch(path, params, opts)` | low-level cached REST GET |
| `getPage(path, status?)` | CMS page by `path` field; two-pass dynamic-zone populate |
| `getSingle(name, opts?)` | single types (`header`, `footer`, `page-not-found`, globals) |
| `getPreview(collection, documentId)` | draft-by-documentId, two-pass, cache-bypassed (preview) |

## Strapi CMS integration — how it fits together

1. **Client** (`app/lib/strapi.js`) built in `app/lib/context.js` and injected as `context.strapi`.
2. **Registry** (`app/components/cms/registry.js`) maps each Strapi `__component` to its React component **and** its Strapi `populate` options — one source of truth for both rendering and querying.
3. **Pages:** the catch-all route `app/routes/$.jsx` calls `strapi.getPage('/' + params['*'])`, renders modules via `<BlockManager>`, sets SEO `meta`, and throws 404 if no page (→ Shopify `storefrontRedirect` fallback).
4. **Preview:** `app/routes/page-preview.jsx` (`/page-preview?type=page&id=<documentId>&secret=…`) renders drafts; secret-gated, `noindex`.
5. **404:** the root `ErrorBoundary` renders `NotFound` (from the `page-not-found` single type) for ANY 404, wrapped in `PageLayout` so it has header/footer.
6. **Header/Footer:** root loader fetches the `header`/`footer` single types; `Header`/`Footer` render their text (nav still Shopify menus for now).
7. **Sitemap:** `app/routes/[sitemap-pages.xml].jsx` lists published Strapi pages; injected into the Shopify index in `[sitemap.xml].jsx` and advertised in `[robots.txt].jsx`.

## Routing

File-system routing (`@react-router/fs-routes`): flat files, dots = path separators, `$` = dynamic segment, `[brackets]` = literal filename.

- `_index.jsx` → `/` (Shopify homepage — NOT CMS-driven)
- `$.jsx` → root catch-all → **Strapi CMS pages** by path, else 404
- `products.$handle`, `collections.$handle`, `blogs.*`, `pages.$handle`, `policies.*`, `cart*`, `account*`, `search` → Shopify
- `page-preview` → Strapi draft preview
- `[sitemap.xml]`, `[sitemap-pages.xml]`, `sitemap.$type.$page[.xml]`, `[robots.txt]` → SEO

## Common tasks

**Add a CMS module:** create `app/components/cms/modules/<Name>.jsx`, then add an entry to `app/components/cms/registry.js` (`'module.<uid>': { Component, options: { populate } }`). The `__component` UID must match Strapi exactly. `BlockManager` skips unknown modules.

**Run locally / build (Node 22):**
```
export PATH="/Users/eruiz/.nvm/versions/node/v22.22.2/bin:$PATH"
npm run dev        # http://localhost:3000  (add -- --customer-account-push to test sign-in)
npm run build
```

**Deploy:** push to `staging` (auto-deploys to Staging); PR → `main` for Production.

## Deferred / not yet built

- Products inside CMS modules (Shopify product enrichment of Strapi modules)
- Real header/footer nav fields (only a text field rendered so far; nav is still Shopify menus)
- Strapi-driven redirects
- Whether the CMS should own `/` (homepage is currently the Shopify skeleton)
- A Workers-compatible HTML sanitizer for the WYSIWYG module
- Trimming the Shopify sitemap's locale list (`EN-US/EN-CA/FR-CA`) to the single active locale
