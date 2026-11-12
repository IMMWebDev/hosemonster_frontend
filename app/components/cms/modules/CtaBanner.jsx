import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './CtaBanner.module.css';

/**
 * CTA Banner module — Figma "Homepage" → Hifi → Main → Section (7:1660).
 *
 * Full-bleed promo band: dark texture behind centred eyebrow / heading / body
 * and up to two buttons. Page-agnostic — the homepage uses it for the FireFlow
 * break, but nothing here is homepage-specific.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CtaBanner({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const {eyebrow, heading, body, primaryCTA, secondaryCTA} = data ?? {};

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
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          {heading}
        </h2>
        {body ? (
          <p className={styles.body} data-reveal style={{'--reveal-i': 2}}>
            {body}
          </p>
        ) : null}

        {(primaryCTA?.linkText || secondaryCTA?.linkText) && (
          <div className={styles.actions}>
            {primaryCTA?.linkText ? (
              <CmsLink
                link={primaryCTA}
                className="btn btn--primary"
                trackRole="primary-cta"
              />
            ) : null}
            {secondaryCTA?.linkText ? (
              <CmsLink
                link={secondaryCTA}
                className="btn btn--secondary"
                trackRole="secondary-cta"
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
