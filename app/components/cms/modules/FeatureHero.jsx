import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './FeatureHero.module.css';

/**
 * Feature Hero module — sprint-04 hifi_fireflow.html and hifi_smartmonsterfeature.html.
 *
 * The masthead for a feature or product landing page: a full-bleed photo under a
 * hard left-to-right navy scrim, with an eyebrow, heading, optional body copy, an
 * optional meta bar and up to two CTAs.
 *
 * Close kin to Home Hero, and deliberately not the same module. Home Hero is the
 * homepage's own masthead and will keep drifting to suit it; this one is shared
 * by every feature page, so the two need to be able to move independently. What
 * actually differs today: a much harder scrim (the copy column runs to 820px
 * rather than 640px, so it needs cover well past halfway), a `size` enum instead
 * of one fixed height, and a meta bar ruled off with pipes rather than a row of
 * middots.
 *
 * Both comps use the same anatomy with different optional parts — Fire Flow has
 * the meta bar and no body, the Smart Monster feature page has a body and no
 * meta bar.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     trustItems?: Array<{id: number, label: string}>,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     backgroundImage?: {url?: string, alternativeText?: string},
 *     size?: 'standard' | 'tall',
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function FeatureHero({data, baseUrl}) {
  if (!data?.heading) return null;

  const {
    eyebrow,
    heading,
    body,
    trustItems = [],
    primaryCTA,
    secondaryCTA,
    size,
  } = data;

  const bgUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  /*
   * Only "tall" gets a class. Strapi applies an enum default on CREATE only, so
   * an entry authored before this field existed comes back null rather than
   * "standard" — treating anything that is not "tall" as standard covers both.
   */
  const sizeClass = size === 'tall' ? styles.tall : '';

  return (
    <section className={`${styles.hero} ${sizeClass}`.trim()}>
      {bgUrl ? (
        <div className={styles.background} data-parallax>
          <img
            src={bgUrl}
            /* Decorative: the heading carries all the meaning, so an empty alt
               keeps a screen reader from announcing a filename. */
            alt=""
            className={styles.backgroundImage}
            data-reveal="zoom"
            /* This is the LCP element — loaded eagerly and flagged, never lazy. */
            loading="eager"
            /* Lowercase is deliberate: React 18 does not recognise the
               camelCase prop and drops the attribute entirely. Revisit on 19. */
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
            <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
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

          {trustItems.length > 0 ? (
            /*
             * `role="list"` is not redundant — `list-style: none` below silently
             * strips list semantics in Safari. The pipe separators are drawn by
             * CSS so they are never read aloud.
             */
            <ul
              className={styles.trust}
              role="list"
              data-reveal
              style={{'--reveal-i': 3}}
            >
              {trustItems.map((item, i) => (
                <li className={styles.trustItem} key={item.id ?? i}>
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}

          {primaryCTA?.linkText || secondaryCTA?.linkText ? (
            <div className={styles.actions} data-reveal style={{'--reveal-i': 4}}>
              {primaryCTA?.linkText ? (
                <CmsLink link={primaryCTA} className="btn btn--primary" />
              ) : null}
              {/*
                The outlined-white fill, not .btn--secondary. Secondary is navy
                on white and would disappear into the scrim; this is the
                styleguide's "secondary on orange" geometry reused for any
                saturated dark ground.
              */}
              {secondaryCTA?.linkText ? (
                <CmsLink
                  link={secondaryCTA}
                  className="btn btn--secondary-on-orange"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
