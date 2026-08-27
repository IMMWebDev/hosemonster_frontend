import {useCallback, useEffect, useRef, useState} from 'react';
import {useIsomorphicLayoutEffect} from '~/lib/use-isomorphic-layout-effect';
import styles from './Ticker.module.css';

/** Scroll speed in pixels per second. Constant regardless of how many items
 *  are entered, so adding one does not make the strip run faster. */
const PX_PER_SECOND = 40;

/** Rendered before measurement, and the floor afterwards. Two is enough to
 *  look correct while the first paint happens. */
const MIN_COPIES = 2;

/*
 * Ceiling on the copy count. The formula is viewport / copyWidth, so a very
 * narrow copy demands a very large number — and a mis-measurement returning a
 * near-zero width would demand thousands of DOM nodes. A gap in an
 * implausibly short ticker is a far better failure than freezing the page.
 */
const MAX_COPIES = 24;

/**
 * Ticker module — Figma "Homepage" → Hifi → Main → Ticker Copy (26:519).
 *
 * A continuously scrolling strip of short claims. Page-agnostic.
 *
 * HOW THE SEAMLESS LOOP WORKS, and why it is measured rather than fixed:
 * the item list is repeated N times and the track is translated left by
 * exactly ONE copy's width, which lands on a pixel-identical frame so the
 * restart is invisible. The catch is that N cannot be hardcoded. Once the
 * track has shifted by one copy, the REMAINING copies still have to cover the
 * whole viewport — otherwise the strip runs out and trails white space before
 * it resets. Two copies only suffice when a single copy is wider than the
 * screen; with a handful of short items on a wide monitor it is not, so the
 * count is derived from the measured copy width instead.
 *
 * @param {{data: {items?: Array<{id: number, label: string}>}}} props
 */
export default function Ticker({data}) {
  const items = data?.items ?? [];
  const sectionRef = useRef(null);
  const groupRef = useRef(null);
  const [metrics, setMetrics] = useState({copies: MIN_COPIES, shift: 0, duration: 0});

  const measure = useCallback(() => {
    const section = sectionRef.current;
    const group = groupRef.current;
    if (!section || !group) return;
    const groupWidth = group.getBoundingClientRect().width;
    const viewport = section.getBoundingClientRect().width;
    if (!groupWidth || !viewport) return;
    // +1 so that after shifting by one copy, the rest still overflow the
    // viewport with no gap at the trailing edge.
    const copies = Math.min(
      MAX_COPIES,
      Math.max(MIN_COPIES, Math.ceil(viewport / groupWidth) + 1),
    );
    // Return the PREVIOUS object when nothing meaningful changed. React bails
    // out of a re-render only on Object.is equality, so handing it a fresh
    // object every time would re-render on every pixel of a resize drag — and
    // restart the CSS animation each time, making the strip stutter.
    setMetrics((prev) =>
      prev.copies === copies && Math.abs(prev.shift - groupWidth) < 0.5
        ? prev
        : {copies, shift: groupWidth, duration: groupWidth / PX_PER_SECOND},
    );
  }, []);

  // Layout effect so the corrected copy count is in place before the browser
  // paints, rather than showing a too-short track for a frame.
  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    const group = groupRef.current;
    if (!section || !group) return undefined;

    measure();
    // A resize changes the viewport, and a font swap changes the copy width —
    // both alter how many copies are needed.
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(group);
    // Belt and braces alongside the observer. A stale copy count is a visible
    // defect (the strip runs out and trails white space before it loops), and
    // the two listeners cost nothing next to that — `measure` only calls
    // setState with the same values if nothing moved, which React bails on.
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, items.length]);

  // The brand fonts are not loaded yet (see STYLEGUIDE.md); when they are, the
  // swap changes every item's width and therefore the copy count. Re-measure
  // once they settle so the loop does not develop a gap.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return;
    document.fonts.ready.then(measure);
  }, [measure]);

  if (items.length === 0) return null;

  return (
    <section
      className={styles.section}
      ref={sectionRef}
      aria-label="Why Hose Monster"
    >
      <div
        className={styles.track}
        style={{
          // Translate by exactly one copy, not a percentage of the whole track
          // — the percentage changes every time the copy count does.
          '--ticker-shift': metrics.shift ? `${metrics.shift}px` : undefined,
          '--ticker-duration': metrics.duration
            ? `${metrics.duration}s`
            : undefined,
        }}
      >
        {Array.from({length: metrics.copies}, (_, i) => (
          <TickerGroup
            key={i}
            items={items}
            // Only the first copy is measured, and only the first is exposed to
            // assistive tech — the rest are a rendering trick.
            innerRef={i === 0 ? groupRef : undefined}
            duplicate={i > 0}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * @param {{
 *   items: Array<{id: number, label: string}>,
 *   innerRef?: import('react').Ref<HTMLUListElement>,
 *   duplicate?: boolean,
 * }} props
 */
function TickerGroup({items, innerRef, duplicate = false}) {
  return (
    <ul className={styles.group} ref={innerRef} aria-hidden={duplicate || undefined}>
      {items.map((item, i) => (
        <li className={styles.item} key={item.id ?? i}>
          {item.label}
          {/* A separator after every item, including the last — the strip wraps
              around, so the final item still needs one before the next copy. */}
          <span className={styles.divider} aria-hidden="true">
            |
          </span>
        </li>
      ))}
    </ul>
  );
}
