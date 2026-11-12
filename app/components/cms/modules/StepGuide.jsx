import {useId, useRef, useState} from 'react';
import CmsLink from '~/components/cms/CmsLink';
import UiIcon from '~/components/icons/UiIcon';
import {noteBodyHtml} from '~/lib/cms-note';
import {strapiMedia, warnMissingAlt} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './StepGuide.module.css';

/**
 * Step Guide module — sprint-05 hifi_hydrantflowtesting.html, "Running the
 * test – step by step".
 *
 * Intro copy over a numbered list of steps beside one card. Picking a step
 * shows its photo, a "Step 2 of 6" label, its title and its explanation; the
 * card's previous / next arrows walk the same list. Under the list sit an
 * optional button and an optional note. Page-agnostic.
 *
 * The list is a vertical WAI-ARIA tablist, the same pattern as Card Picker:
 * roving tabindex, Up / Down / Home / End, one labelled panel per step. Every
 * step's panel is in the server HTML, so crawlers (and readers without
 * JavaScript) get the whole procedure, not just step 1; the others carry
 * `hidden`, and their lazy photos aren't fetched until they're shown.
 *
 * The previous / next arrows sit outside the panels, in the card, so they
 * survive the swap: a button inside the panel being hidden would drop focus.
 *
 * On wide screens the button and note sit under the list; once the layout
 * stacks they move under the card, so the card stays right under the step
 * that was just picked.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     steps?: Array<{
 *       id: number,
 *       title: string,
 *       body?: string,
 *       image?: {url?: string, alternativeText?: string},
 *     }>,
 *     primaryCTA?: object,
 *     note?: {heading?: string, body?: string} | null,
 *     background?: 'white' | 'grey' | null,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function StepGuide({data, baseUrl}) {
  const {
    eyebrow,
    heading,
    body,
    steps: rawSteps = [],
    primaryCTA,
    note,
    background,
  } = data ?? {};
  const [activeIndex, setActiveIndex] = useState(0);
  // What the arrows announce. Picking a step in the list needs no
  // announcement — the tab itself is read out — but the arrows leave focus
  // where it is, so the new step has to be spoken.
  const [announcement, setAnnouncement] = useState('');
  const stepRefs = useRef([]);
  const baseId = useId();
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();

  const steps = rawSteps.filter((step) => step?.title);
  if (!heading || steps.length === 0) return null;

  // Guard against the CMS shrinking the list after a step was picked.
  const index = Math.min(activeIndex, steps.length - 1);
  const last = steps.length - 1;

  /** @param {import('react').KeyboardEvent} event */
  function handleKeyDown(event) {
    let next = null;
    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    setActiveIndex(next);
    stepRefs.current[next]?.focus();
  }

  /** @param {number} next */
  function goTo(next) {
    if (next < 0 || next > last) return;
    setActiveIndex(next);
    setAnnouncement(
      `Step ${next + 1} of ${steps.length}: ${steps[next].title}`,
    );
  }

  const imageUrls = steps.map((step) => strapiMedia(step.image?.url, baseUrl));
  // Each step's photo shows the step, so it's content (see its <img> below).
  steps.forEach((step, i) => {
    if (imageUrls[i]) {
      warnMissingAlt(step.image, `Step Guide step ${i + 1} image`);
    }
  });
  const hasPager = steps.length > 1;
  // The card's modifiers: whether the arrows sit under the copy, and whether
  // the shown step has a photo (on tablet the copy takes the photo's column
  // when it doesn't).
  const cardClass = [
    styles.card,
    hasPager ? styles.hasPager : '',
    imageUrls[index] ? styles.hasMedia : '',
  ]
    .filter(Boolean)
    .join(' ');
  // Strapi applies the "white" default on CREATE only; null is white too.
  const sectionClass =
    background === 'grey' ? `${styles.section} ${styles.grey}` : styles.section;
  // The shared utilities.note component: heading on its own line, then body.
  const noteHeading = note?.heading?.trim();
  const noteHtml = noteBodyHtml(note?.body, {trackId});
  const hasExtras = Boolean(primaryCTA?.linkText || noteHeading || noteHtml);

  return (
    <section {...trackingRoot} className={sectionClass}>
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

        <div className={styles.layout} data-reveal style={{'--reveal-i': 3}}>
          <div
            className={styles.list}
            role="tablist"
            aria-label={heading}
            aria-orientation="vertical"
          >
            {steps.map((step, i) => (
              <button
                key={step.id ?? i}
                type="button"
                role="tab"
                id={`${baseId}-step-${i}`}
                aria-controls={`${baseId}-panel-${i}`}
                aria-selected={i === index}
                // Roving tabindex: Tab moves past the whole list, arrows move
                // within it.
                tabIndex={i === index ? 0 : -1}
                ref={(el) => (stepRefs.current[i] = el)}
                className={styles.step}
                onClick={() => setActiveIndex(i)}
                onKeyDown={handleKeyDown}
                data-track-id={trackId(`step-${i + 1}`)}
              >
                <span className={styles.stepNumber} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={styles.stepTitle}>{step.title}</span>
              </button>
            ))}
          </div>

          <div className={cardClass}>
            {steps.map((step, i) => (
              <div
                key={step.id ?? i}
                className={styles.panel}
                role="tabpanel"
                id={`${baseId}-panel-${i}`}
                aria-labelledby={`${baseId}-step-${i}`}
                // Focusable, so Tab from the step list lands on the step's
                // copy (the WAI-ARIA tabs pattern) — the arrows sit outside.
                tabIndex={0}
                hidden={i !== index}
              >
                {imageUrls[i] ? (
                  <div className={styles.cardMedia}>
                    <img
                      src={imageUrls[i]}
                      // These photos show the step, so they carry their own
                      // description from the Media Library.
                      alt={step.image?.alternativeText ?? ''}
                      className={styles.cardImage}
                      // Lazy, so a hidden step's photo isn't fetched until
                      // it's shown.
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : null}

                <div className={styles.cardCopy}>
                  <p className={styles.cardCounter}>
                    Step {i + 1} of {steps.length}
                  </p>
                  <h3 className={styles.cardTitle}>{step.title}</h3>
                  {step.body ? (
                    <p className={styles.cardBody}>{step.body}</p>
                  ) : null}
                </div>
              </div>
            ))}

            {hasPager ? (
              <div className={styles.pager}>
                {/*
                  aria-disabled rather than disabled at the ends: a disabled
                  button drops focus, so pressing Next onto the last step
                  would throw a keyboard user back to the top of the page.
                */}
                <button
                  type="button"
                  className={styles.pagerButton}
                  aria-label="Previous step"
                  aria-disabled={index === 0}
                  onClick={() => goTo(index - 1)}
                  data-track-id={trackId('previous')}
                >
                  <UiIcon name="chevron" className={styles.pagerPrev} />
                </button>
                <button
                  type="button"
                  className={styles.pagerButton}
                  aria-label="Next step"
                  aria-disabled={index === last}
                  onClick={() => goTo(index + 1)}
                  data-track-id={trackId('next')}
                >
                  <UiIcon name="chevron" className={styles.pagerNext} />
                </button>
              </div>
            ) : null}
          </div>

          {hasExtras ? (
            <div className={styles.extras}>
              {primaryCTA?.linkText ? (
                <CmsLink
                  link={primaryCTA}
                  className={`btn btn--secondary ${styles.cta}`}
                  trackRole="primary-cta"
                />
              ) : null}
              {noteHeading || noteHtml ? (
                <div className={styles.note}>
                  {noteHeading ? <p>{noteHeading}</p> : null}
                  {noteHtml ? (
                    <div
                      className="cms-note-body"
                      dangerouslySetInnerHTML={{__html: noteHtml}}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}
