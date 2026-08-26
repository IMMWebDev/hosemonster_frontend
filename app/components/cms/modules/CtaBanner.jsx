import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
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
 *     primaryCta?: object,
 *     secondaryCta?: object,
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CtaBanner({data, baseUrl}) {
  const {eyebrow, heading, body, primaryCta, secondaryCta} = data ?? {};

  if (!heading) return null;

  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section className={styles.section}>
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          /* Decorative texture — the heading carries the meaning. */
          alt=""
          className={styles.backgroundImage}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.wash} aria-hidden="true" />

      <div className={styles.inner}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.heading}>{heading}</h2>
        {body ? <p className={styles.body}>{body}</p> : null}

        {(primaryCta?.linkText || secondaryCta?.linkText) && (
          <div className={styles.actions}>
            {primaryCta?.linkText ? (
              <CmsLink link={primaryCta} className="btn btn--primary" />
            ) : null}
            {secondaryCta?.linkText ? (
              <CmsLink link={secondaryCta} className="btn btn--secondary" />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
