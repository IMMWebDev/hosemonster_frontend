import styles from './TextHighlights.module.css';

/**
 * Text & Highlights module — Smart Monster collection hifi
 * (sprint-04/hifi_smartmonstercollection.html, "It fits what you already own").
 *
 * A two-column band: an intro lockup on the left (heading, paragraph, a
 * red-dotted list) beside a grid of short labelled notes on the right, each
 * sitting under a rule.
 *
 * Sibling of Text & Media — same left-hand lockup, proof points instead of a
 * picture. Both halves are optional: with no highlights the intro runs the full
 * width, with no bullets it is just heading and copy.
 *
 * @param {{
 *   data: {
 *     heading?: string,
 *     body?: string,
 *     bullets?: Array<{id: number, label: string}>,
 *     highlights?: Array<{id: number, label: string, body?: string}>,
 *   },
 * }} props
 */
export default function TextHighlights({data}) {
  const {heading, body, bullets = [], highlights = []} = data ?? {};

  if (!heading) return null;

  /*
   * Blank lines in the CMS become real paragraphs, the same way Text & Media
   * does it. Rendering one <p> with `white-space: pre-line` would let the type
   * scale dictate the gap between them; a margin in CSS does not.
   */
  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 className={styles.heading} data-reveal style={{'--reveal-i': 0}}>
            {heading}
          </h2>

          {paragraphs.length > 0 ? (
            <div className={styles.body} data-reveal style={{'--reveal-i': 1}}>
              {paragraphs.map((para, i) => (
                <p key={`para-${i}`}>{para}</p>
              ))}
            </div>
          ) : null}

          {bullets.length > 0 ? (
            /*
             * `role="list"` is not redundant. The red dot is drawn by a
             * pseudo-element rather than a marker, so `list-style: none` is
             * required — and that silently strips list semantics in Safari.
             * The role puts them back.
             */
            <ul
              className={styles.bullets}
              role="list"
              data-reveal
              style={{'--reveal-i': 2}}
            >
              {bullets.map((item, i) => (
                <li className={styles.bullet} key={item.id ?? i}>
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {highlights.length > 0 ? (
          <div className={styles.highlights}>
            {highlights.map((item, i) => (
              <div
                className={styles.highlight}
                key={item.id ?? i}
                data-reveal
                style={{'--reveal-i': i + 3}}
              >
                <p className={styles.highlightLabel}>{item.label}</p>
                {item.body ? (
                  <p className={styles.highlightBody}>{item.body}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
