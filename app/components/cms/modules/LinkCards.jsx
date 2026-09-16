import CmsLink from '~/components/cms/CmsLink';
import {LinkIcon} from '~/components/icons/LinkIcon';
import styles from './LinkCards.module.css';

/**
 * Link Cards module — Figma "Shop" hifi (sprint-04/hifi_shop.html).
 *
 * Intro copy above a row of compact linked cards: an icon tile beside a title
 * and one line of copy, with a chevron at the end.
 *
 * Lighter than Card Grid — no imagery, no price, sized for pointing people
 * onward rather than selling to them. Icons are drawn from a fixed local set
 * (app/components/icons/LinkIcon.jsx), so there is nothing for an editor to
 * upload and every icon shares one stroke weight.
 *
 * @param {{
 *   data: {
 *     background?: 'white' | 'grey',
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     items?: Array<{
 *       id: number,
 *       icon?: string,
 *       title: string,
 *       description?: string,
 *       link?: object,
 *     }>,
 *   },
 * }} props
 */
export default function LinkCards({data}) {
  const {eyebrow, heading, body, background, items = []} = data ?? {};

  if (!heading) return null;

  /*
   * Only "grey" gets a class, same as Text & Media. Strapi applies an enum
   * default on CREATE only, so a Link Cards authored before this field existed
   * comes back null rather than "white" — treating anything that is not "grey"
   * as white covers both.
   */
  const backgroundClass = background === 'grey' ? styles.grey : '';

  return (
    <section className={`${styles.section} ${backgroundClass}`.trim()}>
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
              <Card key={item.id ?? i} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * @param {{item: object, index?: number}} props
 */
function Card({item, index = 0}) {
  const {icon, title, description, link} = item;

  const inner = (
    <>
      {icon ? (
        <span className={styles.iconTile}>
          {/* Decorative: the title beside it says the same thing, and the whole
              card is one link — an icon label would be read twice. */}
          <LinkIcon name={icon} className={styles.icon} />
        </span>
      ) : null}

      <span className={styles.cardText}>
        <span className={styles.cardTitle}>{title}</span>
        {description ? (
          <span className={styles.cardDescription}>{description}</span>
        ) : null}
      </span>

      {/* Chevron, not a character in the copy: it is an affordance, so it is
          generated here and hidden from screen readers. */}
      <span className={styles.chevron} aria-hidden="true">
        ›
      </span>
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
