import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './CtaBar.module.css';

/**
 * CTA Bar module — Figma "Shop" hifi (sprint-04/hifi_shop.html).
 *
 * A compact inset promo strip: a rounded navy card sitting inside the content
 * column, copy on the left and a single button pinned right.
 *
 * Deliberately NOT a variant of CTA Banner. That one is full-bleed, centred,
 * and led by a 52px heading; this is inset, left-aligned, and led by a 24px
 * one. Sharing a stylesheet between the two would mean every rule carrying a
 * flag, which makes both harder to read than two small files.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     cta?: object,
 *     secondaryCTA?: object,
 *     background?: 'navy' | 'red',
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CtaBar({data, baseUrl}) {
  const {eyebrow, heading, body, cta, secondaryCTA, background} = data ?? {};

  if (!heading) return null;

  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  /*
   * Only "red" gets a class. Strapi applies an enum default on CREATE only, so
   * a bar authored before this field existed returns null rather than "navy" —
   * treating anything that is not "red" as navy covers both.
   */
  const isRed = background === 'red';
  const backgroundClass = isRed ? styles.red : '';

  /*
   * A red fill needs the inverse button — .btn--primary on a red band is an
   * invisible red-on-red button. This is a real styleguide variant (see
   * app/styles/components.css), not a local override, so the class is chosen
   * here rather than patched in this module's CSS.
   */
  const ctaClass = `btn ${isRed ? 'btn--inverse' : 'btn--primary'}`;

  /*
   * The secondary is outlined WHITE on both fills, not .btn--secondary.
   *
   * Secondary is navy on white, which disappears into a navy band and fights a
   * red one. The styleguide only names this variant for orange grounds, but the
   * geometry is right for any saturated dark fill — Feature Hero uses it over
   * the navy scrim for the same reason.
   */
  const secondaryClass = 'btn btn--secondary-on-orange';

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={`${styles.bar} ${backgroundClass}`.trim()} data-reveal>
          {backgroundUrl ? (
            /* Parallax sits on the wrapper, not the <img> — a CSS animation
               overrides a transition on the same property, so an element with
               both would lose its reveal. */
            <div className={styles.background} data-parallax="slow">
              <img
                src={backgroundUrl}
                /* Decorative texture — the heading carries the meaning. */
                alt=""
                className={styles.backgroundImage}
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : null}

          {/*
            Scrim, only when there is a photo to protect. The copy is white on
            a light image otherwise — see the comp, which fades navy from full
            strength at the left to nothing by 75%, leaving the right quarter
            of the picture clean. Sits between the image and the content, so
            the button and text stay untouched.
          */}
          {backgroundUrl ? (
            <div className={styles.scrim} aria-hidden="true" />
          ) : null}

          <div className={styles.content}>
            <div className={styles.copy}>
              {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
              <h2 className={styles.heading}>{heading}</h2>
              {body ? <p className={styles.body}>{body}</p> : null}
            </div>

            {cta?.linkText || secondaryCTA?.linkText ? (
              <div className={styles.action}>
                {cta?.linkText ? (
                  <CmsLink link={cta} className={ctaClass} />
                ) : null}
                {secondaryCTA?.linkText ? (
                  <CmsLink link={secondaryCTA} className={secondaryClass} />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
