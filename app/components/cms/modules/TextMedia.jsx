import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './TextMedia.module.css';

/**
 * Text & Media module — Figma "Homepage" → Hifi → Main → Section (7:1581).
 *
 * A text lockup (eyebrow, heading, body, bullets, up to two CTAs) beside an
 * image or video. Page-agnostic: `mediaSide` flips the visual order so several
 * of these can alternate down a page without a second module.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     bullets?: Array<{id: number, label: string}>,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     image?: {url?: string, alternativeText?: string},
 *     videoUrl?: string,
 *     mediaSide?: 'left' | 'right',
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function TextMedia({data, baseUrl}) {
  const {
    eyebrow,
    heading,
    body,
    bullets = [],
    primaryCTA,
    secondaryCTA,
    videoUrl,
    mediaSide = 'right',
  } = data ?? {};

  if (!heading) return null;

  const imageUrl = strapiMedia(data.image?.url, baseUrl);
  // Alt comes from the Media Library's own alternativeText. Empty string when
  // unset, which marks it decorative rather than announcing a filename.
  const imageAlt = data.image?.alternativeText ?? '';

  return (
    <section className={styles.section}>
      <div
        className={`${styles.inner} ${mediaSide === 'left' ? styles.mediaLeft : ''}`}
      >
        <div className={styles.copy}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.heading}>{heading}</h2>
          {body ? <p className={styles.body}>{body}</p> : null}

          {bullets.length > 0 && (
            <ul className={styles.bullets}>
              {bullets.map((item, i) => (
                <li className={styles.bullet} key={item.id ?? i}>
                  {item.label}
                </li>
              ))}
            </ul>
          )}

          {(primaryCTA?.linkText || secondaryCTA?.linkText) && (
            <div className={styles.actions}>
              {primaryCTA?.linkText ? (
                <CmsLink link={primaryCTA} className="btn btn--primary" />
              ) : null}
              {secondaryCTA?.linkText ? (
                <CmsLink link={secondaryCTA} className="btn btn--secondary" />
              ) : null}
            </div>
          )}
        </div>

        {imageUrl ? (
          <div className={styles.media}>
            <img
              src={imageUrl}
              alt={imageAlt}
              className={styles.mediaImage}
              loading="lazy"
              decoding="async"
            />
            {videoUrl ? (
              <a
                className={styles.playButton}
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Play video: ${heading}`}
              >
                <span className={styles.playIcon} aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="currentColor" focusable="false">
                    <path d="M3 1.8v12.4a.6.6 0 0 0 .92.5l9.6-6.2a.6.6 0 0 0 0-1L3.92 1.3a.6.6 0 0 0-.92.5Z" />
                  </svg>
                </span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
