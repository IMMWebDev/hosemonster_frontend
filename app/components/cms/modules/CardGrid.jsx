import CmsLink from '~/components/cms/CmsLink';
import UiIcon from '~/components/icons/UiIcon';
import {linkDestination} from '~/lib/cms-links';
import {noteBodyHtml} from '~/lib/cms-note';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './CardGrid.module.css';

const COLUMNS = {three: 3, four: 4};

/**
 * Card Grid module — Figma "Shop" hifi (sprint-04/hifi_shop.html).
 *
 * Intro copy above a grid of bordered cards: landscape image, an optional badge
 * (the Uses hub's "NFPA 291" pill), title, a line of supporting copy, and a
 * link label. Three across on desktop (Shop) or four (Smart Monster's "Use
 * cases"), per `columnsPerRow`.
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
 *     background?: 'white' | 'grey' | null,
 *     columnsPerRow?: 'three' | 'four',
 *     imageStyle?: 'photo' | 'fit' | null,
 *     note?: {heading?: string, body?: string} | null,
 *     primaryCTA?: object,
 *     items?: Array<{
 *       id: number,
 *       badge?: string,
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
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const {
    eyebrow,
    heading,
    body,
    background,
    columnsPerRow,
    imageStyle,
    items = [],
    note,
    primaryCTA,
  } = data ?? {};

  if (!heading) return null;

  // The shared utilities.note component: Heading on its own line, then the
  // Body, whose links sit inside its sentences. See lib/cms-note.js.
  const noteHeading = note?.heading?.trim();
  const noteHtml = noteBodyHtml(note?.body, {trackId});

  // Strapi applies the "three" default on CREATE only, so an entry made
  // before the field existed comes back null — which is three.
  const columns = COLUMNS[columnsPerRow] ?? 3;

  // Only "grey" gets a class, same as Link Cards. The enum default applies on
  // CREATE only, so a Card Grid made before the field existed comes back null
  // — treated as white, which is how every one of them was drawn.
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
          /* "fit" shows each image whole on white instead of cropping it
             to fill — product cut-outs (sprint-05 hifi_hydrantflowtesting.html,
             "What it takes to run one"). Null is "photo", the default. */
          <div
            className={
              imageStyle === 'fit'
                ? `${styles.grid} ${styles.fitImages}`
                : styles.grid
            }
            style={{'--cols': columns}}
          >
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

        {/* sprint-05 hifi_firepumptesting.html, "Testing a truck pump
            instead?" — the same orange-edged callout as Link Cards' and
            Text & Table's notes, with its heading set as a real H3. */}
        {noteHeading || noteHtml ? (
          <div className={styles.note} data-reveal>
            {noteHeading ? (
              <h3 className={styles.noteHeading}>{noteHeading}</h3>
            ) : null}
            {noteHtml ? (
              <div
                className={`${styles.noteBody} cms-note-body`}
                dangerouslySetInnerHTML={{__html: noteHtml}}
              />
            ) : null}
          </div>
        ) : null}

        {primaryCTA?.linkText ? (
          <CmsLink
            link={primaryCTA}
            className={`btn btn--primary ${styles.cta}`}
            trackRole="primary-cta"
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * @param {{item: object, baseUrl?: string, index?: number}} props
 */
function Card({item, baseUrl, index = 0}) {
  const {badge, title, description, link} = item;

  /*
   * Does this card actually go anywhere? Not `if (link)`: Strapi keeps a link
   * component the moment an editor types its text, even with no destination.
   * The same check as Link Cards; a "#" placeholder counts as a destination.
   */
  const hasDestination = Boolean(linkDestination(link));
  const imageUrl = strapiMedia(item.image?.url, baseUrl);

  const inner = (
    <>
      {imageUrl ? (
        /* The frame clips the photo's hover zoom, so it never spills onto
           the title below. */
        <div className={styles.cardMedia}>
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
        </div>
      ) : null}
      <div className={styles.cardText}>
        {badge ? <p className={styles.cardBadge}>{badge}</p> : null}
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
        {hasDestination && link.linkText ? (
          <span className={styles.cardAction}>
            {link.linkText}
            <UiIcon name="chevron" className={styles.cardActionIcon} />
          </span>
        ) : null}
      </div>
    </>
  );

  /*
   * Nothing to link to: a plain container rather than a dead anchor, and no
   * hover (.static) — a hover on something you can't click is a false
   * promise.
   */
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

  // CmsLink resolves internal (<Link>) vs external (<a>) and handles openNewTab.
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
