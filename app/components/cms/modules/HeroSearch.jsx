import SearchBox from '~/components/search/SearchBox';
import {SEARCH_PLACEHOLDER} from '~/lib/search';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './HeroSearch.module.css';

/**
 * Hero Search module — Figma "Shop" hifi (sprint-04/hifi_shop.html).
 *
 * The shop landing hero: background image with a navy scrim, then eyebrow /
 * heading / body / a product search bar. No CTA buttons — the search IS the
 * call to action, which is why this is its own module rather than a flag on
 * `module.hero`.
 *
 * Unlike the homepage hero this one does NOT bleed into the header: the design
 * insets the navy panel 32px below it and 44px above whatever follows, so the
 * panel is a band on the page rather than a continuation of the masthead.
 *
 * `heading` and `body` are multi-line CMS text fields whose line breaks are
 * deliberate in the design, so both render with `white-space: pre-line`.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     backgroundImage?: {url?: string, alternativeText?: string},
 *     searchPlaceholder?: string,
 *     searchButtonLabel?: string,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function HeroSearch({data, baseUrl}) {
  if (!data?.heading) return null;

  const {eyebrow, heading, body, searchPlaceholder, searchButtonLabel} = data;

  const bgUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  /*
   * Strapi applies a field default only when an entry is CREATED, so a Hero
   * Search authored before these fields existed comes back with both as null.
   * Fall back rather than rendering an unlabelled input and a blank button.
   */
  const placeholder = searchPlaceholder || SEARCH_PLACEHOLDER;
  const buttonLabel = searchButtonLabel || 'Go';

  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        {bgUrl ? (
          /*
           * Parallax sits on the WRAPPER, never on the <img> that also carries
           * data-reveal. A CSS animation overrides a transition on the same
           * property, so putting both on one element silently kills the reveal.
           */
          <div className={styles.background} data-parallax>
            <img
              src={bgUrl}
              /* Decorative: the heading carries all the meaning, so an empty
                 alt is correct here — it keeps screen readers from announcing a
                 filename. Do not "fix" this to a description. */
              alt=""
              className={styles.backgroundImage}
              data-reveal="zoom"
              /* Largest above-the-fold paint on the shop page — this is the LCP
                 element, so it loads eagerly at high priority. */
              loading="eager"
              /* Lowercase is deliberate. React 18 does not recognise the
                 camelCase `fetchPriority` prop — it warns and drops the
                 attribute entirely, so the hint never reaches the browser. */
              // eslint-disable-next-line react/no-unknown-property
              fetchpriority="high"
              decoding="async"
            />
          </div>
        ) : null}
        <div className={styles.scrim} aria-hidden="true" />

        <div className={styles.inner}>
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

            {body ? (
              <p className={styles.body} data-reveal style={{'--reveal-i': 2}}>
                {body}
              </p>
            ) : null}

            {/*
              The shared page search box: the same type-ahead as the header's
              quick search — a dropdown under the box on desktop and tablet,
              the full-screen sheet on a phone — and a plain GET form to
              /search before hydration. The wrapper carries the reveal so the
              box keeps its place in the entrance sequence.
            */}
            <div
              className={styles.searchWrap}
              data-reveal
              style={{'--reveal-i': 3}}
            >
              <SearchBox
                placeholder={placeholder}
                buttonLabel={buttonLabel}
                label={placeholder}
                classNames={{
                  form: styles.search,
                  input: styles.searchInput,
                  button: styles.searchButton,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
