import CmsLink from '~/components/cms/CmsLink';
import styles from './Pricing.module.css';

/**
 * Pricing module — sprint-04 hifi_fireflow.html, "Pricing".
 *
 * An intro lockup, a row of plan cards, and a comparison table folded away
 * behind a toggle.
 *
 * The toggle is a native <details>, the same choice the FAQ makes: it works
 * before hydration and without JS, and brings its own keyboard handling. A
 * pricing table that needs JavaScript to open is a pricing table some people
 * cannot read.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     background?: 'white' | 'grey',
 *     plans?: Array<{
 *       id: number,
 *       label: string,
 *       prices?: Array<{id: number, value: string, unit?: string}>,
 *       features?: Array<{id: number, label: string}>,
 *       cta?: object,
 *     }>,
 *     comparisonHeading?: string,
 *     comparisonToggleLabel?: string,
 *     comparisonToggleCloseLabel?: string,
 *     comparisonRows?: Array<{
 *       id: number,
 *       feature: string,
 *       planValues?: Array<{id: number, label: string}>,
 *     }>,
 *   },
 * }} props
 */
export default function Pricing({data}) {
  const {
    eyebrow,
    heading,
    body,
    background,
    plans = [],
    comparisonHeading,
    comparisonToggleLabel,
    comparisonToggleCloseLabel,
    comparisonRows = [],
  } = data ?? {};

  if (!heading) return null;

  const backgroundClass = background === 'grey' ? styles.grey : '';

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const showComparison = plans.length > 0 && comparisonRows.length > 0;

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

        {plans.length > 0 ? (
          <div className={styles.plans}>
            {plans.map((plan, i) => (
              <Plan key={plan.id ?? i} plan={plan} index={i} />
            ))}
          </div>
        ) : null}

        {showComparison ? (
          <Comparison
            plans={plans}
            rows={comparisonRows}
            heading={comparisonHeading}
            openLabel={comparisonToggleLabel}
            closeLabel={comparisonToggleCloseLabel}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * @param {{plan: object, index?: number}} props
 */
function Plan({plan, index = 0}) {
  const {label, prices = [], features = [], cta} = plan;

  /*
   * One price with no unit is a headline ("7-day trial", "$549/year") and the
   * design sets it large; several with units are a rate card and stack small.
   * Deciding it here rather than in CSS because it depends on the unit being
   * absent as well as the count — `:only-child` alone would enlarge a lone
   * "$59 / fire pump report" too.
   */
  const isHeadline = prices.length === 1 && !prices[0].unit;

  return (
    <div className={styles.plan} data-reveal style={{'--reveal-i': index + 3}}>
      <p className={styles.planLabel}>{label}</p>

      {prices.length > 0 ? (
        <div className={isHeadline ? styles.headlinePrice : styles.prices}>
          {prices.map((price, i) => (
            <p className={styles.price} key={price.id ?? i}>
              <span className={styles.priceValue}>{price.value}</span>
              {price.unit ? (
                <span className={styles.priceUnit}>{price.unit}</span>
              ) : null}
            </p>
          ))}
        </div>
      ) : null}

      {features.length > 0 ? (
        /*
         * `role="list"` because `list-style: none` strips list semantics in
         * Safari, and the bullet is a pseudo-element so the marker cannot do
         * the job. Same pattern as Text & Highlights.
         */
        <ul className={styles.features} role="list">
          {features.map((feature, i) => (
            <li className={styles.feature} key={feature.id ?? i}>
              {feature.label}
            </li>
          ))}
        </ul>
      ) : null}

      {cta?.linkText ? (
        <CmsLink
          link={cta}
          className={`btn btn--secondary ${styles.planCta}`}
        />
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   plans: Array<object>,
 *   rows: Array<object>,
 *   heading?: string,
 *   openLabel?: string,
 *   closeLabel?: string,
 * }} props
 */
function Comparison({plans, rows, heading, openLabel, closeLabel}) {
  /*
   * A real <table>. The comp builds it from divs, but this is a feature matrix:
   * a screen reader user needs "Unlimited, Revisions to work orders, infinity"
   * rather than a wall of loose ✓s, and only a table with proper headers gives
   * them that. `scope` on both axes is what makes the announcement work.
   */
  return (
    <details className={styles.comparison}>
      <summary className={styles.comparisonToggle}>
        {/*
          Defaults, not hardcoded copy: Strapi applies a field default on CREATE
          only, so an entry made before these fields existed returns null and
          would otherwise render an empty button.
        */}
        <span className={styles.comparisonToggleOpen}>
          {openLabel || 'View details'}
        </span>
        <span className={styles.comparisonToggleClose}>
          {closeLabel || 'View less'}
        </span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{heading || 'Compare plans'}</th>
              {plans.map((plan, i) => (
                <th scope="col" key={plan.id ?? i}>
                  {plan.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i}>
                <th scope="row">{row.feature}</th>
                {/*
                  Indexed off the PLANS, not the row's own values. A row with
                  too few values then leaves an em dash in the gap instead of
                  shifting every cell after it left — a miscount shows up as a
                  blank cell rather than a silently wrong column.
                */}
                {plans.map((plan, col) => (
                  <td key={plan.id ?? col}>
                    {row.planValues?.[col]?.label || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
