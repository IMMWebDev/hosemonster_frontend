import {useCallback, useEffect, useRef} from 'react';

/**
 * Measures the header's utility bar and writes it to the header as `--utility-h`.
 *
 * The header sticks at `top: calc(var(--utility-h) * -1)`, which is what makes
 * the navy bar scroll away while the main nav stays — see the note on `.header`
 * in Header.module.css. That offset has to equal the bar's real height.
 *
 * Measured rather than typed because the bar is not one height: it wraps at
 * narrow widths, and the CMS controls how many utility links it holds, so
 * adding one can change it. A constant would be right at desktop and wrong
 * everywhere else, and the failure is quiet — the nav pins a few pixels high or
 * low and nobody knows why.
 *
 * NO REACT STATE. The measurement is written straight to the node with
 * `style.setProperty`. Holding it in state and rendering it as an inline style
 * meant the ref callback called setState during the hydration commit, which
 * React reports as "this Suspense boundary received an update before it
 * finished hydrating" and recovers from by throwing away the server HTML and
 * re-rendering the whole tree on the client. A measurement that only ever
 * feeds CSS has no business going through render at all.
 *
 * ResizeObserver rather than a resize listener, because the height changes for
 * reasons the window never hears about: a web font swapping in, a link
 * wrapping, an editor adding an item. Where the API is missing it falls back to
 * a single measurement, which still covers the common case.
 *
 * Until this runs, the CSS fallback on `--utility-h` stands in — so SSR and the
 * first paint are correct to within a few pixels rather than broken.
 *
 * @returns {[(node: HTMLElement | null) => void, (node: HTMLElement | null) => void]}
 *   ref callbacks for the header and the utility bar, in that order
 */
export function useUtilityBarHeight() {
  const headerRef = useRef(null);
  const barRef = useRef(null);
  const observerRef = useRef(null);

  const sync = useCallback(() => {
    const header = headerRef.current;
    const bar = barRef.current;
    if (!header) return;
    if (!bar) {
      header.style.removeProperty('--utility-h');
      return;
    }
    header.style.setProperty('--utility-h', `${bar.offsetHeight}px`);
  }, []);

  /*
   * Ref CALLBACKS, not plain refs read in an effect. The bar renders
   * conditionally, so the node can arrive and leave after mount; an effect
   * reading a ref would only see whatever was there on its first pass.
   */
  const setHeader = useCallback(
    (node) => {
      headerRef.current = node;
      sync();
    },
    [sync],
  );

  const setBar = useCallback(
    (node) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      barRef.current = node;

      if (!node) {
        sync();
        return;
      }

      sync();

      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(sync);
      observer.observe(node);
      observerRef.current = observer;
    },
    [sync],
  );

  // The callbacks above only fire when an element changes, so unmount needs its
  // own cleanup or the observer outlives the component.
  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [setHeader, setBar];
}
