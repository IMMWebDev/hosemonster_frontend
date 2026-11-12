import {useId} from 'react';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import {useDetailsAnimation} from '~/lib/use-details-animation';
import styles from './StatsComparison.module.css';

/**
 * Stats & Comparison module — sprint-04 hifi_smartmonsterfeature.html,
 * "Business case".
 *
 * An eyebrow and heading over a row of big orange stats, then an optional
 * before/after table behind a "View details" toggle. The toggle is a native
 * <details>, as in Pricing — it works before hydration and without JS — with
 * the FAQ's height animation layered on top.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     background?: 'white' | 'grey',
 *     stats?: Array<{id: number, value: string, label?: string, description?: string}>,
 *     comparisonHeading?: string,
 *     comparisonColumns?: Array<{id: number, label: string}>,
 *     comparisonRows?: Array<{
 *       id: number,
 *       feature: string,
 *       planValues?: Array<{id: number, label: string}>,
 *     }>,
 *     comparisonToggleLabel?: string,
 *     comparisonToggleCloseLabel?: string,
 *   },
 * }} props
 */
export default function StatsComparison({data}) {
  const trackingRoot = useTrackingRoot();
  // Names the comparison table after the section, so a screen reader listing
  // tables hears more than "table".
  const headingId = useId();
  const {
    eyebrow,
    heading,
    background,
    comparisonHeading,
    comparisonToggleLabel,
    comparisonToggleCloseLabel,
  } = data ?? {};

  if (!heading) return null;

  const stats = (data.stats ?? []).filter((stat) => stat?.value);
  const columns = (data.comparisonColumns ?? []).filter((col) => col?.label);
  const rows = (data.comparisonRows ?? []).filter((row) => row?.feature);

  /*
   * Grey is the design's ground and the field's default, but Strapi applies a
   * default on CREATE only — so only an explicit "white" goes white.
   */
  const backgroundClass = background === 'white' ? '' : styles.grey;

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}
        <h2
          id={headingId}
          className={styles.heading}
          data-reveal
          style={{'--reveal-i': 1}}
        >
          {heading}
        </h2>

        {stats.length > 0 ? (
          <ul className={styles.stats} role="list">
            {stats.map((stat, i) => (
              <li
                className={styles.stat}
                key={stat.id ?? i}
                data-reveal
                style={{'--reveal-i': i + 2}}
              >
                <p className={styles.value}>{stat.value}</p>
                {stat.label ? <p className={styles.label}>{stat.label}</p> : null}
                {stat.description ? (
                  <p className={styles.description}>{stat.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {columns.length > 0 && rows.length > 0 ? (
          <Comparison
            heading={comparisonHeading}
            sectionHeading={heading}
            labelledBy={headingId}
            columns={columns}
            rows={rows}
            openLabel={comparisonToggleLabel}
            closeLabel={comparisonToggleCloseLabel}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * @param {{
 *   heading?: string,
 *   sectionHeading: string,
 *   labelledBy?: string,
 *   columns: Array<{id: number, label: string}>,
 *   rows: Array<{id: number, feature: string, planValues?: Array<{label: string}>}>,
 *   openLabel?: string,
 *   closeLabel?: string,
 * }} props
 */
function Comparison({
  heading,
  sectionHeading,
  labelledBy,
  columns,
  rows,
  openLabel,
  closeLabel,
}) {
  const {detailsRef, panelRef, onSummaryClick} = useDetailsAnimation();
  const trackId = useTrackId();

  /*
   * A real <table>, as in Pricing: a screen reader then hears "Water, Before
   * (analog), 25–50K gal" instead of a run of loose figures.
   */
  return (
    <details className={styles.comparison} ref={detailsRef}>
      <summary
        className={styles.toggle}
        onClick={onSummaryClick}
        data-track-id={trackId('details-toggle')}
      >
        {/* Fallbacks as well as Strapi defaults: a default applies on CREATE
            only, so an older entry could come back null. */}
        <span className={styles.toggleOpen}>{openLabel || 'View details'}</span>
        <span className={styles.toggleClose}>{closeLabel || 'Hide details'}</span>
        <svg
          className={styles.caret}
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      {/* The panel is what animates; the gap above the table lives on the
          child so it collapses with it. */}
      <div className={styles.panel} ref={panelRef}>
        {/*
          Focusable, so a keyboard user can scroll the table sideways if it
          ever overflows (WCAG 2.1.1) — nothing inside it takes focus. The lint
          rule has no exception for scroll containers, hence the override, as
          in Pricing and Testimonials.
        */}
        <div
          className={styles.tableWrap}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          role="region"
          aria-label={heading || sectionHeading}
        >
          <table className={styles.table} aria-labelledby={labelledBy}>
            <thead>
              <tr>
                {/* An empty corner is a plain cell, not a header with no name. */}
                {heading ? <th scope="col">{heading}</th> : <td />}
                {columns.map((col, i) => (
                  <th scope="col" key={col.id ?? i}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id ?? i}>
                  <th scope="row">{row.feature}</th>
                  {/* Indexed off the COLUMNS, so a row with too few values
                      shows an em dash in the gap instead of sliding left. */}
                  {columns.map((col, c) => (
                    <td key={col.id ?? c}>{row.planValues?.[c]?.label || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
