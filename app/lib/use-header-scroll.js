import {useEffect, useState} from 'react';

/**
 * Scroll state for the site header, as two independent signals.
 *
 *   condensed — POSITION based. True once you have left the top of the page.
 *               Collapses the navy utility bar, which does not come back until
 *               you return to the top. Scrolling up mid-page must not bring it
 *               back, or the header would resize on every upward flick.
 *
 *   hidden    — DIRECTION based. True while you are scrolling down past
 *               `hideAt`, false the moment you scroll up. This is what slides
 *               the whole header out of the way and back.
 *
 * They are deliberately different: the utility bar is a density decision (are
 * we at the top of the page or not) while the main nav is an intent decision
 * (are you reading downward, or looking for the nav).
 *
 * Two details that stop this from flickering:
 *
 *   - `condensed` uses a different threshold going in (`condenseAt`) than
 *     coming out (8px). Collapsing the bar shortens the page, which can itself
 *     nudge scrollY back across a single shared threshold and oscillate.
 *
 *   - `lastY` only advances once a move exceeds `delta`. Comparing against the
 *     previous frame instead would let sub-pixel jitter and trackpad noise read
 *     as direction changes; this way a slow drag still accumulates into one.
 *
 * Reads are coalesced to one rAF per frame behind a passive listener, so this
 * never blocks scrolling.
 *
 * Both are false during SSR and first paint — the server cannot know the scroll
 * position, so the header renders open and the mount read corrects it. That
 * also covers a reload or back-navigation that restores a position mid-page.
 *
 * @param {{condenseAt?: number, hideAt?: number, delta?: number}} [options]
 * @returns {{condensed: boolean, hidden: boolean}}
 */
export function useHeaderScroll({
  condenseAt = 64,
  hideAt = 160,
  delta = 4,
} = {}) {
  const [state, setState] = useState({condensed: false, hidden: false});

  useEffect(() => {
    let frame = 0;
    let lastY = window.scrollY;

    const read = () => {
      frame = 0;
      // Clamp: iOS rubber-banding reports negative scrollY at the top and
      // overscroll past the bottom, both of which read as phantom direction.
      const y = Math.max(0, window.scrollY);
      const dy = y - lastY;

      setState((prev) => {
        const condensed = prev.condensed ? y > 8 : y > condenseAt;

        let hidden = prev.hidden;
        if (y <= hideAt) {
          // Near the top the header is always available, whatever the
          // direction — otherwise it stays hidden through the first screenful.
          hidden = false;
        } else if (dy > delta) {
          hidden = true;
        } else if (dy < -delta) {
          hidden = false;
        }

        if (condensed === prev.condensed && hidden === prev.hidden) return prev;
        return {condensed, hidden};
      });

      if (Math.abs(dy) > delta) lastY = y;
    };

    read();

    window.addEventListener('scroll', onScroll, {passive: true});

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(read);
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [condenseAt, hideAt, delta]);

  return state;
}
