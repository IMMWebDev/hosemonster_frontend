import {useState} from 'react';
import Breadcrumbs from '~/components/cms/Breadcrumbs';
import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia, warnMissingAlt} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './PageHero.module.css';

/**
 * Page Hero module — Figma "Smart Monster Collection" hifi
 * (sprint-04/hifi_smartmonstercollection.html).
 *
 * A compact hero as an inset rounded card: background photo, left-to-right
 * scrim, eyebrow, heading, an optional short body and up to two buttons
 * (sprint-05 hifi_hydrantflowtesting.html; the body from hifi_blog.html).
 *
 * The shorter, text-led "compact" card (.compact in the stylesheet) isn't a
 * choice here any more — no page used it. It lives on as the blog post's
 * automatic hero (blog/BlogHero.jsx), which applies the class itself.
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
 *     breadcrumbs?: {breadcrumbLabel?: string, breadcrumbLinks?: Array<object>} | null,
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     backgroundImage?: {url?: string, alternativeText?: string},
 *     badge?: {url?: string, alternativeText?: string, width?: number, height?: number} | null,
 *     infoColumns?: Array<{id: number, label: string, body?: string}>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function PageHero({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const [badgePaused, setBadgePaused] = useState(false);
  if (!data?.heading) return null;

  const {
    breadcrumbs,
    eyebrow,
    heading,
    body,
    primaryCTA,
    secondaryCTA,
    infoColumns = [],
  } = data;
  const bgUrl = strapiMedia(data.backgroundImage?.url, baseUrl);
  const badgeUrl = strapiMedia(data.badge?.url, baseUrl);
  // The seal's words are content (see its <img> below).
  if (badgeUrl) warnMissingAlt(data.badge, 'Page Hero badge');

  return (
    <section {...trackingRoot} className={styles.section}>
      <div className={styles.inner}>
        <Breadcrumbs breadcrumbs={breadcrumbs} />

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

            {body ? (
              <p className={styles.body} data-reveal style={{'--reveal-i': 2}}>
                {body}
              </p>
            ) : null}

            {primaryCTA?.linkText || secondaryCTA?.linkText ? (
              <div
                className={styles.actions}
                data-reveal
                style={{'--reveal-i': 3}}
              >
                {primaryCTA?.linkText ? (
                  <CmsLink
                    link={primaryCTA}
                    className="btn btn--primary"
                    trackRole="primary-cta"
                  />
                ) : null}
                {/* Outlined white, not .btn--secondary: that one is white with
                    navy text, which the design doesn't draw over the scrim.
                    The same call as Feature Hero. */}
                {secondaryCTA?.linkText ? (
                  <CmsLink
                    link={secondaryCTA}
                    className="btn btn--secondary-on-orange"
                    trackRole="secondary-cta"
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {badgeUrl ? (
            /*
             * The seal (sprint-05 hifi_hmuvideos.html): settles in (the
             * wrapper), then turns slowly for good (the image) — Feature
             * Hero's badge. Two elements because both animate `transform`,
             * and one animation on an element replaces another rather than
             * adding to it. Plain CSS animations, not data-reveal: the hero
             * is above the fold, so it plays on load.
             */
            <div
              className={
                badgePaused
                  ? `${styles.badge} ${styles.badgePaused}`
                  : styles.badge
              }
            >
              <div className={styles.badgeIn}>
                <img
                  src={badgeUrl}
                  /* The seal's words are content, so its alt text comes from
                     the Media Library rather than being blanked. */
                  alt={data.badge?.alternativeText ?? ''}
                  width={data.badge?.width ?? undefined}
                  height={data.badge?.height ?? undefined}
                  className={styles.badgeImage}
                  decoding="async"
                />
              </div>
            </div>
          ) : null}

          {badgeUrl ? (
            /* The spin never ends, so it gets a pause (WCAG 2.2.2) — the
               Ticker's toggle: the label stays put and aria-pressed carries
               the state. Hidden by CSS when reduced motion stills the seal. */
            <button
              type="button"
              className={styles.badgeToggle}
              aria-pressed={badgePaused}
              aria-label="Pause badge animation"
              onClick={() => setBadgePaused((p) => !p)}
              data-track-id={trackId('badge-pause-toggle')}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                {/* What a press will do: pause while it turns, play once
                    stopped. */}
                <path d={badgePaused ? 'M5.5 3.5v9l7-4.5z' : 'M6 4v8M10 4v8'} />
              </svg>
            </button>
          ) : null}
        </div>

        {infoColumns.length > 0 ? (
          /*
            The band is the bottom of the card, so it doesn't animate on its
            own: it's there with the card, and only its copy reveals —
            continuing the eyebrow → heading stagger, a column at a time left
            to right. The text, not the column, carries data-reveal so the
            divider rules stay put with the band.
          */
          <div className={styles.info}>
            {infoColumns.map((column, i) => (
              <div className={styles.infoColumn} key={column.id ?? i}>
                <p
                  className={styles.infoLabel}
                  data-reveal
                  style={{'--reveal-i': i + 3}}
                >
                  {column.label}
                </p>
                {column.body ? (
                  <p
                    className={styles.infoBody}
                    data-reveal
                    style={{'--reveal-i': i + 3}}
                  >
                    {column.body}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
