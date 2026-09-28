import {Suspense, useEffect, useId, useMemo, useState} from 'react';
import {Await, Link, useNavigate, useRouteLoaderData} from 'react-router';
import {CartForm, Image, Money} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import {ProductCard} from '~/components/product-listing/ProductListing';
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
 *  - Below, the description reorganised into Overview, Specifications and
 *    Downloads (see lib/product-description.js), with jump links.
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
 * The buy box, in four groups: what it is (type, name, SKU), what it costs,
 * its options, and how to get it.
 *
 * "How to get it" is never a dead button. When Shopify sells the selection
 * online: quantity and Add to cart. When it doesn't: one panel that says so
 * once and gives a working way to order — the contact page and the phone
 * number from the footer — instead of a faded button, a note and a notice all
 * repeating "unavailable".
 *
 * @param {{product: object, selectedVariant: object, productOptions: Array<object>}} props
 */
function BuyBox({product, selectedVariant, productOptions}) {
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
                inputs={{
                  lines: [
                    {
                      merchandiseId: selectedVariant.id,
                      quantity: Number(quantity) || 1,
                      selectedVariant,
                    },
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
                  {' '}or call <PhoneLink phone={phone} />
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
                Or call <PhoneLink phone={phone} />
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** @param {{phone: string}} props */
function PhoneLink({phone}) {
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={styles.link}>
      {phone}
    </a>
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

/**
 * @param {{value: number | '', onChange: (v: number | '') => void, disabled?: boolean}} props
 */
function QuantityStepper({value, onChange, disabled}) {
  const id = useId();
  const n = Number(value) || 1;
  return (
    <div className={styles.qty}>
      <label htmlFor={id} className="sr-only">
        Quantity
      </label>
      <button
        type="button"
        className={styles.qtyButton}
        aria-label="Decrease quantity"
        disabled={disabled || n <= 1}
        onClick={() => onChange(Math.max(1, n - 1))}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={999}
        className={styles.qtyInput}
        value={value}
        disabled={disabled}
        // Empty while typing is allowed; it settles back to 1 on blur.
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange('');
          const parsed = Number.parseInt(raw, 10);
          onChange(Number.isFinite(parsed) ? Math.min(999, Math.max(1, parsed)) : 1);
        }}
        onBlur={() => {
          if (value === '') onChange(1);
        }}
      />
      <button
        type="button"
        className={styles.qtyButton}
        aria-label="Increase quantity"
        disabled={disabled || n >= 999}
        onClick={() => onChange(Math.min(999, n + 1))}
      >
        +
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Details                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * True at phone width. Starts true so the server renders the phone's
 * markup; the stylesheet, not this, decides what's visible, so correcting it
 * after hydration never moves anything.
 */
function useNarrow() {
  const [narrow, setNarrow] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 699px)');
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
}

/**
 * Overview, Specifications, Downloads — each a titled block, with jump links
 * when there's more than one. The description's own section titles ("Key
 * Features", "What's Included") stay as subheads inside the overview.
 *
 * On a phone the blocks are an accordion, Overview open: stacked in full they
 * made a very long page to scroll past for the related products. Visibility
 * is the stylesheet's (by breakpoint, so nothing jumps on hydration); the
 * titles are toggle buttons only where toggling does something.
 *
 * @param {{sections: ReturnType<typeof splitDescription>}} props
 */
function Details({sections}) {
  const {intro, overview, specifications, downloads} = sections;
  const collapsible = useNarrow();
  const [open, setOpen] = useState(() => new Set(['overview']));
  const toggle = (id) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const blocks = [];

  if (intro || overview.length) {
    blocks.push({
      id: 'overview',
      title: 'Overview',
      body: (
        <>
          {intro ? <Prose html={intro} /> : null}
          {overview.map((s) => (
            <div key={s.title} className={styles.subsection}>
              <h3 className={styles.subTitle}>{s.title}</h3>
              <Prose html={s.html} />
            </div>
          ))}
        </>
      ),
    });
  }
  if (specifications.length) {
    blocks.push({
      id: 'specifications',
      title: 'Specifications',
      body: specifications.map((s) => (
        <div key={s.title} className={styles.subsection}>
          {specifications.length > 1 ? <h3 className={styles.subTitle}>{s.title}</h3> : null}
          <Prose html={s.html} />
        </div>
      )),
    });
  }
  if (downloads.length) {
    blocks.push({
      id: 'downloads',
      title: 'Downloads',
      body: downloads.map((s) => (
        <Prose key={s.title} html={s.html} className={styles.downloads} />
      )),
    });
  }

  if (!blocks.length) return null;

  return (
    <div className={styles.details}>
      <div className={styles.inner}>
        {blocks.length > 1 ? (
          <nav className={styles.jump} aria-label="On this page">
            <ul className={styles.jumpList} role="list">
              {blocks.map((b) => (
                <li key={b.id}>
                  <a href={`#${b.id}`} className={styles.jumpLink}>
                    {b.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {blocks.map((b) => {
          const isOpen = open.has(b.id);
          return (
            <section
              key={b.id}
              id={b.id}
              className={styles.block}
              data-open={isOpen ? '' : undefined}
              aria-labelledby={`${b.id}-title`}
            >
              <h2 id={`${b.id}-title`} className={styles.blockTitle}>
                {collapsible ? (
                  <button
                    type="button"
                    className={styles.blockToggle}
                    aria-expanded={isOpen}
                    aria-controls={`${b.id}-body`}
                    onClick={() => toggle(b.id)}
                  >
                    {b.title}
                    <span className={styles.blockChevron} aria-hidden="true" />
                  </button>
                ) : (
                  b.title
                )}
              </h2>
              <div id={`${b.id}-body`} className={styles.blockBody}>
                {b.body}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
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
