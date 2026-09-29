import CmsLink from '~/components/cms/CmsLink';
import styles from './NumberedSteps.module.css';

/**
 * Numbered Steps module — sprint-04 hifi_fireflow.html, "How it works".
 *
 * An intro lockup over a row of numbered steps divided by rules, with a big
 * ghosted numeral above each, and an optional closing CTA bar under them
 * (sprint-04 hifi_dechlorinationcollection.html, "Still deciding?").
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
 *     steps?: Array<{id: number, title: string, description?: string}>,
 *     ctaHeading?: string,
 *     ctaBody?: string,
 *     cta?: object,
 *   },
 * }} props
 */
export default function NumberedSteps({data}) {
  const {
    eyebrow,
    heading,
    body,
    background,
    steps = [],
    ctaHeading,
    ctaBody,
    cta,
  } = data ?? {};

  if (!heading) return null;

  /*
   * Only "grey" gets a class, same as Text & Media, Link Cards and FAQ. Strapi
   * applies an enum default on CREATE only, so an entry authored before this
   * field existed comes back null rather than "white".
   */
  const backgroundClass = background === 'grey' ? styles.grey : '';

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  /* The closing bar is optional: a heading or a button brings it in. Body
   * copy on its own isn't enough to hang a bar off. */
  const hasButton = Boolean(cta?.linkText);
  const hasCta = Boolean(ctaHeading || hasButton);

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
           */
          <ol className={styles.steps}>
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
              </li>
            ))}
          </ol>
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
              <CmsLink link={cta} className="btn btn--inverse-navy" />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
