import {useId} from 'react';
import CmsLink from '~/components/cms/CmsLink';
import UiIcon from '~/components/icons/UiIcon';
import {noteBodyHtml} from '~/lib/cms-note';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './TextTable.module.css';

/**
 * Text & Table module — sprint-05 hifi_useshub.html, "What NFPA 25 requires".
 *
 * A heading with an optional link opposite it, two columns of intro copy (Left
 * Body and Right Body, side by side),
 * an always-open table, then an optional callout note with an orange edge.
 * Page-agnostic.
 *
 * The table rows reuse utilities.comparison-row, as Stats & Comparison does:
 * `feature` is the row name (first column), `planValues` fill the remaining
 * columns by position. `firstColumnHeading` heads the row names; `columns` are
 * the other headers.
 *
 * Phones get one card per row instead of a squeezed grid. The markup stays a
 * real <table> with explicit ARIA roles, because changing a table's `display`
 * in CSS (which the phone layout does) makes some browsers drop its table
 * semantics — the roles keep a screen reader announcing it as a table.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     headerLink?: object,
 *     leftBody?: string,
 *     rightBody?: string,
 *     firstColumnHeading?: string,
 *     columns?: Array<{id: number, label: string}>,
 *     rows?: Array<{id: number, feature: string, planValues?: Array<{label: string}>}>,
 *     note?: {heading?: string, body?: string} | null,
 *     background?: 'white' | 'grey' | null,
 *   },
 * }} props
 */
export default function TextTable({data}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  // Names the table after the section's heading, so a screen reader listing
  // tables hears "What NFPA 25 requires", not just "table".
  const headingId = useId();
  const {
    eyebrow,
    heading,
    headerLink,
    leftBody,
    rightBody,
    firstColumnHeading,
    columns = [],
    rows = [],
    note,
    background,
  } = data ?? {};

  if (!heading) return null;

  // Strapi applies the "grey" default on CREATE only; null is grey too.
  const backgroundClass = background === 'white' ? '' : styles.grey;

  // One column per filled field, left then right. A blank line inside either
  // starts a new paragraph in that column; one field alone runs full width.
  const bodyColumns = [leftBody, rightBody]
    .map(toParagraphs)
    .filter((column) => column.length > 0);

  const tableColumns = columns.filter((col) => col?.label);
  const tableRows = rows.filter((row) => row?.feature);
  // The shared utilities.note component: Heading on its own line, then the
  // Body, whose links sit inside its sentences. See lib/cms-note.js.
  const noteHeading = note?.heading?.trim();
  const noteHtml = noteBodyHtml(note?.body, {trackId});
  const hasNote = Boolean(noteHeading || noteHtml);

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
      <div className={styles.inner}>
        <div className={styles.head} data-reveal style={{'--reveal-i': 0}}>
          <div className={styles.headCopy}>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h2 id={headingId} className={styles.heading}>
              {heading}
            </h2>
          </div>
          {headerLink?.linkText ? (
            <CmsLink
              link={headerLink}
              className={styles.headerLink}
              trackRole="header-link"
            >
              {headerLink.linkText}
              <UiIcon name="chevron" className={styles.headerLinkIcon} />
            </CmsLink>
          ) : null}
        </div>

        {bodyColumns.length > 0 ? (
          <div className={styles.body} data-reveal style={{'--reveal-i': 1}}>
            {bodyColumns.map((column, c) => (
              // Left, then right; their order is their identity.
              // eslint-disable-next-line react/no-array-index-key
              <div className={styles.bodyColumn} key={c}>
                {column.map((p, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <p key={i}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {/*
          The roles below restate the elements' own on purpose (see the comment
          at the top): the phone layout sets `display: block`, which strips
          implicit table roles in some browsers. The linter can't know that.
        */}
        {/* eslint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */}
        {tableRows.length > 0 ? (
          <div className={styles.tableWrap} data-reveal style={{'--reveal-i': 2}}>
            <table
              className={styles.table}
              role="table"
              aria-labelledby={headingId}
            >
              <thead role="rowgroup">
                <tr role="row">
                  {/* An empty corner is a plain cell, not a header with no name. */}
                  {firstColumnHeading ? (
                    <th scope="col" role="columnheader">
                      {firstColumnHeading}
                    </th>
                  ) : (
                    <td role="cell" />
                  )}
                  {tableColumns.map((col, i) => (
                    <th scope="col" role="columnheader" key={col.id ?? i}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody role="rowgroup">
                {tableRows.map((row, i) => (
                  <tr role="row" key={row.id ?? i}>
                    <th scope="row" role="rowheader">
                      {row.feature}
                    </th>
                    {/* Indexed off the COLUMNS, so a row with too few values
                        shows an em dash in the gap instead of sliding left.
                        data-label is the phone layout's per-value caption. */}
                    {tableColumns.map((col, c) => (
                      <td role="cell" key={col.id ?? c} data-label={col.label}>
                        {row.planValues?.[c]?.label || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {/* eslint-enable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */}

        {hasNote ? (
          <div className={styles.note} data-reveal style={{'--reveal-i': 3}}>
            {noteHeading ? (
              <p className={styles.noteHeading}>{noteHeading}</p>
            ) : null}
            {noteHtml ? (
              <div
                className={`${styles.noteBody} cms-note-body`}
                dangerouslySetInnerHTML={{__html: noteHtml}}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * @param {string | null | undefined} text
 * @returns {string[]} its paragraphs, split on blank lines
 */
function toParagraphs(text) {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
