import CmsLink from '~/components/cms/CmsLink';
import {LinkIcon} from '~/components/icons/LinkIcon';
import {linkDestination} from '~/lib/cms-links';
import {noteBodyHtml} from '~/lib/cms-note';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './LinkCards.module.css';

/** Columns Per Row in Strapi -> cards across on desktop. */
const COLUMNS = {two: 2, three: 3, four: 4};

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
 *     columnsPerRow?: 'two' | 'three' | 'four',
 *     layout?: 'row' | 'stacked' | null,
 *     linkStyle?: 'card' | 'button' | 'arrow' | null,
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     items?: Array<{
 *       id: number,
 *       icon?: string,
 *       badge?: string,
 *       title: string,
 *       description?: string,
 *       link?: object,
 *     }>,
 *     note?: {heading?: string, body?: string} | null,
 *   },
 * }} props
 */
export default function LinkCards({data}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const {
    eyebrow,
    heading,
    body,
    background,
    columnsPerRow,
    layout,
    linkStyle,
    items = [],
    note,
  } = data ?? {};

  if (!heading) return null;

  // The shared utilities.note component: heading on its own line, then body.
  const noteHeading = note?.heading?.trim();
  const noteHtml = noteBodyHtml(note?.body, {trackId});

  // Strapi applies the enum default on create only; anything unset is three,
  // the design's row.
  const columns = COLUMNS[columnsPerRow] ?? 3;

  /*
   * Only "grey" gets a class, same as Text & Media. Strapi applies an enum
   * default on CREATE only, so a Link Cards authored before this field existed
   * comes back null rather than "white" — treating anything that is not "grey"
   * as white covers both.
   */
  const backgroundClass = background === 'grey' ? styles.grey : '';

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
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
          /* Columns Per Row from Strapi (desktop); extra cards wrap to a new
             row. Fewer cards than columns share the row rather than leave
             empty slots. "stacked" puts the icon above the title (sprint-05
             hifi_hydrantflowtesting.html, "What the gauge tells you"); null —
             a module saved before the field existed — is the row layout. */
          <div
            className={
              layout === 'stacked'
                ? `${styles.grid} ${styles.stacked}`
                : styles.grid
            }
            style={{'--cols': Math.min(items.length, columns)}}
          >
            {items.map((item, i) => (
              <Card
                key={item.id ?? i}
                item={item}
                index={i}
                linkStyle={linkStyle}
              />
            ))}
          </div>
        )}

        {/* The orange-edged callout under the cards (sprint-05
            hifi_firepumptesting.html, "Three points, one curve.") — the same
            treatment as Text & Table's note. */}
        {noteHeading || noteHtml ? (
          <div className={styles.note} data-reveal>
            {noteHeading ? (
              <p className={styles.noteText}>{noteHeading}</p>
            ) : null}
            {noteHtml ? (
              <div
                className={`${styles.noteText} cms-note-body`}
                dangerouslySetInnerHTML={{__html: noteHtml}}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * @param {{item: object, index?: number, linkStyle?: string | null}} props
 */
function Card({item, index = 0, linkStyle}) {
  const {icon, badge, title, description, link} = item;

  /*
   * Does this card actually go anywhere?
   *
   * Not `if (link)` — a link component exists the moment an editor types the
   * text, and Strapi keeps it with an empty destination. Checking the object
   * rather than its contents left cards that lead nowhere looking and behaving
   * like links. All four destinations utilities.link models count, and a "#"
   * placeholder counts as a destination: editors use it while the real page
   * is still being built.
   */
  const hasDestination = Boolean(linkDestination(link));

  /*
   * Link Style "button" (sprint-05 hifi_hmuhub.html, "Choose How You Learn"):
   * the link is an orange pill at the foot of the card, labelled with its Link
   * Text. A button needs a label, so a card without one keeps the chevron.
   */
  const linkLabel = link?.linkText?.trim();
  const asButton =
    linkStyle === 'button' && hasDestination && Boolean(linkLabel);

  /*
   * Link Style "arrow" (sprint-05 hifi_hmuvideos.html, "Prefer to read it?"):
   * the whole card is still the link, and its Link Text sits at the foot of
   * the card as the site's orange arrow link instead of the corner chevron.
   * It needs a label too, so a card without one keeps the chevron.
   */
  const asArrow =
    linkStyle === 'arrow' && hasDestination && Boolean(linkLabel);

  const inner = (
    <>
      {icon ? (
        <span className={styles.iconTile}>
          {/* Decorative: the title beside it says the same thing, and the whole
              card is one link — an icon label would be read twice. */}
          <LinkIcon name={icon} className={styles.icon} />
        </span>
      ) : null}

      {/* A div, not a span, so the h3 inside is valid markup. The title is an
          h3 so each card sits under the section's h2 in the heading outline,
          as Card Grid's do. */}
      <div className={styles.cardText}>
        {badge ? <span className={styles.cardBadge}>{badge}</span> : null}
        <h3 className={styles.cardTitle}>{title}</h3>
        {description ? (
          <span className={styles.cardDescription}>{description}</span>
        ) : null}
        {asArrow ? (
          <span className={styles.cardArrow}>
            {linkLabel}
            <svg
              className={styles.cardArrowIcon}
              width="6"
              height="11"
              viewBox="-12 -12 682 1229"
              aria-hidden="true"
              focusable="false"
            >
              <polygon
                points="0,0 225,0 658,602 225,1205 0,1205 423,602"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="24"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </div>

      {/*
        The chevron is an affordance, so it only appears when there is
        somewhere to go. On a card that does not link it reads as a promise the
        card cannot keep — the same reason .static below cancels the hover.
        Generated here rather than typed into the copy, and hidden from screen
        readers since the link itself already announces.
      */}
      {hasDestination && !asButton && !asArrow ? (
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
      ) : null}
    </>
  );

  /*
   * The card is a plain container and the button is the one link, so the
   * card's text isn't read out as part of the link name ("See Upcoming
   * Courses", not the whole card). Only the button is clickable. The card
   * lifts on hover (the house card hover), but the button only shows its own
   * hover when the pointer is on it.
   *
   * The scroll-in reveal sits on a wrapper cell, so it doesn't override the
   * card's hover transition (Numbered Link Cards does the same).
   */
  if (asButton) {
    return (
      <div
        className={styles.cell}
        data-reveal
        style={{'--reveal-i': index + 3}}
      >
        <div className={`${styles.card} ${styles.withButton}`}>
          {/* Icon and copy together — side by side in the row layout, the
              icon above in stacked — with the button on its own line under
              them in both. */}
          <div className={styles.cardTop}>{inner}</div>
          <CmsLink
            link={link}
            className={`btn btn--primary ${styles.cardButton}`}
            trackRole={`card-${index + 1}`}
          />
        </div>
      </div>
    );
  }

  /*
   * The whole card is the link, so its hover is honest: the house card hover,
   * with the arrow nudging. The reveal sits on a wrapper cell, as above, so it
   * doesn't override the card's hover transition.
   */
  if (asArrow) {
    return (
      <div
        className={styles.cell}
        data-reveal
        style={{'--reveal-i': index + 3}}
      >
        <CmsLink
          link={link}
          className={`${styles.card} ${styles.withArrow}`}
          trackRole={`card-${index + 1}`}
        >
          {inner}
        </CmsLink>
      </div>
    );
  }

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
      trackRole={`card-${index + 1}`}
    >
      {inner}
    </CmsLink>
  );
}
