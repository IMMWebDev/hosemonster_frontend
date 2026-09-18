import {useEffect, useState} from 'react';

/**
 * Scroll state for the site header: does the reader want the nav on screen?
 *
 * DIRECTION based. True while you are scrolling down past `hideAt`, false the
 * moment you scroll up. That is what slides the whole header out of the way
 * and back, as a transform — nothing here changes layout.
 *
 * It used to return a second signal, `condensed`, which collapsed the navy
 * utility bar once you left the top of the page. That has gone: the header now
 * pins at a negative offset equal to the bar's height (Header.module.css), so
 * the bar scrolls away with the page instead of animating its own height. The
 * old version resized the header, which reflowed everything below it — most
 * visibly on the way back to the top, where content was pushed down as the bar
 * re-expanded and then appeared to scroll up again.
 *
 * One detail that stops this flickering: `lastY` only advances once a move
 * exceeds `delta`. Comparing against the previous frame instead would let
 * sub-pixel jitter and trackpad noise read as direction changes; this way a
 * slow drag still accumulates into one.
 *
 * Reads are coalesced to one rAF per frame behind a passive listener, so this
 * never blocks scrolling.
 *
 * False during SSR and first paint — the server cannot know the scroll
 * position, so the header renders open and the mount read corrects it. That
 * also covers a reload or back-navigation that restores a position mid-page.
 *
 * @param {{hideAt?: number, delta?: number}} [options]
 * @returns {{hidden: boolean}}
 */
export function useHeaderScroll({hideAt = 160, delta = 4} = {}) {
  const [state, setState] = useState({hidden: false});

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

        if (hidden === prev.hidden) return prev;
        return {hidden};
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
  }, [hideAt, delta]);

  return state;
}
