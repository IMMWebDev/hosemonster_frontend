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
      nodes.forEach((el) => el.setAttribute('data-reveal-in', ''));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-reveal-in', '');
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
