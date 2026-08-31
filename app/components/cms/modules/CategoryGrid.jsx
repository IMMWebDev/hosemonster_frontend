import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './CategoryGrid.module.css';

/**
 * Category Grid module — Figma "Homepage" → Hifi → Main → Section (7:1609).
 *
 * Intro copy, an optional banner, then a two-column grid of linked image cards.
 * Page-agnostic; the card count comes from the CMS.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     bannerHeading?: string,
 *     bannerBody?: string,
 *     bannerCta?: object,
 *     bannerImage?: {url?: string},
 *     items?: Array<{
 *       id: number,
 *       title: string,
 *       image?: {url?: string},
 *       link?: object,
 *       featured?: boolean,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CategoryGrid({data, baseUrl}) {
  const {
    eyebrow,
    heading,
    bannerHeading,
    bannerBody,
    bannerCta,
    items = [],
  } = data ?? {};

  if (!heading) return null;

  const bannerImageUrl = strapiMedia(data.bannerImage?.url, baseUrl);
  const hasBanner = Boolean(bannerHeading || bannerBody || bannerCta?.linkText);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.heading}>{heading}</h2>

        {hasBanner && (
          <div className={styles.banner}>
            {bannerImageUrl ? (
              <img
                src={bannerImageUrl}
                alt=""
                className={styles.bannerImage}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className={styles.bannerWash} aria-hidden="true" />

            <div className={styles.bannerCopy}>
              {bannerHeading ? (
                <h3 className={styles.bannerHeading}>{bannerHeading}</h3>
              ) : null}
              {bannerBody ? (
                <p className={styles.bannerBody}>{bannerBody}</p>
              ) : null}
            </div>

            {bannerCta?.linkText ? (
              <div className={styles.bannerAction}>
                <CmsLink link={bannerCta} className="btn btn--primary" />
              </div>
            ) : null}
          </div>
        )}

        {items.length > 0 && (
          <div className={styles.grid}>
            {items.map((item, i) => (
              <CategoryCard
                key={item.id ?? i}
                item={item}
                baseUrl={baseUrl}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * A single card. The whole card is the link rather than just the title, so the
 * hit target matches what the design makes look clickable.
 *
 * @param {{item: object, baseUrl?: string}} props
 */
function CategoryCard({item, baseUrl}) {
  const {title, link, featured} = item;
  const imageUrl = strapiMedia(item.image?.url, baseUrl);

  const inner = (
    <>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={styles.cardImage}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.cardWash} aria-hidden="true" />
      {/* Red hover wash, cross-faded over the navy one — see the note in the
          stylesheet on why this is a second layer rather than a swap. */}
      <div className={styles.cardWashHover} aria-hidden="true" />
      <h3 className={styles.cardTitle}>{title}</h3>
    </>
  );

  const className = `${styles.card} ${featured ? styles.featured : ''}`;

  // With nothing to link to, render a plain container rather than a dead anchor
  // that reads as interactive and cannot be tabbed out of usefully.
  if (!link) {
    return <div className={className}>{inner}</div>;
  }

  // CmsLink already resolves internal (React Router <Link>) vs external (<a>)
  // and handles openNewTab, so the whole card reuses it rather than
  // reimplementing that logic here.
  return (
    <CmsLink link={link} className={className}>
      {inner}
    </CmsLink>
  );
}
