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

  /*
   * Does this card actually go anywhere?
   *
   * Not `if (link)` — a link component exists the moment an editor types the
   * text, and Strapi keeps it with an empty or "#" destination. Checking the
   * object rather than its contents left cards that lead nowhere looking and
   * behaving like links. All three destinations utilities.link models count.
   */
  const hasDestination = Boolean(
    (link?.linkUrl && link.linkUrl !== '#') ||
    link?.pageLink?.path ||
    link?.collectionLink?.path,
  );

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

      {/*
        The chevron is an affordance, so it only appears when there is
        somewhere to go. On a card that does not link it reads as a promise the
        card cannot keep — the same reason .static below cancels the hover.
        Generated here rather than typed into the copy, and hidden from screen
        readers since the link itself already announces.
      */}
      {hasDestination ? (
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
      ) : null}
    </>
  );

  // Nothing to link to: a plain container, not a dead anchor.
  if (!hasDestination) {
    return (
      <div
        className={`${styles.card} ${styles.static}`}
        data-reveal
        style={{'--reveal-i': index + 3}}
      >
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
