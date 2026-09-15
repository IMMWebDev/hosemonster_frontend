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
 *     heading?: string,
 *     body?: string,
 *     cta?: object,
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CtaBar({data, baseUrl}) {
  const {heading, body, cta} = data ?? {};

  if (!heading) return null;

  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.bar} data-reveal>
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

          <div className={styles.content}>
            <div className={styles.copy}>
              <h2 className={styles.heading}>{heading}</h2>
              {body ? <p className={styles.body}>{body}</p> : null}
            </div>

            {cta?.linkText ? (
              <div className={styles.action}>
                <CmsLink link={cta} className="btn btn--primary" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
