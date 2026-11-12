import CmsLink from '~/components/cms/CmsLink';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './CalculatorPreview.module.css';

/**
 * Calculator Preview module — sprint-05 hifi_firepumptesting.html, "Size the
 * hose for your lines".
 *
 * A text lockup (eyebrow, heading, body, one button) beside a static card that
 * previews a calculator: a caption, sample inputs as bordered tiles, and the
 * answer they produce in a navy bar. Nothing on the card is interactive — it
 * shows what the tool does; the button opens the real one.
 *
 * The inputs reuse utilities.spec-row (label + value), the same pair Spec
 * Sheet uses. Tiles and answer bar are each a <dl>, so a screen reader hears
 * every label with its value; a tile is a <div> around its <dt>/<dd>, the one
 * wrapper HTML allows directly inside a description list.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     primaryCTA?: object,
 *     previewLabel?: string,
 *     inputs?: Array<{id?: number, label?: string, value?: string}>,
 *     resultLabel?: string,
 *     resultValue?: string,
 *     background?: 'white' | 'grey' | null,
 *   },
 * }} props
 */
export default function CalculatorPreview({data}) {
  const trackingRoot = useTrackingRoot();
  const {
    eyebrow,
    heading,
    body,
    primaryCTA,
    previewLabel,
    inputs = [],
    resultLabel,
    resultValue,
    background,
  } = data ?? {};

  if (!heading) return null;

  // Blank lines in the CMS start a new paragraph, as in Text & Media.
  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const tiles = inputs.filter((item) => item?.label || item?.value);
  const hasResult = Boolean(resultLabel || resultValue);
  const hasCard = Boolean(previewLabel || tiles.length > 0 || hasResult);

  // Only "grey" gets a class. The enum default applies on CREATE only, so an
  // unset value comes back null — treated as white, the default.
  const backgroundClass = background === 'grey' ? styles.grey : '';

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
      <div
        className={hasCard ? styles.inner : `${styles.inner} ${styles.solo}`}
      >
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

          {primaryCTA?.linkText ? (
            <div
              className={styles.actions}
              data-reveal
              style={{'--reveal-i': 3}}
            >
              <CmsLink
                link={primaryCTA}
                className="btn btn--primary"
                trackRole="primary-cta"
              />
            </div>
          ) : null}
        </div>

        {hasCard ? (
          <div className={styles.card} data-reveal="right">
            {previewLabel ? (
              <p className={styles.previewLabel}>{previewLabel}</p>
            ) : null}

            {tiles.length > 0 ? (
              <dl className={styles.tiles}>
                {tiles.map((item, i) => (
                  <div className={styles.tile} key={item.id ?? i}>
                    <dt className={styles.tileLabel}>{item.label}</dt>
                    <dd className={styles.tileValue}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {hasResult ? (
              <dl className={styles.result}>
                <dt className={styles.resultLabel}>{resultLabel}</dt>
                <dd className={styles.resultValue}>{resultValue}</dd>
              </dl>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
