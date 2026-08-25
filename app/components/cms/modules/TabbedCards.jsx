import {useId, useRef, useState} from 'react';
import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
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
 * Home / End keys, and a labelled panel. Only the selected panel is rendered —
 * the others hold nothing a crawler needs, and mounting four cards would fetch
 * four background images to show one.
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

  if (!heading || items.length === 0) return null;

  // Guard against the CMS shrinking the list after a tab was selected.
  const active = items[Math.min(activeIndex, items.length - 1)];

  /**
   * Arrow keys move between tabs and activate as they go, which is the
   * expected behaviour for tabs whose panels are cheap to render.
   *
   * @param {import('react').KeyboardEvent} event
   */
  function handleKeyDown(event) {
    const last = items.length - 1;
    let next = null;

    if (event.key === 'ArrowRight') next = activeIndex === last ? 0 : activeIndex + 1;
    else if (event.key === 'ArrowLeft') next = activeIndex === 0 ? last : activeIndex - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }

  const imageUrl = strapiMedia(active.image?.url, baseUrl);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.heading}>{heading}</h2>
        {body ? <p className={styles.body}>{body}</p> : null}

        <div className={styles.tablist} role="tablist" aria-label={heading}>
          {items.map((item, i) => (
            <button
              key={item.id ?? i}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-controls={`${baseId}-panel-${i}`}
              aria-selected={i === activeIndex}
              // Roving tabindex: only the selected tab is in the tab order, so
              // Tab moves past the whole group rather than through every tab.
              tabIndex={i === activeIndex ? 0 : -1}
              ref={(el) => (tabRefs.current[i] = el)}
              className={styles.tab}
              onClick={() => setActiveIndex(i)}
              onKeyDown={handleKeyDown}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className={styles.card}
          role="tabpanel"
          id={`${baseId}-panel-${activeIndex}`}
          aria-labelledby={`${baseId}-tab-${activeIndex}`}
          tabIndex={0}
        >
          {imageUrl ? (
            <img
              // Keyed by url so React swaps the element rather than mutating
              // src on the existing one, which would show the old image
              // stretched into the new card until the new file decodes.
              key={imageUrl}
              src={imageUrl}
              alt=""
              className={styles.cardImage}
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className={styles.cardWash} aria-hidden="true" />

          <div className={styles.cardCopy}>
            <h3 className={styles.cardTitle}>{active.title}</h3>
            {active.description ? (
              <p className={styles.cardDescription}>{active.description}</p>
            ) : null}
          </div>

          {(active.primaryCTA?.linkText || active.secondaryCTA?.linkText) && (
            <div className={styles.cardActions}>
              {active.primaryCTA?.linkText ? (
                <CmsLink link={active.primaryCTA} className="btn btn--primary" />
              ) : null}
              {active.secondaryCTA?.linkText ? (
                <CmsLink
                  link={active.secondaryCTA}
                  className="btn btn--secondary"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
