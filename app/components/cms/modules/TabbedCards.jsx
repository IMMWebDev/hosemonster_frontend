import {useId, useRef, useState} from 'react';
import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './TabbedCards.module.css';

/**
 * Tabbed Cards module — intro copy, a segmented tab bar, and a card that swaps
 * with the selected tab. The tab count is CMS-driven.
 *
 * Page-agnostic. First used by the homepage's "Guided Discovery" section
 * (Figma "Homepage" → Hifi → Main → Section 7:1546), but the eyebrow and
 * heading are content, so it can be reused anywhere.
 *
 * This is the first interactive module, so it implements the WAI-ARIA tabs
 * pattern properly rather than being a row of buttons: roving tabindex, arrow /
 * Home / End keys, and one labelled panel per tab. Every panel is in the
 * server HTML, so crawlers see each card's copy and links, not just the first;
 * the others carry `hidden`, and their lazy background images aren't fetched
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
 *       title: string,
 *       description?: string,
 *       image?: {url?: string, alternativeText?: string},
 *       primaryCTA?: object,
 *       secondaryCTA?: object,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function TabbedCards({data, baseUrl}) {
  const {eyebrow, heading, body, items = []} = data ?? {};
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef([]);
  const baseId = useId();
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();

  if (!heading || items.length === 0) return null;

  // Guard against the CMS shrinking the list after a tab was selected.
  const index = Math.min(activeIndex, items.length - 1);

  /**
   * Arrow keys move between tabs and activate as they go, which is the
   * expected behaviour for tabs whose panels are cheap to render.
   *
   * @param {import('react').KeyboardEvent} event
   */
  function handleKeyDown(event) {
    const last = items.length - 1;
    let next = null;

    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
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

        <div
          className={styles.tablist}
          role="tablist"
          aria-label={heading}
          data-reveal
          style={{'--reveal-i': 3}}
        >
          {items.map((item, i) => (
            <button
              key={item.id ?? i}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-controls={`${baseId}-panel-${i}`}
              aria-selected={i === index}
              // Roving tabindex: only the selected tab is in the tab order, so
              // Tab moves past the whole group rather than through every tab.
              tabIndex={i === index ? 0 : -1}
              ref={(el) => (tabRefs.current[i] = el)}
              className={styles.tab}
              onClick={() => setActiveIndex(i)}
              onKeyDown={handleKeyDown}
              data-track-id={trackId(`tab-${i + 1}`)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {items.map((item, i) => {
          const imageUrl = strapiMedia(item.image?.url, baseUrl);
          // 1-based, for the card buttons' roles: tab-2-primary-cta is tab
          // 2's card.
          const number = i + 1;
          return (
            <div
              key={item.id ?? i}
              className={styles.card}
              role="tabpanel"
              id={`${baseId}-panel-${i}`}
              aria-labelledby={`${baseId}-tab-${i}`}
              tabIndex={0}
              hidden={i !== index}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className={styles.cardImage}
                  // Lazy, so a hidden panel's image isn't fetched until it's
                  // shown.
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              <div className={styles.cardWash} aria-hidden="true" />

              <div className={styles.cardCopy}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                {item.description ? (
                  <p className={styles.cardDescription}>{item.description}</p>
                ) : null}
              </div>

              {(item.primaryCTA?.linkText || item.secondaryCTA?.linkText) && (
                <div className={styles.cardActions}>
                  {item.primaryCTA?.linkText ? (
                    <CmsLink
                      link={item.primaryCTA}
                      className="btn btn--primary"
                      trackRole={`tab-${number}-primary-cta`}
                    />
                  ) : null}
                  {item.secondaryCTA?.linkText ? (
                    <CmsLink
                      link={item.secondaryCTA}
                      className="btn btn--secondary"
                      trackRole={`tab-${number}-secondary-cta`}
                    />
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
