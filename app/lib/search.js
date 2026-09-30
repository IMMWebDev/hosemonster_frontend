/**
 * Shared helpers for the quick-search panel (~/components/search/QuickSearch)
 * and the /search page.
 */

export const SEARCH_PATH = '/search';

/** Results per page on /search — the same as a collection's Product Feed. */
export const SEARCH_PAGE_SIZE = 12;

/** Where a search that finds nothing points people (a Shopify page). */
export const CONTACT_PATH = '/contact';

/** Placeholder for the header and /search boxes; Hero Search sets its own. */
export const SEARCH_PLACEHOLDER = 'Search equipment, parts, or part #';

/**
 * The /search URL for a term, or the bare page when there is none.
 *
 * @param {string} [term]
 */
export function searchUrl(term) {
  const q = String(term ?? '').trim();
  return q ? `${SEARCH_PATH}?${new URLSearchParams({q})}` : SEARCH_PATH;
}

/**
 * A result URL with Shopify's search tracking parameters appended.
 *
 * Shopify returns `trackingParameters` on every search result so it can tell
 * which result was clicked for which query — that is what feeds the search
 * reports in the admin and the Search & Discovery app's relevance tuning.
 * Dropping them costs nothing visible and loses that data silently.
 *
 * `q` goes in as the raw term. The starter wrapped it in encodeURIComponent
 * before URLSearchParams, which encodes it a second time — a search for
 * "2½ hose" reached the product page as "2%25C2%25BD%2520hose".
 *
 * @param {{baseUrl: string, trackingParams?: string | null, term: string}} args
 */
export function urlWithTrackingParams({baseUrl, trackingParams, term}) {
  let search = new URLSearchParams({q: term}).toString();
  if (trackingParams) search = `${search}&${trackingParams}`;
  return `${baseUrl}?${search}`;
}

/**
 * Splits a query suggestion into what the visitor typed and what Shopify
 * predicted, so the PREDICTED part can be emphasised.
 *
 * Baymard's autocomplete testing found the opposite of the common instinct:
 * bolding the typed text highlights the one part the visitor already knows,
 * while bolding the rest makes the differences between suggestions scannable.
 *
 * Done from the plain text rather than Shopify's `styledText`, which is HTML —
 * rendering it would mean dangerouslySetInnerHTML on API output for the sake
 * of two tags.
 *
 * @param {string} text - the suggestion
 * @param {string} term - what was typed
 * @returns {Array<{key: string, text: string, typed: boolean}>}
 */
export function splitSuggestion(text, term) {
  const needle = String(term ?? '')
    .trim()
    .toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return [{key: 'all', text, typed: false}];

  return [
    {key: 'before', text: text.slice(0, at), typed: false},
    {key: 'typed', text: text.slice(at, at + needle.length), typed: true},
    {key: 'after', text: text.slice(at + needle.length), typed: false},
  ].filter((part) => part.text);
}
