/**
 * Sort and filter state for a collection page, carried in the URL.
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

/** URL param holding one active filter, repeated per active value. */
export const FILTER_PARAM = 'filter';

/** URL param holding the chosen sort. */
export const SORT_PARAM = 'sort';

/**
 * @param {URLSearchParams} searchParams
 * @returns {{value: string, label: string, sortKey: string, reverse: boolean}}
 */
export function sortFromSearchParams(searchParams) {
  const value = searchParams.get(SORT_PARAM);
  return SORT_OPTIONS.find((o) => o.value === value) ?? DEFAULT_SORT;
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
 * not 500 the page.
 *
 * @param {URLSearchParams} searchParams
 * @returns {object[]}
 */
export function filtersFromSearchParams(searchParams) {
  const filters = [];

  for (const raw of searchParams.getAll(FILTER_PARAM)) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        filters.push(parsed);
      }
    } catch {
      // Ignore malformed input.
    }
  }

  return filters;
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
 * @param {URLSearchParams} searchParams
 * @param {string} value - a SORT_OPTIONS value
 * @returns {URLSearchParams}
 */
export function withSort(searchParams, value) {
  const next = new URLSearchParams(searchParams);
  if (value && value !== DEFAULT_SORT.value) next.set(SORT_PARAM, value);
  else next.delete(SORT_PARAM);
  clearPaging(next);
  return next;
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

/** Hydrogen's pagination cursors, which no longer point anywhere useful. */
function clearPaging(searchParams) {
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
