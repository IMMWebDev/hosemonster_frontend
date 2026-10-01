import {Suspense, useEffect, useMemo, useState} from 'react';
import {Await, Link, useNavigate, useRouteLoaderData} from 'react-router';
import {CartForm, Image, Money} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import PhoneLink from '~/components/PhoneLink';
import QuantityStepper from '~/components/QuantityStepper';
import {ProductCard} from '~/components/product-listing/ProductListing';
import {toCartLine} from '~/lib/cart-lines';
import {sharpImageProps} from '~/lib/image';
import {useProductPath} from '~/lib/product-urls';
import {CONTACT_PATH} from '~/lib/search';
import {splitDescription} from '~/lib/product-description';
import styles from './ProductPage.module.css';

/**
 * The product page, laid out the way industrial and B2B stores do it
 * (Grainger, McMaster-Carr, Fluke):
 *
 *  - A breadcrumb back to the category.
 *  - Above the fold, the gallery beside a sticky buy box: category, name, SKU,
 *    price, options as chips, quantity, Add to cart — and, when Shopify won't
 *    sell it online, a plain "contact us to order" instead of a dead button.
 *  - Below, the description's sections (Key Features, Specifications,
 *    Downloads…) as an accordion (see lib/product-description.js).
 *  - "More in {collection}": other products from the product's collection.
 *
 * Everything comes from Shopify; nothing here is editorial.
 *
 * @param {{
 *   product: object,
 *   selectedVariant: object,
 *   productOptions: Array<object>,
 *   category: {handle: string, title: string, linkable: boolean} | null,
 *   recommended: Promise<{title: string, products: Array<object>} | null>,
 * }} props
 */
export function ProductPage({product, selectedVariant, productOptions, category, recommended}) {
  const sections = useMemo(
    () => splitDescription(product.descriptionHtml),
    [product.descriptionHtml],
  );

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs product={product} category={category} />
        <div className={styles.top}>
          <Gallery product={product} selectedVariant={selectedVariant} />
          <BuyBox
            product={product}
            selectedVariant={selectedVariant}
            productOptions={productOptions}
            intro={sections.intro}
          />
        </div>
      </div>
      <Details sections={sections} />
      <Related recommended={recommended} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Breadcrumb                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Home / Shop / category / product. The category links only when it has a
 * page to go to (a CMS entry); otherwise it's shown as text.
 *
 * On a phone only the parent shows, as "‹ Hose Monsters" — the full trail
 * wrapped onto two lines above the product. `data-parent` marks it: the
 * category when it has a page, otherwise Shop.
 *
 * @param {{product: object, category: object | null}} props
 */
function Breadcrumbs({product, category}) {
  const categoryIsParent = Boolean(category?.linkable);
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.crumbs}>
        <li>
          <Link to="/" className={styles.crumbLink}>
            Home
          </Link>
        </li>
        <li data-parent={categoryIsParent ? undefined : ''}>
          <Link to="/shop" className={styles.crumbLink}>
            Shop
          </Link>
        </li>
        {category ? (
          <li data-parent={categoryIsParent ? '' : undefined}>
            {category.linkable ? (
              <Link to={`/collections/${category.handle}`} className={styles.crumbLink}>
                {category.title}
              </Link>
            ) : (
              <span className={styles.crumbText}>{category.title}</span>
            )}
          </li>
        ) : null}
        <li>
          <span className={styles.crumbCurrent} aria-current="page">
            {product.title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Gallery                                                                      */
/* -------------------------------------------------------------------------- */

/** Fill the frame; the stylesheet's object-fit: contain keeps the whole photo. */
const FILL = {width: '100%', height: '100%'};

/**
 * Never larger than the file itself: a small upload (the BigBoy's 365px gauge
 * close-up) was stretched to fill the stage and went soft. It shows at its own
 * size, centred, instead.
 *
 * @param {{width?: number, height?: number}} image
 */
function noUpscale(image) {
  return {
    ...(image?.width ? {maxWidth: `${image.width}px`} : {}),
    ...(image?.height ? {maxHeight: `${image.height}px`} : {}),
  };
}

/**
 * The main image on a white stage (product shots are cut out on white), with
 * thumbnails when there's more than one. Picking an option with its own photo
 * switches to it.
 *
 * No `aspectRatio` on the Images: Hydrogen turns it into a centre crop at the
 * CDN, which cut the sides off landscape photos. Each image keeps its own
 * shape and is fitted (contain) into the square stage by the stylesheet; the
 * inline style overrides Hydrogen's own width so it can fill the stage.
 *
 * @param {{product: object, selectedVariant: object}} props
 */
function Gallery({product, selectedVariant}) {
  const images = product.images?.nodes ?? [];
  const variantImage = selectedVariant?.image;
  const indexOf = (image) =>
    image ? images.findIndex((i) => i.id === image.id || i.url === image.url) : -1;
  const [active, setActive] = useState(() => Math.max(0, indexOf(variantImage)));

  useEffect(() => {
    const i = indexOf(variantImage);
    if (i >= 0) setActive(i);
    // Only when the variant's image changes; `images` is stable per product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImage?.id, variantImage?.url]);

  const main = images[active] ?? variantImage ?? null;

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        {main ? (
          <Image
            data={main}
            // The stage's inner width: half the container less its padding.
            sizes="(min-width: 1100px) 540px, (min-width: 700px) 45vw, 90vw"
            loading="eager"
            alt={main.altText || product.title}
            className={styles.stageImage}
            style={{...FILL, ...noUpscale(main)}}
            {...sharpImageProps(main)}
          />
        ) : (
          <div className={styles.stageEmpty} aria-hidden="true" />
        )}
      </div>

      {images.length > 1 ? (
        <ul className={styles.thumbs} role="list" aria-label="Product images">
          {images.map((image, i) => (
            <li key={image.id ?? image.url}>
              <button
                type="button"
                className={styles.thumb}
                aria-current={i === active ? 'true' : undefined}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                onClick={() => setActive(i)}
              >
                <Image
                  data={image}
                  sizes="80px"
                  alt=""
                  className={styles.thumbImage}
                  style={FILL}
                  {...sharpImageProps(image)}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buy box                                                                      */
/* -------------------------------------------------------------------------- */

/** "Select Thread Type" -> "Thread Type": Shopify option names as shoppers read them. */
function optionLabel(name) {
  return String(name ?? '').replace(/^select\s+/i, '');
}

/**
 * The buy box, in four groups: what it is (type, name, SKU), what it costs
 * — with the description's opening paragraph or bullets under the price,
 * where the client's current site puts them — its options, and how to get
 * it. The description's <h3> sections stay in Details below.
 *
 * "How to get it" is never a dead button. When Shopify sells the selection
 * online: quantity and Add to cart. When it doesn't: one panel that says so
 * once and gives a working way to order — the contact page and the phone
 * number from the footer — instead of a faded button, a note and a notice all
 * repeating "unavailable".
 *
 * @param {{product: object, selectedVariant: object, productOptions: Array<object>, intro?: string}} props
 */
function BuyBox({product, selectedVariant, productOptions, intro = ''}) {
  const navigate = useNavigate();
  const {open} = useAside();
  const phone = useRouteLoaderData('root')?.cmsFooter?.phone ?? null;
  const [quantity, setQuantity] = useState(1);

  const available = Boolean(selectedVariant?.availableForSale);
  // Some option of the product can be bought online, if not this one.
  const sellsOnline = Boolean(product.availableForSale);
  const price = selectedVariant?.price;
  const compareAt = selectedVariant?.compareAtPrice;
  const onSale =
    price && compareAt && Number(compareAt.amount) > Number(price.amount);

  // An option with a single value (Shopify's "Title") isn't a choice.
  const options = productOptions.filter((o) => o.optionValues.length > 1);
  const driver =
    options.length === 1 ? optionLabel(options[0].name).toLowerCase() : 'options';

  // When the options differ in price, the spread under the price shown, so
  // it isn't read as the only one.
  const min = product.priceRange?.minVariantPrice;
  const max = product.priceRange?.maxVariantPrice;
  const hasRange = min && max && Number(min.amount) !== Number(max.amount);

  // "NYFD" — the option values on show, for the panel when just this choice
  // is the one that can't be ordered.
  const shown = options
    .map((o) => o.optionValues.find((v) => v.selected)?.name)
    .filter(Boolean)
    .join(' / ');

  return (
    <div className={styles.buyBox}>
      <div className={styles.head}>
        {product.productType ? (
          <p className={styles.eyebrow}>{product.productType}</p>
        ) : null}
        <h1 className={styles.title}>{product.title}</h1>
        {selectedVariant?.sku ? (
          <p className={styles.sku}>
            SKU <span className={styles.skuValue}>{selectedVariant.sku}</span>
          </p>
        ) : null}
      </div>

      {price ? (
        <div className={styles.pricing}>
          <p className={styles.priceRow}>
            <Money data={price} withoutTrailingZeros as="span" className={styles.price} />
            {onSale ? (
              <s className={styles.compareAt}>
                <Money data={compareAt} withoutTrailingZeros as="span" />
              </s>
            ) : null}
          </p>
          {hasRange ? (
            <p className={styles.priceRange}>
              Varies by {driver}: <Money data={min} withoutTrailingZeros as="span" /> –{' '}
              <Money data={max} withoutTrailingZeros as="span" />
            </p>
          ) : null}
        </div>
      ) : null}

      {intro ? <Prose html={intro} className={styles.intro} /> : null}

      {options.length ? (
        <div className={styles.options}>
          {options.map((option) => (
            <OptionChips
              key={option.name}
              option={option}
              // Crossing values out only means something next to ones that
              // aren't: when nothing is sold online, the panel below says so
              // and every chip stays readable.
              markUnavailable={sellsOnline}
              onSelect={(query) =>
                navigate(`?${query}`, {replace: true, preventScrollReset: true})
              }
            />
          ))}
        </div>
      ) : null}

      <div className={styles.order}>
        {available ? (
          <>
            <div className={styles.purchase}>
              <QuantityStepper value={quantity} onChange={setQuantity} />
              <CartForm
                route="/cart"
                // Keyed so the cart can find this add's errors (CartNotices).
                fetcherKey={`cart-add-${selectedVariant.id}`}
                inputs={{
                  lines: [
                    toCartLine({
                      product,
                      variant: selectedVariant,
                      quantity: Number(quantity) || 1,
                    }),
                  ],
                }}
                action={CartForm.ACTIONS.LinesAdd}
              >
                {(fetcher) => (
                  <button
                    type="submit"
                    className={`btn btn--primary ${styles.addButton}`}
                    disabled={fetcher.state !== 'idle'}
                    onClick={() => open('cart')}
                  >
                    {fetcher.state !== 'idle' ? 'Adding…' : 'Add to cart'}
                  </button>
                )}
              </CartForm>
            </div>
            <p className={styles.help}>
              Questions about this product?{' '}
              <Link to={CONTACT_PATH} className={styles.link}>
                Talk to our team
              </Link>
              {phone ? (
                <>
                  {' '}or call <PhoneLink phone={phone} className={styles.link} />
                </>
              ) : null}
            </p>
          </>
        ) : (
          <div className={styles.orderPanel}>
            <p className={styles.orderTitle}>
              {sellsOnline && shown
                ? `${shown} isn’t available to order online`
                : 'Not available to order online'}
            </p>
            <p className={styles.orderBody}>
              {sellsOnline && shown
                ? `Choose another ${driver === 'options' ? 'option' : driver}, or contact our team to order this one.`
                : 'Contact our team to order it — we’ll confirm pricing and availability.'}
            </p>
            <Link to={CONTACT_PATH} className={`btn btn--secondary ${styles.orderButton}`}>
              Contact us to order
            </Link>
            {phone ? (
              <p className={styles.orderPhone}>
                Or call <PhoneLink phone={phone} className={styles.link} />
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One option as a row of chips (§07: 44px pills, navy when selected).
 *
 * With `markUnavailable`, a value Shopify won't sell online is crossed out
 * but can still be picked, so its price and SKU can be seen (special threads
 * cost more). Only a combination that doesn't exist at all is disabled. The
 * value on show keeps its selected outline either way. `available` is
 * Shopify's per-value flag for the current selection, so with several options
 * it updates as the others change.
 *
 * @param {{option: object, markUnavailable: boolean, onSelect: (query: string) => void}} props
 */
function OptionChips({option, markUnavailable, onSelect}) {
  const pathFor = useProductPath();
  const selected = option.optionValues.find((v) => v.selected);
  const isOut = (v) => markUnavailable && v.exists && !v.available;
  const anyOut = option.optionValues.some(isOut);
  return (
    <fieldset className={styles.option}>
      <legend className={styles.optionLegend}>
        {optionLabel(option.name)}
        {selected ? <span className={styles.optionValue}>: {selected.name}</span> : null}
      </legend>
      <div className={styles.chips}>
        {option.optionValues.map((value) =>
          value.isDifferentProduct ? (
            // A combined listing: the value is another product's page.
            <Link
              key={value.name}
              to={`${pathFor(value.handle)}?${value.variantUriQuery}`}
              prefetch="intent"
              preventScrollReset
              replace
              className={styles.chip}
              aria-current={value.selected ? 'true' : undefined}
            >
              {value.name}
            </Link>
          ) : (
            <button
              key={value.name}
              type="button"
              className={styles.chip}
              aria-pressed={value.selected}
              data-unavailable={isOut(value) ? '' : undefined}
              disabled={!value.exists}
              aria-label={isOut(value) ? `${value.name}, not available online` : undefined}
              onClick={() => {
                if (!value.selected) onSelect(value.variantUriQuery);
              }}
            >
              {value.name}
            </button>
          ),
        )}
      </div>
      {anyOut ? (
        <p className={styles.optionNote}>Crossed-out options aren’t available online.</p>
      ) : null}
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/* Details                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The description's <h3> sections — "Key Features", "Applications",
 * "Specifications", "Downloads" and the rest — as an accordion, one row per
 * section, titled with the product's own heading and in the description's
 * order. All start closed: the opening copy is already in the buy box, and
 * shut rows let a shopper see everything there is to read in one glance
 * instead of scrolling past it to the related products.
 *
 * Each row is a heading holding a disclosure button (the WAI accordion
 * pattern); the panel eases open and shut by its grid row, as the cart's
 * order note does. A link to `#specifications` (or any row's id) opens that
 * row and scrolls to it.
 *
 * @param {{sections: ReturnType<typeof splitDescription>}} props
 */
function Details({sections}) {
  const rows = useMemo(() => withIds(sections.sections), [sections.sections]);
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Arrived with #specifications (or another row's id): open it and go there.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !rows.some((r) => r.id === id)) return;
    setOpen((current) => new Set(current).add(id));
    // The row's top doesn't move as its panel opens, so no need to wait.
    document.getElementById(id)?.scrollIntoView({block: 'start'});
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows.length) return null;

  return (
    <div className={styles.details}>
      <div className={styles.inner}>
        <div className={styles.accordion}>
          {rows.map((row) => {
            const isOpen = open.has(row.id);
            return (
              <section
                key={row.id}
                id={row.id}
                className={styles.block}
                data-open={isOpen ? '' : undefined}
                aria-labelledby={`${row.id}-title`}
              >
                <h2 className={styles.blockTitle}>
                  <button
                    type="button"
                    id={`${row.id}-title`}
                    className={styles.blockToggle}
                    aria-expanded={isOpen}
                    aria-controls={`${row.id}-body`}
                    onClick={() => toggle(row.id)}
                  >
                    <span>{row.title}</span>
                    {/* The FAQ module's +/− tile: the house accordion
                        affordance. Decorative — aria-expanded says it. */}
                    <span className={styles.toggle} aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" focusable="false">
                        <line
                          className={styles.toggleBar}
                          x1="6"
                          y1="1"
                          x2="6"
                          y2="11"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                        <line x1="1" y1="6" x2="11" y2="6" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                </h2>
                <div id={`${row.id}-body`} className={styles.blockPanel}>
                  <div className={styles.blockInner}>
                    <div className={styles.blockBody}>
                      <Prose
                        html={row.html}
                        className={row.kind === 'downloads' ? styles.downloads : ''}
                      />
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Each section with an id to link to: its title slugged ("Key Features" →
 * key-features), the first Specifications and Downloads keeping the plain
 * ids older links use, and a number added on a repeat.
 *
 * @param {Array<{title: string, html: string, kind: string}>} sections
 */
function withIds(sections) {
  const used = new Set();
  return sections.map((section) => {
    const plain =
      section.kind === 'overview'
        ? section.title
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'section'
        : section.kind;
    let id = used.has(plain) ? '' : plain;
    for (let n = 2; !id; n += 1) if (!used.has(`${plain}-${n}`)) id = `${plain}-${n}`;
    used.add(id);
    return {...section, id};
  });
}

/**
 * Description HTML from the Shopify admin — the client's own copy, styled
 * here rather than rewritten.
 *
 * @param {{html: string, className?: string}} props
 */
function Prose({html, className = ''}) {
  return (
    <div
      className={`${styles.prose} ${className}`}
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Related                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Related products, streamed in after the page so they never hold it up.
 * Nothing renders if there are none.
 *
 * @param {{recommended: Promise<{title: string, products: Array<object>} | null>}} props
 */
function Related({recommended}) {
  return (
    <Suspense fallback={null}>
      <Await resolve={recommended} errorElement={null}>
        {(related) =>
          related?.products?.length ? (
            <section className={styles.related} aria-labelledby="related-title">
              <div className={styles.inner}>
                <h2 id="related-title" className={styles.relatedTitle}>
                  {related.title}
                </h2>
                <div className={styles.relatedGrid}>
                  {related.products.slice(0, 4).map((p) => (
                    <ProductCard key={p.id} product={p} loading="lazy" />
                  ))}
                </div>
              </div>
            </section>
          ) : null
        }
      </Await>
    </Suspense>
  );
}
