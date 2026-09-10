import styles from './PageWatermark.module.css';

/**
 * Wraps a page's modules and paints the brand flame repeating behind all of
 * them, alternating left / right down the scroll. See the stylesheet for how
 * the two-layer alternation works.
 *
 * The image comes from the Options single type (`watermark`), so it is set once
 * for the whole site rather than per page. PageLayout passes it in.
 *
 * Renders nothing when Options has no image, so the site works unchanged until
 * one is uploaded.
 *
 * @param {{
 *   imageUrl?: string,
 *   children: import('react').ReactNode,
 * }} props
 */
/**
 * Where the marks sit.
 *
 * ⚠ FIXED PIXEL SPACING, NOT PERCENTAGES.
 *
 * Percentages looked right on a long page and broke on a short one: five marks
 * spread across a single-module page compress into a few hundred pixels while
 * each mark is ~650px tall, so they pile on top of each other. Pixel offsets
 * keep the gap constant no matter how tall the page is.
 *
 * More marks are declared than most pages need. Any that fall past the end of
 * the page are clipped away by `overflow: clip` on the wrapper, so a short page
 * simply shows the first one or two and a long page shows the lot. Nothing has
 * to know the page height, and there is no measuring pass.
 *
 * ⚠ The jitter is FIXED, not `Math.random()`. Hydrogen renders on the server
 * and hydrates on the client; a random value differs between the two, which
 * React reports as a hydration mismatch, and the marks would jump on every
 * client-side navigation.
 */
const MARK_COUNT = 14;
const FIRST_AT = 240; // px from the top of <main>
const BASE_STEP = 900; // px between marks before jitter

// Cycled by index so the run never settles into a visible rhythm. Lengths are
// coprime with 2 (the side alternation) so pairings keep shifting.
const TOP_JITTER = [0, 120, -60, 180, -30, 90, -110];
const INSETS = [60, 30, 85, 45, 20, 70]; // px off the edge
const SCALES = [1, 0.82, 1.14, 0.9, 1.06, 0.95];

export default function PageWatermark({imageUrl, children}) {
  if (!imageUrl) return children;

  return (
    <div
      className={styles.wrap}
      style={{
        '--wm-image': `url("${imageUrl}")`,
        /* Width drives the size; height follows the asset's portrait ratio. */
        '--wm-width': '400px',
        '--wm-width-tablet': '300px',
        '--wm-width-mobile': '230px',
      }}
    >
      {Array.from({length: MARK_COUNT}, (_, i) => {
        const top = FIRST_AT + i * BASE_STEP + TOP_JITTER[i % TOP_JITTER.length];
        return (
          <span
            key={`wm-${i}`}
            className={styles.mark}
            // Alternating sides means neighbours never sit on the same edge, so
            // two that land close together still cannot collide horizontally.
            data-side={i % 2 === 0 ? 'left' : 'right'}
            aria-hidden="true"
            style={{
              '--wm-top': `${top}px`,
              '--wm-inset': `${INSETS[i % INSETS.length]}px`,
              '--wm-scale': SCALES[i % SCALES.length],
            }}
          />
        );
      })}
      {children}
    </div>
  );
}

