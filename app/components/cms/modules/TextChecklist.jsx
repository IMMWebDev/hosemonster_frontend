import CmsLink from '~/components/cms/CmsLink';
import styles from './TextChecklist.module.css';

/**
 * Text & Checklist module — sprint-04 hifi_accessoriescollection.html,
 * "Gauge calibration you can put in the file".
 *
 * A two-column band: eyebrow, heading and paragraphs on the left; a ticked
 * checklist and up to two buttons on the right. Sibling of Text & Highlights
 * (notes on the right) and Text & Media (a picture on the right).
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     checklist?: Array<{id: number, label: string}>,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     background?: 'white' | 'grey',
 *   },
 * }} props
 */
export default function TextChecklist({data}) {
  const {
    eyebrow,
    heading,
    body,
    checklist = [],
    primaryCTA,
    secondaryCTA,
    background,
  } = data ?? {};

  if (!heading) return null;

  // Only "grey" gets a class; an entry made before the field existed comes
  // back null, which is white.
  const backgroundClass = background === 'grey' ? styles.grey : '';

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const items = checklist.filter((item) => item?.label);
  const hasButtons = Boolean(primaryCTA?.linkText || secondaryCTA?.linkText);
  const hasAside = items.length > 0 || hasButtons;

  return (
    <section className={`${styles.section} ${backgroundClass}`.trim()}>
      <div className={styles.inner}>
        <div className={styles.copy}>
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
        </div>

        {hasAside ? (
          <div className={styles.aside}>
            {items.length > 0 ? (
              <ul className={styles.checklist}>
                {items.map((item, i) => (
                  <li
                    className={styles.item}
                    key={item.id ?? i}
                    data-reveal
                    style={{'--reveal-i': i + 1}}
                  >
                    <CheckIcon />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {hasButtons ? (
              <div
                className={styles.actions}
                data-reveal
                style={{'--reveal-i': items.length + 1}}
              >
                {primaryCTA?.linkText ? (
                  <CmsLink link={primaryCTA} className="btn btn--primary" />
                ) : null}
                {secondaryCTA?.linkText ? (
                  <CmsLink link={secondaryCTA} className="btn btn--secondary" />
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
 * character would come from whatever fallback font the device has and change
 * shape from one machine to the next.
 */
function CheckIcon() {
  return (
    <svg
      className={styles.check}
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
