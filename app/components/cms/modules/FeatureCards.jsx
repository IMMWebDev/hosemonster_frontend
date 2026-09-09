import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './FeatureCards.module.css';

/**
 * Feature Cards module — Figma "Homepage" → Hifi → Main → Section (7:1673).
 *
 * Intro copy above a row of portrait cards. The red card in the comp is the
 * hover state, not a flagged card, so nothing here is content-driven — every
 * card behaves the same. Page-agnostic.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     items?: Array<{
 *       id: number,
 *       title: string,
 *       description?: string,
 *       image?: {url?: string},
 *       link?: object,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function FeatureCards({data, baseUrl}) {
  const {eyebrow, heading, body, items = []} = data ?? {};

  if (!heading) return null;

  return (
    <section className={styles.section}>
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

        {items.length > 0 && (
          <div className={styles.grid}>
            {items.map((item, i) => (
              <FeatureCard
                key={item.id ?? i}
                item={item}
                baseUrl={baseUrl}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * @param {{item: object, baseUrl?: string}} props
 */
function FeatureCard({item, baseUrl, index = 0}) {
  const {title, description, link} = item;
  const imageUrl = strapiMedia(item.image?.url, baseUrl);

  const inner = (
    <>
      {/* Sits behind the content; see the note in the stylesheet on why the red
          state is a stacked layer rather than a background swap. */}
      <div className={styles.cardHoverBg} aria-hidden="true" />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={styles.cardImage}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.cardText}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {description ? (
          <p className={styles.cardDescription}>{description}</p>
        ) : null}
      </div>
    </>
  );

  // With nothing to link to, render a plain container rather than a dead anchor.
  if (!link) {
    return <div className={styles.card}>{inner}</div>;
  }

  // CmsLink resolves internal (<Link>) vs external (<a>) and handles openNewTab.
  return (
    <CmsLink
      link={link}
      className={styles.card}
      dataReveal
      style={{'--reveal-i': index + 3}}
    >
      {inner}
    </CmsLink>
  );
}
