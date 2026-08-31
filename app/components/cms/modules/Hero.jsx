import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './Hero.module.css';

/**
 * Hero module — Figma "Homepage" → Hifi → Main → Section (7:1516).
 *
 * Background image with a navy scrim, then eyebrow / heading / body / trust bar
 * / two CTAs. Copy is capped at the shared container width so it aligns with the
 * header and every other section.
 *
 * `heading` and `body` are multi-line CMS text fields whose line breaks are
 * deliberate in the design, so both render with `white-space: pre-line`.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     trustItems?: Array<{id: number, label: string}>,
 *     backgroundImage?: {url?: string, alternativeText?: string},
 *     backgroundImageAlt?: string,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function Hero({data, baseUrl}) {
  if (!data?.heading) return null;

  const {
    eyebrow,
    heading,
    body,
    trustItems = [],
    primaryCTA,
    secondaryCTA,
  } = data;

  const bgUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section className={styles.hero}>
      {bgUrl ? (
        <div className={styles.background}>
          <img
            src={bgUrl}
            /* Decorative: the heading carries all the meaning, so an empty alt
               is correct here — it keeps screen readers from announcing a
               filename. Do not "fix" this to a description. */
            alt=""
            className={styles.backgroundImage}
            /* The hero is the largest above-the-fold paint on the page, so it
               is loaded eagerly and flagged high priority rather than lazily —
               this is the LCP element. */
            loading="eager"
            /* Lowercase is deliberate. React 18 does not recognise the
               camelCase `fetchPriority` prop — it warns and drops the attribute
               entirely, so the hint never reaches the browser. The lint rule
               below targets React 19 semantics; revisit on upgrade. */
            // eslint-disable-next-line react/no-unknown-property
            fetchpriority="high"
            decoding="async"
          />
        </div>
      ) : null}
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}

          <h1 className={styles.heading}>{heading}</h1>

          {body ? <p className={styles.body}>{body}</p> : null}

          {trustItems.length > 0 && (
            <ul className={styles.trust}>
              {trustItems.map((item, i) => (
                <li className={styles.trustItem} key={item.id ?? i}>
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
      </div>
    </section>
  );
}
