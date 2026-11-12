import {createContext, createElement, useContext} from 'react';

/**
 * Tracking IDs — stable, readable names for analytics tags (Google Tag
 * Manager), so a tag can target one button in one module without relying on
 * its text, its classes or where it happens to sit in the markup.
 *
 * THE SCHEME
 *
 *   Module  data-track-module = {page}__{module}
 *             smart-monster__text-media-2        automatic
 *             smart-monster__lrc-addon           Tracking ID set in Strapi
 *
 *   Button  data-track-id = {page}__{module}__{role}
 *             smart-monster__lrc-addon__primary-cta
 *             smart-monster__card-grid-1__card-3
 *
 *   Site-wide chrome has no {page} part — it's the same on every page:
 *             header__nav-shop    footer__phone    cart-drawer__checkout
 *
 *   {page}    the URL path, slugged: "/" is home, "/smart-monster" is
 *             smart-monster, "/collections/dechlorination" is
 *             collections-dechlorination.
 *   {module}  the module's Tracking ID from Strapi when one is set; otherwise
 *             its type plus its position among modules of that type on the
 *             page (the second Text & Media is text-media-2).
 *   {role}    fixed in code, per module: primary-cta, secondary-cta, card-3,
 *             product-{handle}… Never the button's text, which editors change.
 *
 * The automatic {module} shifts if an editor adds or reorders modules of the
 * same type above it, so a module should get a Tracking ID before a tag
 * depends on it. The Tracking ID can be typed any way — it's slugged here.
 *
 * Tags target the data attributes, not HTML ids — in GTM, a Click trigger on
 * "Click Element matches CSS selector [data-track-id="…"]". A module's root
 * also gets an HTML id of just its {module} part, for anchor links
 * (/smart-monster#lrc-addon).
 *
 * HOW IT'S WIRED
 *
 *   BlockManager wraps each module in a <TrackingScope>. Inside it:
 *     - the module spreads useTrackingRoot() onto its root element;
 *     - CmsLink takes a `trackRole` and adds data-track-id itself;
 *     - any other control uses useTrackId(): data-track-id={trackId('role')}.
 *   Site-wide chrome (Header, Footer, Newsletter…) sets up its own
 *   <TrackingScope id="header"> the same way.
 */

/** @typedef {{moduleId: string, anchor: string | null}} TrackingScopeValue */

/*
 * Fixed anchors some modules set on themselves; their pager links jump to them
 * (?page=2#products). Defined here rather than in the modules so
 * moduleTrackingIds can keep a Tracking ID from claiming one — a Card Grid
 * named "Products" above a Product Feed would otherwise take the jump.
 */
export const FEED_ANCHOR = 'products';
export const RESULTS_ANCHOR = 'results';

/** @type {import('react').Context<TrackingScopeValue | null>} */
export const TrackingContext = createContext(
  /** @type {TrackingScopeValue | null} */ (null),
);

/**
 * Lowercase, hyphenated, ASCII-only: "Fire Pump Testing™" → "fire-pump-testing".
 *
 * @param {unknown} value
 */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '') // "what's" → "whats", not "what-s"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The {page} part: the path, slugged; the homepage is "home".
 *
 * @param {string} [pathname]
 */
export function pageKeyFromPath(pathname = '/') {
  return slugify(pathname) || 'home';
}

/**
 * One {anchor, moduleId} per block, in order. Unique within the page: two
 * modules given the same Tracking ID — or a Tracking ID that happens to match
 * an automatic one, or Product Feed's / Search's fixed anchor — get -2, -3… on
 * the later ones.
 *
 * @param {Array<{__component: string, trackingId?: string | null}>} blocks
 * @param {string} pageKey
 */
export function moduleTrackingIds(blocks, pageKey) {
  /** @type {Record<string, number>} */
  const countByType = {};
  // 'main' is the skip link's target (<main id="main">, PageLayout.jsx).
  const used = new Set([FEED_ANCHOR, RESULTS_ANCHOR, 'main']);

  return blocks.map(({__component, trackingId}) => {
    const type = slugify(String(__component).replace(/^module\./, ''));
    countByType[type] = (countByType[type] ?? 0) + 1;

    let anchor = slugify(trackingId) || `${type}-${countByType[type]}`;
    if (used.has(anchor)) {
      let n = 2;
      while (used.has(`${anchor}-${n}`)) n += 1;
      anchor = `${anchor}-${n}`;
    }
    used.add(anchor);

    return {anchor, moduleId: `${pageKey}__${anchor}`};
  });
}

/**
 * Names everything inside it. `id` is the module id ("smart-monster__lrc-addon"
 * or, for chrome, just "header"); `anchor` is the HTML id for the root, if
 * any.
 *
 * @param {{id: string, anchor?: string | null, children?: import('react').ReactNode}} props
 */
export function TrackingScope({id, anchor = null, children}) {
  return createElement(
    TrackingContext.Provider,
    {value: {moduleId: id, anchor}},
    children,
  );
}

/**
 * Attributes for a module's root element: its HTML id (the {module} part) and
 * data-track-module. Spread it BEFORE any id the module sets itself, so an
 * existing anchor (Product Feed's, Search's) keeps winning.
 *
 * @returns {{id?: string, 'data-track-module'?: string}}
 */
export function useTrackingRoot() {
  const scope = useContext(TrackingContext);
  if (!scope) return {};
  return {
    ...(scope.anchor ? {id: scope.anchor} : {}),
    'data-track-module': scope.moduleId,
  };
}

/**
 * A function that turns a role into this scope's data-track-id
 * ("primary-cta" → "smart-monster__lrc-addon__primary-cta"). Undefined outside
 * a scope, so the attribute is simply left off.
 *
 * @returns {(role: string | null | undefined) => string | undefined}
 */
export function useTrackId() {
  const scope = useContext(TrackingContext);
  return (role) => {
    const slug = slugify(role);
    return scope && slug ? `${scope.moduleId}__${slug}` : undefined;
  };
}
