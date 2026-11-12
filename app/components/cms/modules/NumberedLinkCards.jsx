import {useRouteLoaderData} from 'react-router';
import CmsLink from '~/components/cms/CmsLink';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {linkDestination} from '~/lib/cms-links';
import {productRefFor} from '~/lib/module-products';
import {useProductPath} from '~/lib/product-urls';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './NumberedLinkCards.module.css';

/**
 * Numbered Link Cards module — sprint-05 hifi_hmuhub.html, "How a flow test
 * runs".
 *
 * A full-bleed navy band: eyebrow, heading and copy, then a row of white
 * cards, each a numbered stage with a title, a small label and a list of
 * links, and an optional button under the row.
 *
 * The links are a divided list — a row per link, navy text, the chevron
 * pinned right — rather than the comp's stacked orange links: long product
 * names wrap inside their row, the orange stays for the numerals, and every
 * row is a full-width tap target.
 *
 * A link is either a product or anything else (utilities.list-link). A
 * product link carries only a reference; its name and URL come from Shopify,
 * resolved by the route loader with the Product Cards lookup
 * (lib/module-products), so `products` arrives here keyed by the reference.
 * A reference Shopify doesn't know hides its row.
 *
 * The cards lift on hover, as the comp draws them, but they aren't links:
 * the rows are the targets, and a row only reacts when the pointer is on it.
 * The lift lives on an inner wrapper so it doesn't fight the scroll-in
 * reveal, which owns the <li>'s transform and transitions.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     cards?: Array<{
 *       id?: number,
 *       title?: string,
 *       label?: string,
 *       links?: Array<object>,
 *     }>,
 *     primaryCTA?: object | null,
 *     backgroundImage?: {url?: string} | null,
 *   },
 *   products?: Record<string, {handle: string, title: string}>,
 *   baseUrl?: string,
 * }} props
 */
export default function NumberedLinkCards({data, products = {}, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const pathFor = useProductPath();
  const watermark = useRouteLoaderData('root')?.cmsOptions?.watermark;
  const {eyebrow, heading, body, cards = [], primaryCTA} = data ?? {};
  if (!heading) return null;

  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);
  const watermarkUrl = strapiMedia(watermark?.url, baseUrl);
  const visibleCards = cards.filter((card) => card?.title);

  /**
   * A list link as a plain link object CmsLink can render, or null when it
   * goes nowhere. Products: Shopify's name (unless Link Text overrides it)
   * and the product's URL.
   */
  const resolve = (item) => {
    const ref = productRefFor(item);
    if (ref) {
      const product = products[ref];
      if (!product) return null;
      return {
        linkText: item.linkText?.trim() || product.title,
        linkUrl: pathFor(product.handle),
        openNewTab: item.openNewTab,
      };
    }
    return item?.linkText?.trim() && linkDestination(item) ? item : null;
  };

  return (
    <section {...trackingRoot} className={styles.section}>
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          /* Decorative — the copy carries the meaning. */
          alt=""
          className={styles.backgroundImage}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.scrim} aria-hidden="true" />
      {watermarkUrl ? (
        <img
          src={watermarkUrl}
          alt=""
          className={styles.watermark}
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          <RaisedMarks text={heading} />
        </h2>
        {body ? (
          <p className={styles.body} data-reveal style={{'--reveal-i': 2}}>
            {body}
          </p>
        ) : null}

        {visibleCards.length > 0 ? (
          <ol className={styles.grid}>
            {visibleCards.map((card, i) => {
              const links = (card.links ?? [])
                .map((item) => ({item, link: resolve(item)}))
                .filter(({link}) => link);
              return (
                <li
                  key={card.id ?? i}
                  className={styles.item}
                  data-reveal
                  style={{'--reveal-i': i + 3}}
                >
                  <div className={styles.card}>
                  {/* The <ol> already announces the position. */}
                  <span className={styles.number} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className={styles.title}>
                    <RaisedMarks text={card.title} />
                  </h3>

                  {links.length > 0 ? (
                    <div className={styles.links}>
                      {card.label ? (
                        <p className={styles.label}>{card.label}</p>
                      ) : null}
                      <ul className={styles.list}>
                        {links.map(({item, link}, j) => (
                          <li key={item.id ?? j} className={styles.row}>
                            <CmsLink
                              link={link}
                              className={styles.rowLink}
                              trackRole={`card-${i + 1}-link-${j + 1}`}
                            >
                              <span className={styles.rowText}>
                                <RaisedMarks text={link.linkText} />
                              </span>
                              <Chevron />
                            </CmsLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}

        {primaryCTA?.linkText && linkDestination(primaryCTA) ? (
          <div className={styles.actions} data-reveal>
            <CmsLink
              link={primaryCTA}
              className={`btn btn--primary ${styles.cta}`}
              trackRole="primary-cta"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Chevron() {
  return (
    <svg
      className={styles.chevron}
      width="7"
      height="12"
      viewBox="-12 -12 682 1229"
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points="0,0 225,0 658,602 225,1205 0,1205 423,602"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinejoin="round"
      />
    </svg>
  );
}
