import CmsLink from '~/components/cms/CmsLink';
import {noteBodyHtml} from '~/lib/cms-note';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './NumberedSteps.module.css';

/**
 * Numbered Steps module — sprint-04 hifi_fireflow.html, "How it works".
 *
 * An intro lockup over a row of numbered steps divided by rules, with a big
 * ghosted numeral above each, and an optional closing CTA bar under them
 * (sprint-04 hifi_dechlorinationcollection.html, "Still deciding?").
 *
 * `style: "cards"` is sprint-05 hifi_dechlorinationflushing.html, "Choosing an
 * agent": each step in its own white bordered card under a solid orange
 * numeral, its `tags` as pills at the foot, and `notes` — shared Note
 * callouts — two across under the cards. Notes show in either style.
 *
 * The numerals are NOT a content field. They come from the row order, so
 * inserting or reordering a step renumbers the rest and an editor cannot ship
 * 01, 02, 04. They are decorative — see the note on the markup below.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     background?: 'white' | 'grey',
 *     style?: 'columns' | 'cards' | null,
 *     steps?: Array<{
 *       id: number,
 *       title: string,
 *       description?: string,
 *       tags?: Array<{id?: number, label?: string}>,
 *     }>,
 *     notes?: Array<{id?: number, heading?: string, body?: string}>,
 *     ctaHeading?: string,
 *     ctaBody?: string,
 *     primaryCTA?: object,
 *   },
 * }} props
 */
export default function NumberedSteps({data}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const {
    eyebrow,
    heading,
    body,
    background,
    style,
    steps = [],
    notes = [],
    ctaHeading,
    ctaBody,
    primaryCTA,
  } = data ?? {};

  if (!heading) return null;

  /*
   * Only "grey" gets a class, same as Text & Media, Link Cards and FAQ. Strapi
   * applies an enum default on CREATE only, so an entry authored before this
   * field existed comes back null rather than "white".
   */
  const backgroundClass = background === 'grey' ? styles.grey : '';

  // Null (an entry made before the field existed) is "columns", the original
  // look, so existing pages are unchanged.
  const isCards = style === 'cards';

  /*
   * Each note's links get their own track IDs — note-1-link-1, note-2-link-1 —
   * so two notes with a link each don't both report as note-link-1.
   */
  const noteList = notes
    .map((note, i) => ({
      key: note?.id ?? i,
      heading: note?.heading?.trim(),
      html: noteBodyHtml(note?.body, {
        trackId: (role) => trackId(role.replace(/^note-/, `note-${i + 1}-`)),
      }),
    }))
    .filter((note) => note.heading || note.html);

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  /* The closing bar is optional: a heading or a button brings it in. Body
   * copy on its own isn't enough to hang a bar off. */
  const hasButton = Boolean(primaryCTA?.linkText);
  const hasCta = Boolean(ctaHeading || hasButton);

  return (
    <section
      {...trackingRoot}
      className={[styles.section, backgroundClass, isCards ? styles.cards : '']
        .filter(Boolean)
        .join(' ')}
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

        {paragraphs.length > 0 ? (
          <div className={styles.body} data-reveal style={{'--reveal-i': 2}}>
            {paragraphs.map((para, i) => (
              <p key={`para-${i}`}>{para}</p>
            ))}
          </div>
        ) : null}

        {steps.length > 0 ? (
          /*
           * An ordered list, because the order is the meaning — these are steps
           * one through three, not three equal cards. A screen reader announces
           * "list of 3 items, item 1" from the <ol> itself, which is why the
           * drawn numeral below is hidden from it rather than read twice.
           * `role="list"` because `list-style: none` strips list semantics in
           * Safari, which would lose the count and the numbers with it.
           */
          <ol className={styles.steps} role="list">
            {steps.map((step, i) => (
              <li
                className={styles.step}
                key={step.id ?? i}
                data-reveal
                style={{'--reveal-i': i + 3}}
              >
                <span className={styles.number} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                {step.description ? (
                  <p className={styles.stepBody}>{step.description}</p>
                ) : null}
                {isCards ? <StepTags tags={step.tags} /> : null}
              </li>
            ))}
          </ol>
        ) : null}

        {noteList.length > 0 ? (
          <div className={styles.notes}>
            {noteList.map((note) => (
              <div className={styles.note} key={note.key} data-reveal>
                {note.heading ? (
                  <h3 className={styles.noteHeading}>{note.heading}</h3>
                ) : null}
                {note.html ? (
                  <div
                    className={`${styles.noteBody} cms-note-body`}
                    dangerouslySetInnerHTML={{__html: note.html}}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {hasCta ? (
          <div
            className={styles.cta}
            data-reveal
            style={{'--reveal-i': steps.length + 3}}
          >
            {ctaHeading || ctaBody ? (
              <div className={styles.ctaCopy}>
                {/* An <h3>: it closes out this section rather than starting a
                    new one, so it sits under the section's <h2>. */}
                {ctaHeading ? (
                  <h3 className={styles.ctaHeading}>{ctaHeading}</h3>
                ) : null}
                {ctaBody ? <p className={styles.ctaBody}>{ctaBody}</p> : null}
              </div>
            ) : null}

            {hasButton ? (
              <CmsLink
                link={primaryCTA}
                className="btn btn--inverse-navy"
                trackRole="primary-cta"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * A step's tags as outlined pills — the products or terms it covers
 * ("Vita-D-Chlor", "Enviro-C"). A list, since they are a set of labels.
 *
 * @param {{tags?: Array<{id?: number, label?: string}>}} props
 */
function StepTags({tags = []}) {
  const labels = (tags ?? []).filter((tag) => tag?.label?.trim());
  if (labels.length === 0) return null;
  return (
    // role="list": list-style: none strips list semantics in Safari.
    <ul className={styles.tags} role="list">
      {labels.map((tag, i) => (
        <li className={styles.tag} key={tag.id ?? i}>
          {tag.label}
        </li>
      ))}
    </ul>
  );
}
