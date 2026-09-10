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
 * Where each mark sits.
 *
 * ⚠ A FIXED TABLE, NOT `Math.random()`. Hydrogen renders this on the server and
 * hydrates on the client; a random value would differ between the two, which
 * React reports as a hydration mismatch, and the marks would jump to new spots
 * on every client-side navigation. Hand-placed values are deterministic and, as
 * a bonus, actually art-directable — real randomness clusters in ways that look
 * like a mistake rather than a rhythm.
 *
 *   top    percentage of page height, so spacing scales with page length
 *   side   which edge it hangs off
 *   inset  how far off that edge, in px — varied so the run does not read as a
 *          ruled margin
 *   scale  multiplier on --wm-width, for a little depth
 */
const MARKS = [
  {top: 7, side: 'left', inset: 60, scale: 1},
  {top: 23, side: 'right', inset: 30, scale: 0.82},
  {top: 46, side: 'left', inset: 85, scale: 1.14},
  {top: 62, side: 'right', inset: 45, scale: 0.9},
  {top: 85, side: 'left', inset: 20, scale: 1.06},
];

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
      {MARKS.map((m) => (
        <span
          key={`wm-${m.top}-${m.side}`}
          className={styles.mark}
          data-side={m.side}
          aria-hidden="true"
          style={{
            '--wm-top': `${m.top}%`,
            '--wm-inset': `${m.inset}px`,
            '--wm-scale': m.scale,
          }}
        />
      ))}
      {children}
    </div>
  );
}

