import {useCallback, useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {SEARCH_PATH} from '~/lib/search';

/** Wait this long after the last keystroke before asking Shopify. */
const DEBOUNCE_MS = 150;

/**
 * Type-ahead results from the /search route's predictive branch.
 *
 * Shared by every search box on the site — the header's quick-search panel,
 * the /search page's box, and the shop hero's — so suggestions behave the
 * same everywhere and a change to what they return is made once.
 *
 * Each caller gets its OWN fetcher (useFetcher with no key), so two boxes on
 * one page never show each other's results.
 *
 * Results are only handed back for terms searched in the current SESSION (see
 * `reset`). The header panel stays mounted for the whole visit, so without
 * this, reopening it for a new term flashed the previous visit's results —
 * even "No results for …" — under a box that said something else.
 *
 * @returns {{
 *   data: object | undefined,
 *   isLoading: boolean,
 *   search: (value: string, options?: {immediate?: boolean}) => void,
 *   cancel: () => void,
 *   reset: () => void,
 * }}
 */
export function usePredictiveSearch() {
  const fetcher = useFetcher();
  const debounceRef = useRef(null);
  const sessionRef = useRef(new Set());

  // True from a keystroke until its request starts, so containers can dim
  // stale results during the debounce as well as during the fetch.
  const [pending, setPending] = useState(false);

  /*
   * The fetcher object is a new identity every render; holding it in a ref
   * keeps `search` stable, so callers can use it in effects and handlers
   * without re-subscribing on every keystroke.
   */
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cancel = useCallback(() => {
    clearTimeout(debounceRef.current);
    setPending(false);
  }, []);

  const search = useCallback((value, {immediate = false} = {}) => {
    clearTimeout(debounceRef.current);
    const q = String(value ?? '').trim();
    if (!q) {
      setPending(false);
      return;
    }

    sessionRef.current.add(q.toLowerCase());

    const run = () => {
      setPending(false);
      void fetcherRef.current.load(
        `${SEARCH_PATH}?${new URLSearchParams({predictive: '1', q})}`,
      );
    };

    if (immediate) {
      run();
    } else {
      setPending(true);
      debounceRef.current = setTimeout(run, DEBOUNCE_MS);
    }
  }, []);

  /** Start a new session: results for earlier terms are no longer shown. */
  const reset = useCallback(() => {
    sessionRef.current = new Set();
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const loaded = fetcher.data;
  const inSession =
    loaded &&
    sessionRef.current.has(String(loaded.term ?? '').trim().toLowerCase());

  return {
    data: inSession ? loaded : undefined,
    isLoading: pending || fetcher.state === 'loading',
    search,
    cancel,
    reset,
  };
}
