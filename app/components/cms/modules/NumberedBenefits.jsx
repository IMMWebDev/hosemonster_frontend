import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './NumberedBenefits.module.css';

/**
 * Numbered Benefits module — sprint-04 hifi_smartmonsterfeature.html,
 * "Replace analog".
 *
 * A full-bleed band on a dark photo: eyebrow and heading, then a numbered list
 * of benefits beside a checklist card ("What stays the same"). The numbers come
 * from the order of the rows. Leave the card's fields empty and the list runs
 * on its own. Page-agnostic; Numbered Steps is the light version with the
 * steps in a row.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     items?: Array<{id: number, title?: string, description?: string}>,
 *     cardLabel?: string,
 *     cardBody?: string,
 *     cardChecklist?: Array<{id: number, label: string}>,
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function NumberedBenefits({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const {eyebrow, heading, cardLabel, cardBody} = data ?? {};

  if (!heading) return null;

  const items = (data.items ?? []).filter((item) => item?.title);
  const checklist = (data.cardChecklist ?? []).filter((item) => item?.label);
  const hasCard = Boolean(cardLabel || cardBody || checklist.length > 0);
  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section {...trackingRoot} className={styles.section}>
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          /* Decorative — the copy carries the meaning. */
          alt=""
          className={styles.backgroundImage}
          data-parallax="slow"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          {heading}
        </h2>

        {items.length > 0 || hasCard ? (
          <div className={styles.grid}>
            {items.length > 0 ? (
              /* role="list": list-style: none strips list semantics in
                 Safari, and the hidden numerals below rely on them. */
              <ol className={styles.list} role="list">
                {items.map((item, i) => (
                  <li
                    className={styles.item}
                    key={item.id ?? i}
                    data-reveal
                    style={{'--reveal-i': i + 2}}
                  >
                    {/* The <ol> already announces the position, so the
                     * drawn numeral is hidden from screen readers. */}
                    <span className={styles.number} aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className={styles.itemCopy}>
                      <h3 className={styles.itemTitle}>{item.title}</h3>
                      {item.description ? (
                        <p className={styles.itemBody}>{item.description}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}

            {hasCard ? (
              /* A div, not an <aside>: the card is part of the section's
                 content, not a separate landmark. Its label is an h3 so it
                 still has a name in the heading outline. */
              <div className={styles.card} data-reveal="right">
                {cardLabel ? (
                  <h3 className={styles.cardLabel}>{cardLabel}</h3>
                ) : null}
                {cardBody ? <p className={styles.cardBody}>{cardBody}</p> : null}
                {checklist.length > 0 ? (
                  <ul className={styles.checklist} role="list">
                    {checklist.map((item, i) => (
                      <li className={styles.check} key={item.id ?? i}>
                        <CheckIcon />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/*
 * An SVG, not the comp's "✓" character: Gopher has no check glyph, so the
 * character would come from a fallback font and change shape per device. Same
 * mark as Text & Checklist.
 */
function CheckIcon() {
  return (
    <svg
      className={styles.checkIcon}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 8.5l3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
