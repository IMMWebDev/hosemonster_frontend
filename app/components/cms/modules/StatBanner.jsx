import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './StatBanner.module.css';

/**
 * Stat Banner module — sprint-04 hifi_smartmonsterfeature.html, "70% less
 * water banner".
 *
 * A full-bleed deep-navy band with one centred headline claim and a line of
 * supporting copy. Words in the heading wrapped in asterisks go orange. The
 * background photo is optional and only shows faintly through the navy.
 * Page-agnostic; CTA Banner is the version with buttons.
 *
 * @param {{
 *   data: {
 *     heading?: string,
 *     body?: string,
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function StatBanner({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const {heading, body} = data ?? {};

  if (!heading) return null;

  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section {...trackingRoot} className={styles.section}>
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          /* Decorative texture — the heading carries the meaning. */
          alt=""
          className={styles.backgroundImage}
          data-parallax="slow"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.wash} aria-hidden="true" />

      <div className={styles.inner}>
        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 0}}>
          {withHighlights(heading)}
        </h2>
        {body ? (
          <p className={styles.body} data-reveal style={{'--reveal-i': 1}}>
            {body}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The heading with every `*phrase*` wrapped for the orange, asterisks dropped:
 * "Up to *70% less water* per test". Splitting on a capturing group puts the
 * starred phrases at the odd indices. A lone or empty pair of asterisks
 * doesn't match, so it prints as typed.
 *
 * @param {string} heading
 */
function withHighlights(heading) {
  const parts = heading.split(/\*([^*]+)\*/);
  if (parts.length === 1) return heading;

  return parts.map((part, i) =>
    i % 2 ? (
      // The parts come from one fixed string, so their order is their identity.
      // eslint-disable-next-line react/no-array-index-key
      <span key={i} className={styles.highlight}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}
