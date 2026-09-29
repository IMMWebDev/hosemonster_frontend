import {CartForm, Image, Money} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {useAside} from '~/components/Aside';
import CmsLink from '~/components/cms/CmsLink';
import {toCartLine} from '~/lib/cart-lines';
import {productRefFor} from '~/lib/module-products';
import {sharpImageProps} from '~/lib/image';
import {useProductPath} from '~/lib/product-urls';
import {CONTACT_PATH} from '~/lib/search';
import styles from './FeaturedProduct.module.css';

/**
 * Featured Product module — sprint-04 hifi_dechlorinationcollection.html v2,
 * "Featured kit".
 *
 * One Shopify product in a bordered two-column card: image left; eyebrow,
 * title, copy, price and buttons right.
 *
 * Strapi holds only the reference and the copy. The image, price and stock
 * come live from Shopify, resolved in the route loader (app/lib/module-
 * products.js) with the variant fragment, because the Add to cart needs to
 * know what it would be adding.
 *
 * The buy button never guesses:
 *  - one variant, sold online → Add to cart;
 *  - several variants → "Choose options", to the product page, rather than
 *    picking a thread or length for the customer;
 *  - nothing sold online → "Contact us to order", as on the product page.
 *
 * The editor's outlined button (`cta`) is hidden when it goes where the buy
 * button already goes — "Explore the kit" beside "Choose options", both to the
 * product page, is one destination offered twice.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     productRef?: string,
 *     heading?: string,
 *     body?: string,
 *     cta?: object,
 *   },
 *   products?: Record<string, object>,
 * }} props
 */
export default function FeaturedProduct({data, products = {}}) {
  const {eyebrow, heading, body, cta} = data ?? {};
  const pathFor = useProductPath();

  // A reference that no longer resolves (renamed, unpublished, deleted)
  // hides the module instead of rendering a card with no product in it.
  const product = products[productRefFor(data)];
  if (!product) return null;

  const {featuredImage, priceRange} = product;
  const variants = product.variants?.nodes ?? [];
  const min = priceRange?.minVariantPrice;
  const max = priceRange?.maxVariantPrice;
  const hasRange = min && max && Number(min.amount) !== Number(max.amount);

  const title = heading || product.title;
  // The module's own copy, else the product's meta description from the admin.
  const copy = body || product.seo?.description?.trim() || '';
  const productPath = pathFor(product.handle);

  const buyTo = buyDestination(product, variants, productPath);
  const ctaTo = linkPath(cta);
  const duplicate =
    buyTo != null &&
    ctaTo != null &&
    // /products/{handle} redirects to the product's page, so it's the same
    // destination too.
    (ctaTo === buyTo ||
      (buyTo === productPath && ctaTo === `/products/${product.handle}`));
  const showCta = Boolean(cta?.linkText) && !duplicate;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.card} data-reveal>
          <div className={styles.media}>
            {featuredImage ? (
              <Image
                data={featuredImage}
                // A style, not the aspectRatio prop: the prop makes the CDN
                // crop, and a product shot must never lose its edges.
                style={{
                  aspectRatio: `${featuredImage.width} / ${featuredImage.height}`,
                }}
                sizes="(min-width: 1100px) 440px, 90vw"
                className={styles.image}
                alt={featuredImage.altText || product.title}
                {...sharpImageProps(featuredImage)}
              />
            ) : null}
          </div>

          <div className={styles.copy}>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h2 className={styles.heading}>{title}</h2>
            {copy ? <p className={styles.body}>{copy}</p> : null}

            {min ? (
              <p className={styles.price}>
                {hasRange ? 'From ' : null}
                {/* as="span": Hydrogen's <Money> renders a <div> by default,
                    which can't sit inside a <p>. */}
                <Money data={min} withoutTrailingZeros as="span" />
              </p>
            ) : null}

            <div className={styles.actions}>
              {showCta ? (
                <CmsLink link={cta} className="btn btn--secondary" />
              ) : null}
              <BuyButton
                product={product}
                variants={variants}
                productPath={productPath}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Where the buy button links: the contact page, the product page to choose
 * options, or nowhere (it adds to the cart in place). Mirrors BuyButton.
 *
 * @returns {string | null}
 */
function buyDestination(product, variants, productPath) {
  if (!product.availableForSale) return CONTACT_PATH;
  if (variants.length !== 1) return productPath;
  return null;
}

/**
 * The on-site path a CMS link goes to, without query, hash or trailing slash;
 * null for an external or empty link, which can't match an on-site button.
 *
 * @param {{linkUrl?: string, pageLink?: {path?: string}, collectionLink?: {path?: string}} | undefined} link
 * @returns {string | null}
 */
function linkPath(link) {
  const to = link?.linkUrl || link?.pageLink?.path || link?.collectionLink?.path;
  if (!to || !to.startsWith('/') || to.startsWith('//')) return null;
  return to.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

/**
 * @param {{product: object, variants: Array<object>, productPath: string}} props
 */
function BuyButton({product, variants, productPath}) {
  const {open} = useAside();

  if (!product.availableForSale) {
    return (
      <Link to={CONTACT_PATH} className="btn btn--primary">
        Contact us to order
      </Link>
    );
  }

  if (variants.length !== 1) {
    return (
      <Link to={productPath} prefetch="intent" className="btn btn--primary">
        Choose options
      </Link>
    );
  }

  const [variant] = variants;
  return (
    <CartForm
      route="/cart"
      // Keyed so the cart can find this add's errors (CartNotices).
      fetcherKey={`cart-add-${variant.id}`}
      inputs={{lines: [toCartLine({product, variant})]}}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher) => (
        <button
          type="submit"
          className="btn btn--primary"
          disabled={fetcher.state !== 'idle'}
          onClick={() => open('cart')}
        >
          {fetcher.state !== 'idle' ? 'Adding…' : 'Add to cart'}
        </button>
      )}
    </CartForm>
  );
}
