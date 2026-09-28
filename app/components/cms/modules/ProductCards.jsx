import {Image, Money} from '@shopify/hydrogen';
import CmsLink from '~/components/cms/CmsLink';
import {collectionSourceFor, productRefFor} from '~/lib/module-products';
import {sharpImageProps} from '~/lib/image';
import {Link} from 'react-router';
import {useProductPath} from '~/lib/product-urls';
import styles from './ProductCards.module.css';

/**
 * Product Cards module — Figma "Shop" hifi (sprint-04/hifi_shop.html).
 *
 * Intro copy and an optional "view all" link above a row of Shopify product
 * cards.
 *
 * Filled one of two ways:
 *  - a Collection picked in Strapi: its first N products, in the chosen
 *    order, live from Shopify; each card's label is the product's type. The
 *    hand-picked items are ignored, and with no view-all link of its own the
 *    module links to the collection's page.
 *  - otherwise the hand-picked items: a handle per card plus its label and
 *    spec line.
 * Title, price, image and URL always come live from the Storefront API. The
 * lookup happens in the route loader (see app/lib/module-products.js) because
 * BlockManager renders straight from the CMS payload and cannot fetch —
 * `products` arrives here already resolved.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     viewAllLink?: object,
 *     cardCtaLabel?: string,
 *     items?: Array<{id: number, productRef: string, label?: string, spec?: string}>,
 *     collection?: {name?: string, shopifyCollectionHandle?: string, path?: string},
 *     productLimit?: number,
 *     sort?: string,
 *   },
 *   products?: Record<string, object>,
 * }} props
 */
export default function ProductCards({data, products = {}}) {
  const {eyebrow, heading, body, viewAllLink, cardCtaLabel, items = []} =
    data ?? {};

  if (!heading) return null;

  const source = collectionSourceFor(data);

  /*
   * From the collection, or the hand-picked items with any whose handle no
   * longer resolves dropped — a product renamed, unpublished or deleted in
   * Shopify is absent from the lookup, and its card would be a tile with no
   * title, no price and a link to a 404.
   */
  const cards = source
    ? (products[source.key] ?? []).map((product) => ({
        key: product.id,
        item: {label: product.productType},
        product,
      }))
    : items
        .map((item) => ({
          key: item.id,
          item,
          product: products[productRefFor(item) ?? ''],
        }))
        .filter(({product}) => Boolean(product));

  if (cards.length === 0) return null;

  // With a collection picked and no link of its own, view all of it.
  const viewAll = viewAllLink?.linkText
    ? viewAllLink
    : source && data.collection?.path
      ? {linkText: 'View all', collectionLink: data.collection}
      : null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.headCopy}>
            {eyebrow ? (
              <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
                {eyebrow}
              </p>
            ) : null}
            <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
              {heading}
            </h2>
            {body ? (
              <p className={styles.body} data-reveal style={{'--reveal-i': 2}}>
                {body}
              </p>
            ) : null}
          </div>

          {viewAll ? <CmsLink link={viewAll} className={styles.viewAll} /> : null}
        </div>

        <div className={styles.grid}>
          {cards.map(({key, item, product}, i) => (
            <ProductCard
              key={key ?? product.id}
              item={item}
              product={product}
              ctaLabel={cardCtaLabel}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * @param {{item: object, product: object, ctaLabel?: string, index?: number}} props
 */
function ProductCard({item, product, ctaLabel, index = 0}) {
  const pathFor = useProductPath();
  const {label, spec} = item;
  const {handle, title, featuredImage, priceRange} = product;

  const min = priceRange?.minVariantPrice;
  const max = priceRange?.maxVariantPrice;

  /*
   * "From" only when the variants actually span a range. The comp prints it on
   * every card, but on a single-variant product it implies a choice of prices
   * that does not exist.
   */
  const hasRange = Boolean(min && max && min.amount !== max.amount);

  return (
    <Link
      to={pathFor(handle)}
      prefetch="intent"
      className={styles.card}
      data-reveal
      style={{'--reveal-i': index + 3}}
    >
      {featuredImage ? (
        /* Hydrogen's Image, not a raw <img>: it emits width/height and a
           Shopify CDN srcset, so the card reserves its space before the bitmap
           arrives instead of shifting the grid as each one lands. */
        <Image
          data={featuredImage}
          /* The 4:3 frame in `style`, not the aspectRatio prop — the prop
             also crops the file at the CDN. See ProductListing's card. */
          style={{aspectRatio: '4 / 3'}}
          sizes="(min-width: 1100px) 320px, (min-width: 700px) 45vw, 90vw"
          className={styles.cardImage}
          loading="lazy"
          alt={featuredImage.altText || ''}
          {...sharpImageProps(featuredImage)}
        />
      ) : null}

      <div className={styles.cardText}>
        {label ? <p className={styles.cardLabel}>{label}</p> : null}
        <h3 className={styles.cardTitle}>{title}</h3>
        {spec ? <p className={styles.cardSpec}>{spec}</p> : null}

        {min ? (
          <p className={styles.cardPrice}>
            {hasRange ? <span className={styles.from}>From </span> : null}
            {/* as="span": Hydrogen's <Money> renders a <div> by default, which
                is block-level and drops the amount onto its own line under
                "From". The comp has them on one line. */}
            <Money data={min} withoutTrailingZeros as="span" />
          </p>
        ) : null}

        {ctaLabel ? <span className={styles.cardCta}>{ctaLabel}</span> : null}
      </div>
    </Link>
  );
}
