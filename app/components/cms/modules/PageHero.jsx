import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './PageHero.module.css';

/**
 * Page Hero module — Figma "Smart Monster Collection" hifi
 * (sprint-04/hifi_smartmonstercollection.html).
 *
 * A compact hero as an inset rounded card: background photo, left-to-right
 * scrim, eyebrow and heading. No body copy and no buttons — this is a page
 * title with a photograph behind it.
 *
 * The third hero in the system, and the only inset one. Hero is the tall
 * full-bleed masthead with CTAs and a trust bar; Hero Search is the shop
 * landing page with its search pill. Kept separate rather than flagged onto
 * Hero because the container differs (inset and rounded vs bleeding past the
 * viewport edge), which is most of what a hero's stylesheet is.
 *
 * `heading` is a multi-line CMS field whose breaks are deliberate in the
 * design, so it renders with `white-space: pre-line`.
 *
 * @param {{
 *   data: {
 *     breadcrumbParent?: object,
 *     breadcrumbLabel?: string,
 *     eyebrow?: string,
 *     heading?: string,
 *     backgroundImage?: {url?: string, alternativeText?: string},
 *     infoColumns?: Array<{id: number, label: string, body?: string}>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function PageHero({data, baseUrl}) {
  if (!data?.heading) return null;

  const {
    breadcrumbParent,
    breadcrumbLabel,
    eyebrow,
    heading,
    infoColumns = [],
  } = data;
  const bgUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/*
          A real <nav> with an ordered list, not a row of divs: the crumbs are
          navigation and their order carries meaning. The separator is CSS so it
          is never read aloud, and the current page is plain text rather than a
          link to itself.
        */}
        {breadcrumbParent?.linkText || breadcrumbLabel ? (
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <ol className={styles.crumbs}>
              {breadcrumbParent?.linkText ? (
                <li>
                  <CmsLink link={breadcrumbParent} className={styles.crumbLink} />
                </li>
              ) : null}
              {breadcrumbLabel ? (
                <li>
                  <span className={styles.crumbCurrent} aria-current="page">
                    {breadcrumbLabel}
                  </span>
                </li>
              ) : null}
            </ol>
          </nav>
        ) : null}

        <div className={styles.card}>
          {bgUrl ? (
            /* Parallax on the wrapper, never on the <img> that also carries
               data-reveal — a CSS animation overrides a transition on the same
               property, so an element with both loses its reveal. */
            <div className={styles.background} data-parallax="slow">
              <img
                src={bgUrl}
                /* Decorative: the heading carries the meaning, so an empty alt
                   is correct — it stops a screen reader announcing a filename. */
                alt=""
                className={styles.backgroundImage}
                data-reveal="zoom"
                /* Above the fold on a collection page — this is the LCP
                   element, so it loads eagerly at high priority. */
                loading="eager"
                /* Lowercase is deliberate. React 18 does not recognise the
                   camelCase `fetchPriority` prop — it warns and drops the
                   attribute, so the hint never reaches the browser. */
                // eslint-disable-next-line react/no-unknown-property
                fetchpriority="high"
                decoding="async"
              />
            </div>
          ) : null}

          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.copy}>
            {eyebrow ? (
              <p
                className={styles.eyebrow}
                data-reveal
                style={{'--reveal-i': 0}}
              >
                {eyebrow}
              </p>
            ) : null}

            <h1
              className={styles.heading}
              data-reveal="focus"
              style={{'--reveal-i': 1}}
            >
              {heading}
            </h1>
          </div>
        </div>

        {infoColumns.length > 0 ? (
          <div className={styles.info} data-reveal style={{'--reveal-i': 2}}>
            {infoColumns.map((column, i) => (
              <div className={styles.infoColumn} key={column.id ?? i}>
                <p className={styles.infoLabel}>{column.label}</p>
                {column.body ? (
                  <p className={styles.infoBody}>{column.body}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
