/**
 * Sort and filter state for a collection page or /search, carried in the URL.
 * Both speak the same Storefront `ProductFilter` input, so one set of helpers
 * serves both; only the sort list differs.
 *
 * The URL is the source of truth, not component state: changing a filter has to
 * re-run the loader so Shopify recomputes both the products AND the facet
 * counts. It also makes a filtered view linkable and the back button correct.
 */

/**
 * The four sorts the design offers, mapped to Storefront sort keys.
 *
 * `featured` is COLLECTION_DEFAULT, NOT MANUAL. MANUAL reads a collection's
 * hand-dragged order, which an AUTOMATED collection does not have — on these it
 * returns an arbitrary internal order that ignores the merchandiser entirely.
 * COLLECTION_DEFAULT honours whatever "Sort" is set on the collection in the
 * Shopify admin, so changing that setting changes what "Featured" means without
 * touching this file.
 */
export const SORT_OPTIONS = [
  {
    value: 'featured',
    label: 'Featured',
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
  },
  {
    value: 'price-asc',
    label: 'Price: low to high',
    sortKey: 'PRICE',
    reverse: false,
  },
  {
    value: 'price-desc',
    label: 'Price: high to low',
    sortKey: 'PRICE',
    reverse: true,
  },
  {value: 'title-asc', label: 'Name: A–Z', sortKey: 'TITLE', reverse: false},
];

export const DEFAULT_SORT = SORT_OPTIONS[0];

/**
 * The sorts a SEARCH can offer. Shorter than a collection's because the
 * Storefront `search` query only accepts RELEVANCE and PRICE — there is no
 * title sort, and "Featured" means nothing without a collection to feature it.
 * Relevance comes first because it is the default: a search sorted by anything
 * else buries the best match.
 */
export const SEARCH_SORT_OPTIONS = [
  {
    value: 'relevance',
    label: 'Relevance',
    sortKey: 'RELEVANCE',
    reverse: false,
  },
  {
    value: 'price-asc',
    label: 'Price: low to high',
    sortKey: 'PRICE',
    reverse: false,
  },
  {
    value: 'price-desc',
    label: 'Price: high to low',
    sortKey: 'PRICE',
    reverse: true,
  },
];

/** URL param holding one active filter, repeated per active value. */
export const FILTER_PARAM = 'filter';

/** URL param holding the chosen sort. */
export const SORT_PARAM = 'sort';

/**
 * @param {URLSearchParams} searchParams
 * @param {typeof SORT_OPTIONS} [options] - SEARCH_SORT_OPTIONS on /search
 * @returns {{value: string, label: string, sortKey: string, reverse: boolean}}
 */
export function sortFromSearchParams(searchParams, options = SORT_OPTIONS) {
  const value = searchParams.get(SORT_PARAM);
  return options.find((o) => o.value === value) ?? options[0];
}

/**
 * Active filters, as Storefront `ProductFilter` inputs.
 *
 * Each value is Shopify's OWN `input` string, round-tripped through the URL
 * untouched. That is what keeps this generic: the UI never models what a filter
 * means, so if someone enables the Search & Discovery app and product-type or
 * metafield facets appear, they work here with no code change.
 *
 * Anything unparseable is dropped rather than thrown — a hand-edited URL should
 * not 500 the page. So is the /search page's own category (collection) filter
 * (`{"category": handle}`, see `collectionFilterHandles`): Shopify has no such
 * ProductFilter, and sending one fails the whole query.
 *
 * @param {URLSearchParams} searchParams
 * @returns {object[]}
 */
export function filtersFromSearchParams(searchParams) {
  const filters = [];

  for (const raw of searchParams.getAll(FILTER_PARAM)) {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        !Object.prototype.hasOwnProperty.call(parsed, COLLECTION_KEY)
      ) {
        filters.push(parsed);
      }
    } catch {
      // Ignore malformed input.
    }
  }

  return filters;
}

/*
 * The /search page's collection filter, shown to visitors as "Category" —
 * "collection" is Shopify's word. Storefront search can't filter by
 * collection, so the route applies it itself (see routes/search.jsx). It rides
 * in the same `filter` param as Shopify's filters, as {"category": handle},
 * so the rail's checkboxes, the chips and Clear all handle it with no special
 * case.
 */
const COLLECTION_KEY = 'category';

/**
 * @param {string} handle
 * @returns {string} the filter value's `input`, as the rail and chips use it
 */
export function collectionFilterInput(handle) {
  return JSON.stringify({[COLLECTION_KEY]: handle});
}

/**
 * Collection handles chosen in the /search collection filter.
 *
 * @param {URLSearchParams} searchParams
 * @returns {Set<string>}
 */
export function collectionFilterHandles(searchParams) {
  const handles = new Set();
  for (const raw of searchParams.getAll(FILTER_PARAM)) {
    try {
      const handle = JSON.parse(raw)?.[COLLECTION_KEY];
      if (typeof handle === 'string' && handle) handles.add(handle);
    } catch {
      // Ignore malformed input.
    }
  }
  return handles;
}

/**
 * True when this filter value is currently applied.
 *
 * Compares re-serialised JSON rather than the raw strings, so key order or
 * whitespace differences between Shopify's `input` and what is in the URL do
 * not read as a mismatch.
 *
 * @param {URLSearchParams} searchParams
 * @param {string} input - a Filter value's `input` JSON string
 */
export function isFilterActive(searchParams, input) {
  const target = stableStringify(input);
  if (target === undefined) return false;
  return searchParams
    .getAll(FILTER_PARAM)
    .some((raw) => stableStringify(raw) === target);
}

/**
 * Search params with one filter value toggled on or off, and the page reset.
 *
 * Paging is dropped on every change: page 3 of the old result set is rarely
 * page 3 of the new one, and leaving the cursor would show an empty page.
 *
 * @param {URLSearchParams} searchParams
 * @param {string} input
 * @returns {URLSearchParams}
 */
export function toggleFilter(searchParams, input) {
  const next = new URLSearchParams(searchParams);
  const target = stableStringify(input);
  const existing = next.getAll(FILTER_PARAM);

  next.delete(FILTER_PARAM);
  let removed = false;

  for (const raw of existing) {
    if (!removed && stableStringify(raw) === target) {
      removed = true;
      continue;
    }
    next.append(FILTER_PARAM, raw);
  }

  if (!removed && target !== undefined) next.append(FILTER_PARAM, input);

  clearPaging(next);
  return next;
}

/**
 * The default sort is left OUT of the URL rather than written in, so the plain
 * address and the default view are one URL, not two.
 *
 * @param {URLSearchParams} searchParams
 * @param {string} value - a value from `options`
 * @param {typeof SORT_OPTIONS} [options] - the list `value` came from
 * @returns {URLSearchParams}
 */
export function withSort(searchParams, value, options = SORT_OPTIONS) {
  const next = new URLSearchParams(searchParams);
  if (value && value !== options[0].value) next.set(SORT_PARAM, value);
  else next.delete(SORT_PARAM);
  clearPaging(next);
  return next;
}

/**
 * Search params with ONE raw filter string removed — what a filter chip's ×
 * does. Takes the raw URL value rather than Shopify's `input`, because a chip
 * is built from what is in the URL and has to remove exactly that.
 *
 * @param {URLSearchParams} searchParams
 * @param {string} raw
 * @returns {URLSearchParams}
 */
export function removeFilter(searchParams, raw) {
  const next = new URLSearchParams(searchParams);
  const kept = next.getAll(FILTER_PARAM).filter((r) => r !== raw);
  next.delete(FILTER_PARAM);
  for (const r of kept) next.append(FILTER_PARAM, r);
  clearPaging(next);
  return next;
}

/**
 * Human labels for the filters currently in the URL — the removable chips §07
 * draws above a filtered grid.
 *
 * Labels come from Shopify's own facet values, matched on the same
 * re-serialised JSON `isFilterActive` uses. A price range has no value to
 * match (Shopify returns one bounds value, not the chosen range), so it is
 * labelled from the URL. Anything that matches neither is still returned, as
 * "Filter", so a stale value in a pasted URL can be removed rather than
 * silently narrowing the results with no visible cause.
 *
 * @param {Array<{label: string, type: string, values: Array<{label: string, input: string}>}>} facets
 * @param {URLSearchParams} searchParams
 * @returns {Array<{raw: string, label: string}>}
 */
export function activeFilterLabels(facets, searchParams) {
  return searchParams.getAll(FILTER_PARAM).map((raw) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {raw, label: 'Filter'};
    }

    if (parsed?.price) {
      const {min, max} = parsed.price;
      const fmt = (n) => `$${Number(n).toLocaleString('en-US')}`;
      const label =
        min != null && max != null
          ? `${fmt(min)} – ${fmt(max)}`
          : min != null
            ? `${fmt(min)} and up`
            : `Up to ${fmt(max)}`;
      return {raw, label};
    }

    const target = stableStringify(raw);
    for (const facet of facets ?? []) {
      const match = (facet.values ?? []).find(
        (v) => stableStringify(v.input) === target,
      );
      if (match) return {raw, label: `${facet.label}: ${match.label}`};
    }
    return {raw, label: 'Filter'};
  });
}

/**
 * Search params with the price range replaced.
 *
 * A price filter is singular — a second one would silently AND with the first
 * and return nothing — so any existing price filter is dropped rather than
 * appended to. Empty or non-numeric bounds are omitted, which lets you set only
 * a floor or only a ceiling.
 *
 * @param {URLSearchParams} searchParams
 * @param {string | number} min
 * @param {string | number} max
 * @returns {URLSearchParams}
 */
export function setPriceRange(searchParams, min, max) {
  const next = new URLSearchParams(searchParams);
  const kept = next
    .getAll(FILTER_PARAM)
    .filter((raw) => !hasPriceKey(raw));

  next.delete(FILTER_PARAM);
  for (const raw of kept) next.append(FILTER_PARAM, raw);

  const price = {};
  if (min !== '' && Number.isFinite(Number(min))) price.min = Number(min);
  if (max !== '' && Number.isFinite(Number(max))) price.max = Number(max);

  if (Object.keys(price).length > 0) {
    next.append(FILTER_PARAM, JSON.stringify({price}));
  }

  clearPaging(next);
  return next;
}

/** @param {string} raw */
function hasPriceKey(raw) {
  try {
    return Object.prototype.hasOwnProperty.call(JSON.parse(raw), 'price');
  } catch {
    return false;
  }
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {URLSearchParams}
 */
export function clearFilters(searchParams) {
  const next = new URLSearchParams(searchParams);
  next.delete(FILTER_PARAM);
  clearPaging(next);
  return next;
}

/*
 * Back to page one.
 *
 * Called by every helper that changes WHICH products are in the list — sort,
 * facet toggle, price range, clear all. "Page 3" means items 25-36 of one
 * particular ordering; change the ordering and item 25 is a different product,
 * so holding the page number would show an arbitrary slice of a list the
 * visitor never saw the start of.
 *
 * `cursor` and `direction` are Hydrogen's, left here because an old bookmark or
 * a stale link can still carry them and they would otherwise sit in the URL
 * forever doing nothing.
 */
function clearPaging(searchParams) {
  searchParams.delete('page');
  searchParams.delete('cursor');
  searchParams.delete('direction');
}

/**
 * @param {string} raw
 * @returns {string | undefined}
 */
function stableStringify(raw) {
  try {
    return JSON.stringify(sortKeysDeep(JSON.parse(raw)));
  } catch {
    return undefined;
  }
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeysDeep(value[k])]),
    );
  }
  return value;
}
