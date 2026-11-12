import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './TestimonialStrip.module.css';

/**
 * Testimonial Strip module — sprint-04 hifi_smartmonsterfeature.html,
 * "Testimonial strip".
 *
 * A slim full-bleed orange band: a large quote mark, one quote, and its
 * attribution on the right (under the quote below desktop). The photo is
 * optional and shows faintly through the orange. Page-agnostic; Testimonials
 * is the carousel of several.
 *
 * @param {{
 *   data: {
 *     quote?: string,
 *     authorName?: string,
 *     authorTitle?: string,
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function TestimonialStrip({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const quote = data?.quote?.trim();
  if (!quote) return null;

  const {authorName, authorTitle} = data;
  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section {...trackingRoot} className={styles.section}>
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          /* Decorative — the quote carries the meaning. */
          alt=""
          className={styles.backgroundImage}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.wash} aria-hidden="true" />

      <figure className={styles.inner} data-reveal>
        <span className={styles.mark} aria-hidden="true">
          “
        </span>
        <blockquote className={styles.quote}>
          <p>{quote}</p>
        </blockquote>
        {authorName || authorTitle ? (
          <figcaption className={styles.author}>
            {authorName ? (
              <span className={styles.name}>
                — {authorName}
                {authorTitle ? ',' : ''}
              </span>
            ) : null}
            {authorTitle ? <span className={styles.title}>{authorTitle}</span> : null}
          </figcaption>
        ) : null}
      </figure>
    </section>
  );
}
