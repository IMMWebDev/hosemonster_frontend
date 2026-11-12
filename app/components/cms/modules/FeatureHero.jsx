import {useState} from 'react';
import Breadcrumbs from '~/components/cms/Breadcrumbs';
import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia, warnMissingAlt} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import pageHero from './PageHero.module.css';
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
 * An optional breadcrumb trail sits above the photo (sprint-05
 * hifi_hmuhub.html) — Page Hero's trail exactly, its markup and its classes,
 * so every hero's breadcrumbs read the same.
 *
 * @param {{
 *   data: {
 *     breadcrumbs?: {breadcrumbLabel?: string, breadcrumbLinks?: Array<object>} | null,
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     trustItems?: Array<{id: number, label: string}>,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     backgroundImage?: {url?: string, alternativeText?: string},
 *     size?: 'standard' | 'tall',
 *     infoColumns?: Array<{id: number, label: string, body?: string}>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function FeatureHero({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const [badgePaused, setBadgePaused] = useState(false);
  if (!data?.heading) return null;

  const {
    breadcrumbs,
    eyebrow,
    heading,
    body,
    trustItems = [],
    primaryCTA,
    secondaryCTA,
    size,
    infoColumns = [],
  } = data;

  const bgUrl = strapiMedia(data.backgroundImage?.url, baseUrl);
  const badgeUrl = strapiMedia(data.badge?.url, baseUrl);
  // The seal's words are content (see its <img> below).
  if (badgeUrl) warnMissingAlt(data.badge, 'Feature Hero badge');

  /*
   * Only "tall" gets a class. Strapi applies an enum default on CREATE only, so
   * an entry authored before this field existed comes back null rather than
   * "standard" — treating anything that is not "tall" as standard covers both.
   */
  const sizeClass = size === 'tall' ? styles.tall : '';
  // Only wrap the trail in its column when there's a trail to show.
  const hasCrumbs = Boolean(
    breadcrumbs?.breadcrumbLabel?.trim() ||
    breadcrumbs?.breadcrumbLinks?.some((crumb) => crumb?.linkText),
  );

  return (
    <>
      {/* Page Hero's breadcrumb trail, in the page column above the
          full-bleed photo. */}
      {hasCrumbs ? (
        <div className={pageHero.inner}>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </div>
      ) : null}

      <section
        {...trackingRoot}
        className={`${styles.hero} ${sizeClass}`.trim()}
      >
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
              <div
                className={styles.actions}
                data-reveal
                style={{'--reveal-i': 4}}
              >
                {primaryCTA?.linkText ? (
                  <CmsLink
                    link={primaryCTA}
                    className="btn btn--primary"
                    trackRole="primary-cta"
                  />
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
                    trackRole="secondary-cta"
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {badgeUrl ? (
            /*
             * The seal: settles in (the wrapper), then turns slowly for good
             * (the image). Two elements because both animate `transform`, and
             * one animation on an element replaces another rather than adding
             * to it. Plain CSS animations, not data-reveal — the hero is above
             * the fold, so it plays on load.
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
                  /* The seal's words are content ("Works with or without
                     Smart Monster"), so its alt text comes from the Media
                     Library rather than being blanked as decoration. */
                  alt={data.badge?.alternativeText ?? ''}
                  width={data.badge?.width ?? undefined}
                  height={data.badge?.height ?? undefined}
                  className={styles.badgeImage}
                  decoding="async"
                />
              </div>
            </div>
          ) : null}
        </div>

        {badgeUrl ? (
          /* The spin never ends, so it gets a pause (WCAG 2.2.2) — the
             Ticker's toggle: the label stays put and aria-pressed carries the
             state. On the section, not .inner, so it can sit in the bottom
             padding. Hidden by CSS when reduced motion stills the seal. */
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
      </section>

      {/*
        Part of the hero in the CMS, a separate <section> in the markup: a
        navy band under the photo, not inside it, so it can't be nested in
        the section above. Its copy reveals, continuing the hero's stagger;
        the band itself doesn't animate, so it never gaps from the photo.
      */}
      {infoColumns.length > 0 ? (
        <section className={styles.callout}>
          <div className={styles.calloutInner}>
            <div className={styles.calloutPanel}>
              {infoColumns.map((column, i) => (
                <div className={styles.calloutColumn} key={column.id ?? i}>
                  <p
                    className={styles.calloutLabel}
                    data-reveal
                    style={{'--reveal-i': i + 5}}
                  >
                    {column.label}
                  </p>
                  {column.body ? (
                    <p
                      className={styles.calloutBody}
                      data-reveal
                      style={{'--reveal-i': i + 5}}
                    >
                      {column.body}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
