import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './CardGrid.module.css';

/**
 * Card Grid module — Figma "Shop" hifi (sprint-04/hifi_shop.html).
 *
 * Intro copy above a three-up grid of bordered cards: landscape image, title,
 * a line of supporting copy, and a link label.
 *
 * Shares `utilities.feature-card` with the Feature Cards module — the content
 * is identical, only the treatment differs (Feature Cards is a four-up row of
 * dark portrait cards; this is a three-up grid of light bordered ones). Adding
 * a field to that component therefore shows up in both modules.
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
 *       image?: {url?: string, alternativeText?: string},
 *       link?: object,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CardGrid({data, baseUrl}) {
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
              <Card
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
 * @param {{item: object, baseUrl?: string, index?: number}} props
 */
function Card({item, baseUrl, index = 0}) {
  const {title, description, link} = item;
  const imageUrl = strapiMedia(item.image?.url, baseUrl);

  const inner = (
    <>
      {imageUrl ? (
        <img
          src={imageUrl}
          /* Decorative: the title directly below carries the meaning, so an
             empty alt is correct — it stops a screen reader announcing a
             filename inside the link's own name. */
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
        {/*
          The whole card is the anchor, so this is a visual affordance rather
          than a second click target. Left readable rather than aria-hidden
          because "Shop" is the clearest statement of what following the link
          actually does.
        */}
        {link?.linkText ? (
          <span className={styles.cardAction}>{link.linkText}</span>
        ) : null}
      </div>
    </>
  );

  // With nothing to link to, render a plain container rather than a dead anchor.
  if (!link) {
    return (
      <div className={styles.card} data-reveal style={{'--reveal-i': index + 3}}>
        {inner}
      </div>
    );
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
