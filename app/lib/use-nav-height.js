import {useCallback, useEffect, useRef} from 'react';

/**
 * Measures the header's main nav bar and writes it to the root element as
 * `--header-nav-h`, so anything sticky further down the page can sit below the
 * nav while it's on screen (the product listing's filter rail).
 *
 * The root, not the header: the consumers are elsewhere in the tree, and a
 * custom property only inherits downwards.
 *
 * Same rules as use-utility-bar-height.js — no React state (a measurement that
 * only feeds CSS has no business going through render), a ref callback so a
 * late-arriving node is still seen, and a ResizeObserver because the bar's
 * height changes for reasons the window never hears about (a font swap, the
 * logo loading). Until it runs, the CSS fallback stands in.
 *
 * @returns {(node: HTMLElement | null) => void} ref callback for the nav bar
 */
export function useNavHeight() {
  const observerRef = useRef(null);

  const setBar = useCallback((node) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    const root = document.documentElement;
    if (!node) {
      root.style.removeProperty('--header-nav-h');
      return;
    }

    const sync = () =>
      root.style.setProperty('--header-nav-h', `${node.offsetHeight}px`);
    sync();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return setBar;
}
