import {useEffect} from 'react';
import {useLocation} from 'react-router';

/**
 * Drives the scroll-reveal system in app/styles/motion.css.
 *
 * One observer for the whole page rather than a hook per module: modules stay
 * pure markup, opting in with a `data-reveal` attribute and nothing else. This
 * is called once, in PageLayout.
 *
 * Elements are unobserved as soon as they appear, so a reveal plays once and
 * does not replay when the user scrolls back up.
 *
 * Re-runs on navigation because a client-side route change swaps the module
 * tree without remounting PageLayout, so a fresh page's elements would
 * otherwise never be picked up — they would sit at opacity 0 permanently.
 */
/**
 * Mark an element whose entrance has finished, so motion.css hands its
 * `transition` back to the module (a card's hover can then animate). Timed
 * from the computed transition — the longest duration + delay — rather than
 * transitionend, which never fires for a variant that doesn't move, under
 * reduced motion, or for an element that is already in place.
 *
 * @param {Element} el
 */
function settle(el) {
  const style = getComputedStyle(el);
  const seconds = (value) =>
    value.split(',').map((v) => Number.parseFloat(v) || 0);
  const durations = seconds(style.transitionDuration);
  const delays = seconds(style.transitionDelay);
  const longest = Math.max(
    0,
    ...durations.map((d, i) => d + delays[i % delays.length]),
  );
  window.setTimeout(
    () => el.setAttribute('data-reveal-done', ''),
    longest * 1000 + 50,
  );
}

/**
 * Show an element: start its entrance, then hand its transitions back.
 *
 * @param {Element} el
 */
function reveal(el) {
  el.setAttribute('data-reveal-in', '');
  settle(el);
}

export function useReveal() {
  const {pathname} = useLocation();

  useEffect(() => {
    const nodes = document.querySelectorAll(
      '[data-reveal]:not([data-reveal-in])',
    );
    if (nodes.length === 0) return undefined;

    // No IntersectionObserver (very old browsers, some test runners): show
    // everything at once rather than leaving the page blank.
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach(reveal);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        // Start slightly before the element reaches the bottom edge, so the
        // motion reads as "already arriving" rather than triggering under the
        // user's eye. A low threshold keeps tall sections from waiting until
        // most of the element is on screen.
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.05,
      },
    );

    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);
}
