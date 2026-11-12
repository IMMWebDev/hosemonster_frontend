import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouteLoaderData} from 'react-router';
import {useIsomorphicLayoutEffect} from '~/lib/use-isomorphic-layout-effect';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
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
 * The claims are usually the same everywhere, so they live once in the
 * Options single type (`tickerItems`, loaded by the root loader). With "Use
 * defaults" on (the default; null counts as on) a module shows those. Switched
 * off, it shows its own items instead — an override for one page, not an
 * addition. If Options has none yet, a module falls back to its own items
 * rather than vanishing.
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
 * A pause button sits at the strip's right end: moving content that runs on
 * forever needs a way to stop it (WCAG 2.2.2), and hover alone does nothing
 * for keyboard or touch. It stays paused until pressed again. Readers who ask
 * for reduced motion get a still strip and no button.
 *
 * @param {{data: {items?: Array<{id: number, label: string}>}}} props
 */
export default function Ticker({data}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const siteItems = (
    useRouteLoaderData('root')?.cmsOptions?.tickerItems ?? []
  ).filter((item) => item?.label);
  const ownItems = (data?.items ?? []).filter((item) => item?.label);
  const useDefaults = data?.useDefaults !== false;
  const items =
    useDefaults && siteItems.length > 0 ? siteItems : ownItems;
  const sectionRef = useRef(null);
  const groupRef = useRef(null);
  const [metrics, setMetrics] = useState({copies: MIN_COPIES, shift: 0, duration: 0});
  const [paused, setPaused] = useState(false);

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

  const sectionClass = [
    styles.section,
    // Strapi applies the "white" default on CREATE only; null is white too.
    data?.background === 'navy' ? styles.navy : '',
    paused ? styles.paused : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    // No aria-label: it made every ticker a landmark with the same fixed
    // name. The list says what it is.
    <section {...trackingRoot} className={sectionClass} ref={sectionRef}>
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{
            // Translate by exactly one copy, not a percentage of the whole
            // track — the percentage changes every time the copy count does.
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
              // Only the first copy is measured, and only the first is exposed
              // to assistive tech — the rest are a rendering trick.
              innerRef={i === 0 ? groupRef : undefined}
              duplicate={i > 0}
            />
          ))}
        </div>
      </div>
      {/* The label stays put and aria-pressed carries the state, so a voice
          user can say "pause scrolling" either way. */}
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={paused}
        aria-label="Pause scrolling"
        onClick={() => setPaused((p) => !p)}
        data-track-id={trackId('pause-toggle')}
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {/* Shows what a press will do: pause while it runs, play once
              stopped. */}
          <path d={paused ? 'M5.5 3.5v9l7-4.5z' : 'M6 4v8M10 4v8'} />
        </svg>
      </button>
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
