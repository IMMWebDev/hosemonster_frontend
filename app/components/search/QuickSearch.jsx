import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher, useLocation, useNavigate} from 'react-router';
import {useAside} from '~/components/Aside';
import {
  PredictiveEmptyState,
  PredictiveMessage,
  PredictiveResults,
  ResultsAnnouncer,
  moveThroughResults,
} from '~/components/search/PredictiveResults';
import {usePredictiveSearch} from '~/lib/use-predictive-search';
import {SEARCH_PATH, SEARCH_PLACEHOLDER, searchUrl} from '~/lib/search';
import styles from './QuickSearch.module.css';

/** The dialog's id — the header's search button points at it. */
export const QUICK_SEARCH_ID = 'quick-search';

/**
 * Quick search — the modal the header's search button opens.
 *
 * Replaces the Hydrogen starter's search drawer. Research that shaped it:
 *
 *  - A centred modal over a dimmed page, not a side drawer. Side drawers are
 *    the pattern for the cart and the mobile menu; Shopify's own Horizon
 *    theme opens search as a modal. It was first built as a full-width sheet
 *    dropping from the top, which read as the header breaking rather than a
 *    search opening. On a phone it goes full screen.
 *  - Query suggestions and product previews side by side, suggestions first.
 *    Baymard: suggestions steer what people end up searching for, so they get
 *    the prominent column on mobile too, where the keyboard eats half the
 *    screen.
 *  - The PREDICTED part of a suggestion is bold, not the typed part.
 *  - Before anything is typed: categories, so the panel is never an empty
 *    box.
 *  - A search that finds nothing points to the contact page.
 *  - Part numbers work: the predictive query also searches variant SKUs.
 *  - CMS pages are searched too, so "fire flow" can find the Fire Flow page.
 *
 * A native <dialog> opened with showModal(). That gives focus containment,
 * Escape to close, focus returned to the search button afterwards, and the
 * rest of the page made inert to assistive tech — all of which the old drawer
 * either lacked or hand-rolled.
 *
 * Open state still lives in the Aside context (type "search"), so opening the
 * cart or the menu closes search and vice versa, as before. A caller can pass
 * `{term}` as the payload to open it pre-filled — the page search boxes do
 * that on a phone, where this, full screen, is their type-ahead.
 *
 * The results and the fetching behind them are shared with those page boxes:
 * see PredictiveResults.jsx and use-predictive-search.js.
 *
 */
export default function QuickSearch() {
  const {type, payload, open, close} = useAside();
  const isOpen = type === 'search';

  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const resultsId = useId();

  /*
   * Where focus goes when the visitor dismisses the sheet. Normally the
   * dialog's own restore handles it (back to the header's search button). A
   * page box on a phone blurs itself before handing over, so it passes a
   * target in the payload instead; without one, focus fell to <body> and a
   * screen-reader user was sent back to the top of the page.
   */
  const returnFocusRef = useRef(null);
  const dismissedRef = useRef(false);

  const {data: results, isLoading, search, cancel, reset} =
    usePredictiveSearch();
  const browse = useFetcher({key: 'quick-search-browse'});
  const navigate = useNavigate();
  const location = useLocation();

  const [value, setValue] = useState('');

  const term = value.trim();

  /* ---- open / close ---------------------------------------------------- */

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      /*
       * Opened pre-filled (a page search box on a phone): take the term and
       * fetch its results straight away, so the sheet opens already showing
       * what the visitor was looking at.
       */
      const prefill = typeof payload?.term === 'string' ? payload.term : null;
      returnFocusRef.current = payload?.returnFocus ?? null;
      if (prefill !== null) {
        // A new session, and no debounce: the sheet must not flash the
        // previous visit's results under the handed-over term.
        reset();
        setValue(prefill);
        if (prefill.trim()) search(prefill, {immediate: true});
      }

      dialog.showModal();
      // Categories for the empty state, fetched once, on first open — not on
      // every page load for a panel most visits never open.
      if (!browse.data && browse.state === 'idle') {
        void browse.load(`${SEARCH_PATH}?predictive=1&q=`);
      }
      /*
       * Focus set explicitly rather than with autoFocus: React fires autoFocus
       * on mount, when this dialog is still closed, and browsers disagree about
       * what showModal() focuses by default. Selected, so typing replaces the
       * last query while the arrow keys can still edit it.
       */
      const input = inputRef.current;
      input?.focus();
      if (prefill !== null) {
        // Caret at the end of a handed-over term, ready to refine it.
        const end = prefill.length;
        input?.setSelectionRange(end, end);
      } else {
        input?.select();
      }
    } else if (!isOpen && dialog.open) {
      dialog.close();
      /*
       * Only when the visitor dismissed it (Escape, Close, backdrop) — a
       * navigation away should leave focus where the new page puts it.
       */
      const target = returnFocusRef.current;
      if (dismissedRef.current && target?.isConnected) target.focus();
      dismissedRef.current = false;
      returnFocusRef.current = null;
    }
    // `browse` and `payload` are deliberately not dependencies: re-running
    // this when they change would re-open a panel the visitor just closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Any navigation — a result, a chip, the back button — closes the panel.
  useEffect(() => {
    if (isOpen) close();
    // Only the location matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  /*
   * ⌘K / Ctrl+K from anywhere, and "/" when not already typing — the two
   * shortcuts people bring from other sites. The old SearchForm bound ⌘K to
   * focus an input that only existed on /search.
   */
  useEffect(() => {
    function onKeyDown(event) {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash =
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !isTypingTarget(event.target);

      if (isShortcut || isSlash) {
        event.preventDefault();
        open('search');
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  /* ---- input ----------------------------------------------------------- */

  function handleChange(event) {
    const next = event.target.value;
    setValue(next);
    if (next.trim()) search(next);
    else cancel();
  }

  function handleSubmit(event) {
    event.preventDefault();
    go(term);
  }

  function clearInput() {
    setValue('');
    cancel();
    inputRef.current?.focus();
  }

  /** Runs a full search for `q` on /search. */
  function go(q) {
    navigate(q ? searchUrl(q) : SEARCH_PATH);
    close();
  }

  /** For result links: close the panel and let the link navigate. */
  function onResultClick() {
    close();
  }

  /** Closed by the visitor rather than by a navigation — focus returns. */
  function dismiss() {
    dismissedRef.current = true;
    close();
  }

  function handleKeyDown(event) {
    /*
     * Escape closes, first time, every time. Left to the browser, Escape in a
     * search field that has text only CLEARS the field (Chrome, Safari), so
     * it took two presses to dismiss the panel — and the first one silently
     * threw away what had been typed.
     */
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }

    moveThroughResults(event, dialogRef.current, inputRef.current);
  }

  /*
   * A click on the backdrop lands on the <dialog> element itself; a click on
   * the panel lands on something inside it. Native dialogs do not close on a
   * backdrop click by themselves.
   */
  function handleDialogClick(event) {
    if (event.target === event.currentTarget) dismiss();
  }

  /* ---- render ---------------------------------------------------------- */

  const data = term ? results : null;

  return (
    /*
     * The handlers are on the dialog itself because that is where a backdrop
     * click lands and where Escape and the arrow keys need catching from any
     * child. A modal dialog is an interactive container; the rule predates
     * <dialog> being usable.
     */
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      id={QUICK_SEARCH_ID}
      className={styles.dialog}
      aria-label="Search"
      // Escape closes a modal dialog natively; this keeps the context in step.
      onClose={() => {
        if (isOpen) close();
      }}
      onClick={handleDialogClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.panel}>
        <div className={styles.bar}>
          <div className={styles.barInner}>
            <form
              role="search"
              action={SEARCH_PATH}
              method="get"
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <svg
                className={styles.formIcon}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="4.75" />
                <path d="M10.5 10.5 14 14" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                name="q"
                value={value}
                onChange={handleChange}
                placeholder={SEARCH_PLACEHOLDER}
                aria-label="Search"
                aria-controls={resultsId}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                className={styles.input}
              />
              {value ? (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={clearInput}
                  aria-label="Clear search"
                >
                  <CloseIcon />
                </button>
              ) : null}
              <button type="submit" className={styles.submit}>
                Search
              </button>
            </form>

            <button
              type="button"
              className={styles.close}
              onClick={dismiss}
              aria-label="Close search"
            >
              <span className={styles.closeLabel}>Close</span>
              <CloseIcon />
            </button>
          </div>
        </div>

        <div
          id={resultsId}
          className={styles.body}
          data-loading={isLoading && term ? '' : undefined}
        >
          <div className={styles.bodyInner}>
            {!term ? (
              <PredictiveEmptyState
                categories={browse.data?.browseCollections ?? []}
                onNavigate={onResultClick}
              />
            ) : data?.error ? (
              <PredictiveMessage>
                Search is unavailable right now. Press Enter to try the full
                search page.
              </PredictiveMessage>
            ) : data ? (
              <PredictiveResults
                data={data}
                term={term}
                onNavigate={onResultClick}
                onViewAll={() => go(term)}
              />
            ) : (
              <PredictiveMessage>Searching…</PredictiveMessage>
            )}
          </div>
        </div>

        <ResultsAnnouncer data={data} />
      </div>
    </dialog>
  );
}

function CloseIcon() {
  return (
    <svg
      className={styles.closeIcon}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/**
 * True when a keypress is going into a text field, where "/" is a character
 * rather than a shortcut.
 *
 * @param {EventTarget | null} target
 */
function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}
