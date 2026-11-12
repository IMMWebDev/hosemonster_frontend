import {useEffect} from 'react';
import {useLocation, useNavigationType} from 'react-router';
import {slugify} from '~/lib/tracking';

/**
 * Lands a "#…" URL on its element — /smart-monster#request-a-virtual-tour opens
 * with that module under the header, whether the address was typed, shared or
 * clicked.
 *
 * The browser (on a fresh load) and React Router (on a client navigation)
 * already scroll to the fragment, but they aim once, early: the destination is
 * worked out before fonts, images and — in dev — the module stylesheets have
 * finished changing the page's height, and a smooth scroll in flight doesn't
 * re-aim when content above the target grows. The visitor lands hundreds of
 * pixels short. So this aims again after hydration and keeps re-aiming
 * whenever the target moves, until the page settles.
 *
 * It lets go the moment the visitor takes over (wheel, touch, click, key — even
 * before hydration, via a flag set by the inline script in app/root.jsx) or
 * after SETTLE_MS, and it never fights a restored position: back/forward and
 * reload are left to React Router's ScrollRestoration.
 *
 * On a link click it also moves focus to the target, which the browser would
 * have done for a plain fragment link but doesn't when React Router handles
 * the click — so Tab carries on from the section, not from the link.
 *
 * Fragments are matched as typed first, then slugged the way module anchors are
 * (app/lib/tracking.js), so "#request_a_virtual_tour" finds
 * id="request-a-virtual-tour" too.
 *
 * Called once, in PageLayout.
 */
export function useHashScroll() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const {key, hash} = location;
    // Read before the early return so leaving the first entry is recorded even
    // on a page with no fragment.
    const initial = isInitialEntry(key);
    if (!hash) return undefined;

    /*
     * A POP is back/forward — or the initial load, which React Router reports
     * as POP too. Back/forward and reload restore where the visitor was; only a
     * fresh load, a link click or a fragment the browser navigated to itself
     * should jump.
     */
    if (initial) {
      if (!isFreshDocumentLoad()) return undefined;
      // They scrolled, tapped or typed before hydration: they've taken over.
      if (/** @type {any} */ (window).__earlyUserInput) return undefined;
    } else if (navigationType === 'POP' && !isBrowserFragmentEntry(location)) {
      return undefined;
    }

    const target = findHashTarget(hash);
    if (!target) return undefined;

    let frame = 0;
    let timer = 0;
    let lastTop = /** @type {number | null} */ (null);
    let stopped = false;

    const tick = () => {
      if (!target.isConnected) return stop();
      // Document-relative, so it only changes when layout above the target
      // shifts — not while the scroll itself is moving.
      const top = target.getBoundingClientRect().top + window.scrollY;
      if (lastTop === null || Math.abs(top - lastTop) > 1) {
        lastTop = top;
        // No `behavior`: html's scroll-behavior decides — smooth by default,
        // instant under prefers-reduced-motion (app/styles/motion.css). A
        // repeat call retargets a scroll already in flight. scroll-margin-top
        // keeps the target clear of the sticky header (app/styles/app.css).
        target.scrollIntoView({block: 'start'});
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (stopped) return;
      STOP_EVENTS.forEach((type) =>
        window.addEventListener(type, stop, {passive: true, capture: true}),
      );
      timer = window.setTimeout(stop, SETTLE_MS);
      tick();
      // A <Link> click (PUSH/REPLACE) skips the browser's own fragment jump,
      // which is what moves keyboard and screen-reader focus. A fresh load and
      // a browser-made fragment entry got that natively.
      if (!initial && navigationType !== 'POP') focusWithoutScrolling(target);
    };

    // A link opened in a background tab: animation frames don't run there, so
    // wait until the visitor actually looks at it.
    function onVisible() {
      if (document.visibilityState === 'visible') start();
    }

    function stop() {
      stopped = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      STOP_EVENTS.forEach((type) =>
        window.removeEventListener(type, stop, {capture: true}),
      );
    }

    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', onVisible);
    } else {
      start();
    }

    return stop;
    // The location object, not its key: every fragment entry the browser makes
    // itself shares the key "default", so the key alone can't tell two apart.
  }, [location, navigationType]);
}

/** How long to keep re-aiming. Comfortably past a smooth scroll down a long page. */
const SETTLE_MS = 3000;

/** The visitor taking over. Not `scroll` — this hook's own scrolling fires that. */
const STOP_EVENTS = /** @type {const} */ ([
  'wheel',
  'touchstart',
  'pointerdown',
  'keydown',
]);

/*
 * The app's first history entry, and whether the visitor has left it. Module
 * state rather than a ref so StrictMode's mount → unmount → mount in dev still
 * reads the first render as the initial load, while coming back to that entry
 * later (with Back) does not.
 */
let firstKey = /** @type {string | null} */ (null);
let leftFirstEntry = false;

/** @param {string} key */
function isInitialEntry(key) {
  firstKey ??= key;
  if (key !== firstKey) leftFirstEntry = true;
  return key === firstKey && !leftFirstEntry;
}

/*
 * React Router's own history entries always carry state. A POP onto an entry
 * with none is one the browser made: a fragment typed into the address bar, or
 * a plain <a href="#…"> in CMS rich text (Wysiwyg, FAQ answers). Those should
 * jump, once — so the entry is stamped, and a later Back/Forward onto it (a new
 * location object, a stamped state) is left to ScrollRestoration. `stampedFor`
 * lets StrictMode's second run of the same navigation through.
 */
const HASH_JUMPED = 'hashScrollJumped';
let stampedFor = /** @type {object | null} */ (null);

/** @param {object} location */
function isBrowserFragmentEntry(location) {
  if (stampedFor === location) return true;
  if (window.history.state != null) return false;
  window.history.replaceState({[HASH_JUMPED]: true}, '');
  stampedFor = location;
  return true;
}

/**
 * Focus the target without a second scroll. Sections aren't focusable, so one
 * gets tabindex="-1" until focus leaves it. After a mouse click no focus ring
 * shows — programmatic focus then doesn't match :focus-visible.
 *
 * @param {HTMLElement} el
 */
function focusWithoutScrolling(el) {
  if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) {
    el.setAttribute('tabindex', '-1');
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), {
      once: true,
    });
  }
  el.focus({preventScroll: true});
}

/** A typed, pasted or clicked-through load — not a reload or back/forward. */
function isFreshDocumentLoad() {
  const entry = /** @type {PerformanceNavigationTiming | undefined} */ (
    performance.getEntriesByType?.('navigation')?.[0]
  );
  return !entry || entry.type === 'navigate';
}

/** @param {string} hash "#request_a_virtual_tour" */
function findHashTarget(hash) {
  let fragment = hash.slice(1);
  try {
    fragment = decodeURIComponent(fragment);
  } catch {
    // Malformed %-escape: try it as typed.
  }
  if (!fragment) return null;
  return (
    document.getElementById(fragment) ??
    document.getElementById(slugify(fragment))
  );
}
