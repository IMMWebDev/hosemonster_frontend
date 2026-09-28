import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './ReferenceGuide.module.css';

/**
 * Reference Guide module — sprint-04 hifi_accessoriescollection.html,
 * "Know your thread".
 *
 * A heading over a row of titled reference columns (NH / NST, STORZ, local
 * thread), each under a top rule, then an optional diagram and an optional
 * full-width button.
 *
 * Not Numbered Steps: these are things to tell apart, not a sequence, so
 * there are no numerals and the columns are an unordered list.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     background?: 'white' | 'grey',
 *     columns?: Array<{id: number, title: string, description?: string}>,
 *     image?: {url?: string, alternativeText?: string, width?: number, height?: number},
 *     cta?: object,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function ReferenceGuide({data, baseUrl}) {
  const {eyebrow, heading, body, background, columns = [], image, cta} =
    data ?? {};

  if (!heading) return null;

  // Only "white" opts out: the design draws this band grey, and an entry made
  // before the field existed would come back null.
  const backgroundClass = background === 'white' ? '' : styles.grey;

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const imageUrl = strapiMedia(image?.url, baseUrl);

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

        {columns.length > 0 ? (
          <ul className={styles.columns}>
            {columns.map((column, i) => (
              <li
                className={styles.column}
                key={column.id ?? i}
                data-reveal
                style={{'--reveal-i': i + 2}}
              >
                <h3 className={styles.columnTitle}>{column.title}</h3>
                {column.description ? (
                  <p className={styles.columnBody}>{column.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {imageUrl ? (
          /* At the upload's own proportions — a diagram must never be cropped.
             width/height reserve its space before it loads. */
          <figure className={styles.figure} data-reveal="fade">
            <img
              src={imageUrl}
              alt={image?.alternativeText ?? ''}
              width={image?.width ?? undefined}
              height={image?.height ?? undefined}
              className={styles.image}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ) : null}

        {cta?.linkText ? (
          <CmsLink
            link={cta}
            className={`btn btn--primary ${styles.cta}`}
            dataReveal
          />
        ) : null}
      </div>
    </section>
  );
}
