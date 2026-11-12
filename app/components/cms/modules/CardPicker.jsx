import {useId, useRef, useState} from 'react';
import CmsLink from '~/components/cms/CmsLink';
import UiIcon from '~/components/icons/UiIcon';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './CardPicker.module.css';

/**
 * Card Picker module — sprint-05 hifi_useshub.html, "Start from the
 * situation".
 *
 * Intro copy over a vertical list of options beside one white card. Picking an
 * option swaps the card, which links on to the page it names; the link is
 * stretched over the card, so the whole card clicks through. On the Uses hub
 * the options are situations and the card is what you need. Page-agnostic.
 *
 * Same behaviour as Tabbed Cards, so the same WAI-ARIA tabs pattern: roving
 * tabindex, a labelled panel, and — because this list runs vertically — Up /
 * Down to move between options (Home / End to the ends). Every option's card
 * is in the server HTML, so crawlers see each one's copy and link, not just
 * the first; the others carry `hidden`, and their lazy photos aren't fetched
 * until they're shown.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     items?: Array<{
 *       id: number,
 *       label: string,
 *       eyebrow?: string,
 *       heading: string,
 *       body?: string,
 *       image?: {url?: string, alternativeText?: string},
 *       link?: object,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CardPicker({data, baseUrl}) {
  const {eyebrow, heading, body, items = []} = data ?? {};
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef([]);
  const baseId = useId();
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();

  if (!heading || items.length === 0) return null;

  // Guard against the CMS shrinking the list after an option was picked.
  const index = Math.min(activeIndex, items.length - 1);

  /** @param {import('react').KeyboardEvent} event */
  function handleKeyDown(event) {
    const last = items.length - 1;
    let next = null;

    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  }

  return (
    <section {...trackingRoot} className={styles.section}>
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

        <div className={styles.picker} data-reveal style={{'--reveal-i': 3}}>
          <div
            className={styles.list}
            role="tablist"
            aria-label={heading}
            aria-orientation="vertical"
          >
            {items.map((item, i) => (
              <button
                key={item.id ?? i}
                type="button"
                role="tab"
                id={`${baseId}-option-${i}`}
                aria-controls={`${baseId}-panel-${i}`}
                aria-selected={i === index}
                // Roving tabindex: Tab moves past the whole list, arrows move
                // within it.
                tabIndex={i === index ? 0 : -1}
                ref={(el) => (optionRefs.current[i] = el)}
                className={styles.option}
                onClick={() => setActiveIndex(i)}
                onKeyDown={handleKeyDown}
                data-track-id={trackId(`option-${i + 1}`)}
              >
                <span className={styles.optionLabel}>{item.label}</span>
                <UiIcon name="chevron" className={styles.optionChevron} />
              </button>
            ))}
          </div>

          {items.map((item, i) => {
            const imageUrl = strapiMedia(item.image?.url, baseUrl);
            return (
              <div
                key={item.id ?? i}
                className={styles.card}
                role="tabpanel"
                id={`${baseId}-panel-${i}`}
                aria-labelledby={`${baseId}-option-${i}`}
                tabIndex={0}
                hidden={i !== index}
              >
                {imageUrl ? (
                  <div className={styles.cardMedia}>
                    <img
                      src={imageUrl}
                      alt=""
                      className={styles.cardImage}
                      // Lazy, so a hidden card's photo isn't fetched until
                      // it's shown.
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : null}
                <div className={styles.cardCopy}>
                  {item.eyebrow ? (
                    <p className={styles.cardEyebrow}>{item.eyebrow}</p>
                  ) : null}
                  <h3 className={styles.cardHeading}>{item.heading}</h3>
                  {item.body ? (
                    <p className={styles.cardBody}>{item.body}</p>
                  ) : null}
                  {item.link?.linkText ? (
                    <CmsLink
                      link={item.link}
                      className={styles.cardAction}
                      trackRole={`option-${i + 1}-cta`}
                    >
                      {item.link.linkText}
                      <UiIcon name="chevron" className={styles.cardActionIcon} />
                    </CmsLink>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
