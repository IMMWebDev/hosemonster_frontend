import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Form, useLocation, useNavigate} from 'react-router';
import {useAside} from '~/components/Aside';
import {
  PredictiveMessage,
  PredictiveResults,
  ResultsAnnouncer,
  moveThroughResults,
} from '~/components/search/PredictiveResults';
import {useIsomorphicLayoutEffect} from '~/lib/use-isomorphic-layout-effect';
import {usePredictiveSearch} from '~/lib/use-predictive-search';
import {SEARCH_PATH, searchUrl} from '~/lib/search';
import styles from './SearchBox.module.css';

/** Matches the house `mdTablet` breakpoint (app/styles/layout.css). */
const PHONE_QUERY = '(max-width: 699px)';

/** The dropdown never gets shorter than this, however little room is left
 * below the box — the page scrolls to reveal the rest instead. */
const MIN_DROPDOWN_HEIGHT = 240;

/**
 * A page search box with the same type-ahead as the header's quick search —
 * used by the /search page's Search module and the shop's Hero Search.
 *
 *  - Desktop and tablet: a dropdown under the box, opened by typing. It stays
 *    shut on a results page until the visitor changes the text, so arriving
 *    on /search?q=gauge does not throw a dropdown over the results.
 *  - Phone: focusing the box opens the header's full-screen quick-search
 *    sheet, pre-filled with the box's text. A dropdown squeezed between the
 *    keyboard and the page is the pattern Baymard found hardest to use; the
 *    sheet is already built for exactly that screen.
 *
 * The dropdown is portalled to <body>. Both boxes sit in hero panels with
 * `overflow: clip` (for the parallax photo), and every page's modules sit in
 * PageWatermark's clipped wrapper — rendered in place, a tall dropdown was cut
 * off at the panel edge, or at the end of a short page. The cost is that the
 * dropdown is last in the document, after the footer, so Tab and Shift+Tab are
 * steered by hand — see handleKeyDown.
 *
 * Styling of the bar itself stays with each module, passed in `classNames`,
 * so each can match its own design; this owns the behaviour and the dropdown.
 * Before hydration it is a plain GET form to /search, as before.
 *
 * @param {{
 *   defaultValue?: string,
 *   placeholder: string,
 *   buttonLabel?: string,
 *   label?: string,
 *   showIcon?: boolean,
 *   classNames: {form: string, input: string, button: string, icon?: string},
 * }} props
 */
export default function SearchBox({
  defaultValue = '',
  placeholder,
  buttonLabel = 'Search',
  label = 'Search',
  showIcon = false,
  classNames,
}) {
  const inputId = useId();
  const dropdownId = useId();
  const formRef = useRef(null);
  const inputRef = useRef(null);
  const submitRef = useRef(null);
  const dropdownRef = useRef(null);

  /*
   * One-shot guard for focus WE move back into the input (Escape from a
   * result, Shift+Tab out of the list). Without it, handleFocus saw typed
   * text with results and reopened the dropdown in the same batch that was
   * closing it, so Escape from a result left it open.
   */
  const suppressFocusRef = useRef(false);

  const {open: openSheet} = useAside();
  const {data, isLoading, search, cancel} = usePredictiveSearch();
  const navigate = useNavigate();
  const location = useLocation();

  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  const term = value.trim();
  // Only once the visitor has changed the text — see the component note.
  const dirty = value !== defaultValue;

  /*
   * Resync to the page on every navigation, and close.
   *
   * The box used to be remounted with key={term} instead, which threw focus
   * to <body> after every search made from it, and missed navigations that
   * kept the same term (a suggestion matching what was already searched left
   * half-edited text in the box). Resetting in place keeps the element, and
   * its focus, and covers both.
   */
  useIsomorphicLayoutEffect(() => {
    setValue(defaultValue);
    if (inputRef.current) inputRef.current.value = defaultValue;
    setOpen(false);
    cancel();
  }, [defaultValue, location.key, cancel]);

  /* ---- position the portalled dropdown under the box ------------------- */

  useIsomorphicLayoutEffect(() => {
    if (!open) return undefined;

    function place() {
      const form = formRef.current;
      if (!form) return;
      const rect = form.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      // Wider than the box, as retail type-aheads are, but never past the
      // same gutter on the right that the box keeps on the left.
      const gutter = Math.max(rect.left, 16);
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: Math.min(880, viewport - rect.left - gutter),
        /*
         * Fit the room actually left below the box. A fixed 70vh ran the
         * dropdown off the bottom of a laptop screen with the shop hero box
         * sitting ~500px down, leaving most of it unreachable.
         */
        maxHeight: Math.min(
          640,
          Math.max(MIN_DROPDOWN_HEIGHT, window.innerHeight - rect.bottom - 24),
        ),
      });
    }

    place();

    function onResize() {
      // Crossing into phone width mid-type hands over to the sheet's world;
      // the dropdown simply closes rather than reflowing under a keyboard.
      if (window.matchMedia(PHONE_QUERY).matches) setOpen(false);
      else place();
    }

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  /* ---- close on click or focus outside ---------------------------------- */

  useEffect(() => {
    if (!open) return undefined;

    const isInside = (node) =>
      formRef.current?.contains(node) || dropdownRef.current?.contains(node);

    function onPointerDown(event) {
      if (!isInside(event.target)) setOpen(false);
    }
    // Focus landing anywhere else closes it too. The dropdown is portalled,
    // so "else" means outside BOTH the form and the dropdown.
    function onFocusIn(event) {
      if (!isInside(event.target)) setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  /* ---- handlers ---------------------------------------------------------- */

  const isPhone = () =>
    typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches;

  /** Put focus back in the box without that focus reopening anything. */
  function focusInputQuietly() {
    suppressFocusRef.current = true;
    inputRef.current?.focus();
    suppressFocusRef.current = false;
  }

  function handleFocus(event) {
    if (suppressFocusRef.current) return;

    if (isPhone()) {
      /*
       * Hand the text to the full-screen sheet, which takes focus itself.
       * Focus comes back to the SUBMIT button when the sheet closes, not the
       * input: an input that already has focus fires no focus event when
       * tapped, so the next tap would not open the sheet again.
       */
      event.target.blur();
      openSheet('search', {
        term: event.target.value,
        returnFocus: submitRef.current,
      });
      return;
    }
    // Clicking back into a box that was already typed in brings its results
    // back rather than making the visitor type again.
    if (dirty && term && data) setOpen(true);
  }

  function handleChange(event) {
    const next = event.target.value;
    setValue(next);

    if (!next.trim() || isPhone()) {
      cancel();
      setOpen(false);
      return;
    }
    search(next);
    setOpen(true);
  }

  function handleKeyDown(event) {
    const fromResults = Boolean(dropdownRef.current?.contains(event.target));

    if (event.key === 'Escape' && open) {
      // Close and keep the text. preventDefault stops the search field's own
      // Escape-to-clear.
      event.preventDefault();
      if (fromResults) focusInputQuietly();
      setOpen(false);
      return;
    }

    /*
     * Tab order, steered by hand because the dropdown sits at the end of
     * <body>. Left alone, Shift+Tab from the first result went to the last
     * footer link (scrolling the page to the bottom), and Tab from the last
     * result left the page with the dropdown still open.
     */
    if (event.key === 'Tab' && fromResults) {
      const items = Array.from(
        dropdownRef.current.querySelectorAll('[data-qs-item]'),
      );
      const index = items.indexOf(event.target);

      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        focusInputQuietly();
      } else if (!event.shiftKey && index === items.length - 1) {
        // Past the last result: carry on from the form, as if the list had
        // been rendered right after it.
        event.preventDefault();
        setOpen(false);
        submitRef.current?.focus();
      }
      return;
    }

    // ArrowDown on a closed box with results reopens it.
    if (event.key === 'ArrowDown' && !open && dirty && term && data) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (open) moveThroughResults(event, dropdownRef.current, inputRef.current);
  }

  const showDropdown = Boolean(open && position && term);

  return (
    <>
      {/*
        A plain GET form to /search: it works before hydration, and the
        browser's own Enter-to-submit reaches the full results page.
      */}
      <Form
        ref={formRef}
        method="get"
        action={SEARCH_PATH}
        role="search"
        className={classNames.form}
        onSubmit={() => setOpen(false)}
      >
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        {showIcon ? (
          <svg
            className={classNames.icon}
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
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={classNames.input}
          autoComplete="off"
          enterKeyHint="search"
          /*
           * aria-controls only while the dropdown exists — pointing it at a
           * missing id fails axe's aria-valid-attr-value check. No
           * aria-expanded: it is not valid on a search field (implicit role
           * searchbox), and a full combobox would promise a listbox the mixed
           * results are not. The announcer below says when results arrive.
           */
          aria-controls={showDropdown ? dropdownId : undefined}
          onFocus={handleFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button ref={submitRef} type="submit" className={classNames.button}>
          {buttonLabel}
        </button>

        {/* Always mounted, outside the dropdown, so it exists before its
            text changes — see ResultsAnnouncer. */}
        <ResultsAnnouncer data={dirty && term ? data : undefined} />
      </Form>

      {showDropdown
        ? createPortal(
            /*
             * Key handling is delegated here from the result links inside, so
             * the arrow keys, Escape and Tab work wherever focus is in the
             * list.
             */
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <div
              ref={dropdownRef}
              id={dropdownId}
              className={styles.dropdown}
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              role="region"
              aria-label="Search suggestions"
              onKeyDown={handleKeyDown}
            >
              <div
                className={styles.inner}
                data-loading={isLoading ? '' : undefined}
              >
                {data?.error ? (
                  <PredictiveMessage>
                    Suggestions are unavailable right now. Press Enter to
                    search.
                  </PredictiveMessage>
                ) : data ? (
                  <PredictiveResults
                    data={data}
                    term={term}
                    onNavigate={() => setOpen(false)}
                    onViewAll={() => {
                      setOpen(false);
                      navigate(searchUrl(term));
                    }}
                  />
                ) : (
                  <PredictiveMessage>Searching…</PredictiveMessage>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
