import {useId, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {
  SORT_OPTIONS,
  FILTER_PARAM,
  isFilterActive,
  toggleFilter,
  withSort,
  clearFilters,
  setPriceRange,
} from '~/lib/collection-filters';
import styles from './ProductFeed.module.css';

/** Anchor the pager scrolls to. See the <section> and hrefFor(). */
const FEED_ANCHOR = 'products';

/**
 * Product Feed module — Figma "Smart Monster Collection" hifi
 * (sprint-04/hifi_smartmonstercollection.html).
 *
 * The filtered, sortable listing for a collection page: heading and sort on one
 * line, a filter rail, then a paginated grid.
 *
 * Everything shown comes from Shopify. The module stores only the heading and
 * which controls appear — products, facets and counts are queried by the route
 * (see collections.$handle.jsx) because sort and filter state live in the URL
 * and Shopify has to recompute the counts on every change.
 *
 * The filter UI is deliberately generic: it renders whatever facets Shopify
 * returns rather than modelling any particular one. Today that is Availability
 * and Price; if the Search & Discovery app is configured later, product-type
 * and metafield facets appear here with no code change.
 *
 * @param {{
 *   data: {heading?: string, showFilters?: boolean, showSort?: boolean},
 *   collection?: object,
 *   activeSort?: string,
 *   pagination?: {page: number, pageCount: number, total: number, from: number, to: number},
 * }} props
 */
export default function ProductFeed({data, collection, activeSort, pagination}) {
  const {heading, showFilters = true, showSort = true} = data ?? {};
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sortId = useId();

  /*
   * Only meaningful on a Collections entry — the Shopify handle is what says
   * which products to show. Rendering the chrome with no products would look
   * like an outage rather than a misplaced module.
   */
  if (!collection?.products) return null;

  const products = collection.products;
  const facets = (products.filters ?? []).filter(
    (f) => (f.values ?? []).length > 0,
  );
  const hasActiveFilters = searchParams.getAll(FILTER_PARAM).length > 0;

  /*
   * The TOTAL across all pages, not this page’s slice.
   *
   * This used to read products.nodes.length, which was the page size — so the
   * aria-live line announced “Showing 12 products” while the grid held 24.
   * The loader knows the real figure; fall back to the slice only when this
   * module is rendered somewhere that does not supply pagination.
   */
  const total = pagination?.total ?? products.nodes.length;
  const count = products.nodes.length;

  /*
   * preventScrollReset is right for sort and filters — the controls are at the
   * top and the visitor is already looking at them. It is wrong for a page
   * link, where they expect to arrive at the start of the new page.
   */
  const go = (next) =>
    navigate(`?${next.toString()}`, {preventScrollReset: true});

  return (
    /*
     * A STABLE id, not useId(): the pager links to it, so it has to be the same
     * string in the href and on the element, and it has to survive into a URL
     * somebody pastes. Assumes one Product Feed per page, which is what a
     * collection page is for.
     */
    <section className={styles.section} id={FEED_ANCHOR}>
      <div className={styles.inner}>
        <div className={styles.head}>
          {heading ? <h2 className={styles.heading}>{heading}</h2> : null}

          {showSort ? (
            <div className={styles.sort}>
              <label className={styles.sortLabel} htmlFor={sortId}>
                Sort by
              </label>
              {/*
                A real <select>, not a custom dropdown. It is a single-choice
                control that reloads the page — the native one is keyboard
                accessible, works before hydration, and on mobile opens the
                platform picker.
              */}
              <select
                id={sortId}
                className={styles.sortSelect}
                value={activeSort}
                onChange={(e) => go(withSort(searchParams, e.target.value))}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className={styles.layout}>
          {/*
            The rail is a labelled region, NOT an <aside>. app.css styles bare
            `aside` for the off-canvas drawers — fixed, 100vh, 400px wide — so
            using one here silently gave the rail the cart drawer's width and
            made it overlap the grid.
          */}
          {showFilters && facets.length > 0 ? (
            <div className={styles.rail} role="region" aria-label="Filters">
              <div className={styles.railHead}>
                <h3 className={styles.railTitle}>Filters</h3>
                {/* Always present, not only when something is active, so the
                    rail does not reflow on the first click. Disabled rather
                    than hidden when there is nothing to clear. */}
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => go(clearFilters(searchParams))}
                  disabled={!hasActiveFilters}
                >
                  Clear all
                </button>
              </div>

              {facets.map((facet) => (
                <Facet
                  key={facet.id}
                  facet={facet}
                  searchParams={searchParams}
                  onChange={go}
                />
              ))}
            </div>
          ) : null}

          <div className={styles.results}>
            <p className={styles.showing} aria-live="polite">
              {total === 0
                ? 'No products match these filters'
                : pagination && pagination.pageCount > 1
                  ? `Showing ${pagination.from}–${pagination.to} of ${total} products`
                  : `Showing ${total} product${total === 1 ? '' : 's'}`}
            </p>

            {count === 0 ? (
              hasActiveFilters ? (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => go(clearFilters(searchParams))}
                >
                  Clear filters
                </button>
              ) : null
            ) : (
              <>
                <div className={styles.grid}>
                  {products.nodes.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      loading={index < 4 ? 'eager' : 'lazy'}
                    />
                  ))}
                </div>

                <Pager pagination={pagination} searchParams={searchParams} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One collapsible filter group.
 *
 * A <button> header rather than a <fieldset>/<legend>: the comp draws a caret,
 * so the group is collapsible and needs a real control. It also sidesteps the
 * legend layout quirk — a legend is positioned by the UA rather than flowing
 * normally, which was adding 32px of unasked-for space above every value list.
 *
 * Open by default. A filter nobody can see is a filter nobody uses.
 *
 * @param {{facet: object, searchParams: URLSearchParams, onChange: Function}} props
 */
function Facet({facet, searchParams, onChange}) {
  const [open, setOpen] = useState(true);
  const panelId = useId();

  return (
    <div className={styles.facet}>
      <button
        type="button"
        className={styles.facetToggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{facet.label}</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>

      <div id={panelId} hidden={!open}>
        {/*
          A price facet is a RANGE, not a set of choices. Shopify returns it as
          one value carrying the bounds, so rendering it like the others
          produced a checkbox labelled "Price (0)".
        */}
        {facet.type === 'PRICE_RANGE' ? (
          <PriceFacet
            facet={facet}
            searchParams={searchParams}
            onApply={onChange}
          />
        ) : (
          <ul className={styles.facetValues}>
            {facet.values.map((value) => (
              <li key={value.id}>
                <label className={styles.option}>
                  {/* A real checkbox, restyled. The comp draws these as
                      buttons, which loses the checked state for assistive tech
                      and the space-bar toggle. */}
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isFilterActive(searchParams, value.input)}
                    onChange={() =>
                      onChange(toggleFilter(searchParams, value.input))
                    }
                  />
                  <span className={styles.optionLabel}>{value.label}</span>
                  {/* Counts are Shopify's, for the current selection — not a
                      tally of what happens to be on this page. */}
                  <span className={styles.count}>({value.count})</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Min/max inputs for a PRICE_RANGE facet.
 *
 * Bounds come from Shopify's own filter input, so the placeholders show the
 * real range of the current result set rather than invented numbers. Applied on
 * submit rather than on every keystroke — each change is a server round trip,
 * and filtering on a half-typed number is noise.
 *
 * @param {{facet: object, searchParams: URLSearchParams, onApply: Function}} props
 */
function PriceFacet({facet, searchParams, onApply}) {
  const bounds = readPriceBounds(facet.values?.[0]?.input);
  const active = readActivePrice(searchParams);

  const [min, setMin] = useState(active.min ?? '');
  const [max, setMax] = useState(active.max ?? '');

  return (
    <div className={styles.priceRange} role="group" aria-label="Filter by price">
      <div className={styles.priceInputs}>
        <input
          type="number"
          className={styles.priceInput}
          inputMode="decimal"
          min={bounds.min}
          max={bounds.max}
          placeholder={
            bounds.min != null ? String(Math.floor(bounds.min)) : 'Min'
          }
          aria-label="Minimum price"
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <span className={styles.priceDash} aria-hidden="true">
          –
        </span>
        <input
          type="number"
          className={styles.priceInput}
          inputMode="decimal"
          min={bounds.min}
          max={bounds.max}
          placeholder={
            bounds.max != null ? String(Math.ceil(bounds.max)) : 'Max'
          }
          aria-label="Maximum price"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <button
        type="button"
        className={styles.priceApply}
        onClick={() => onApply(setPriceRange(searchParams, min, max))}
      >
        Apply
      </button>
    </div>
  );
}

/** @param {string | undefined} input */
function readPriceBounds(input) {
  try {
    const price = JSON.parse(input)?.price ?? {};
    return {min: price.min, max: price.max};
  } catch {
    return {min: undefined, max: undefined};
  }
}

/** @param {URLSearchParams} searchParams */
function readActivePrice(searchParams) {
  for (const raw of searchParams.getAll(FILTER_PARAM)) {
    try {
      const price = JSON.parse(raw)?.price;
      if (price) return {min: price.min ?? '', max: price.max ?? ''};
    } catch {
      // ignore
    }
  }
  return {min: undefined, max: undefined};
}

/**
 * @param {{product: object, loading?: 'eager' | 'lazy'}} props
 */
function ProductCard({product, loading}) {
  const image = product.featuredImage;
  const price = product.priceRange?.minVariantPrice;
  const max = product.priceRange?.maxVariantPrice;
  const hasRange = Boolean(price && max && price.amount !== max.amount);
  const href = `/products/${product.handle}`;

  return (
    <div className={styles.card}>
      <Link to={href} prefetch="intent" className={styles.cardMedia}>
        {image ? (
          <Image
            data={image}
            /* Hydrogen's Image writes aspectRatio as an INLINE style, which
               beats the stylesheet — the ratio has to be set here, not in
               ProductFeed.module.css. */
            aspectRatio="4/3"
            sizes="(min-width: 1100px) 350px, (min-width: 700px) 45vw, 90vw"
            className={styles.cardImage}
            loading={loading}
            alt={image.altText || product.title}
          />
        ) : null}
      </Link>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link to={href} prefetch="intent" className={styles.cardTitleLink}>
            {product.title}
          </Link>
        </h3>

        <p className={styles.cardPrice}>
          {hasRange ? <span className={styles.from}>From </span> : null}
          <Money data={price} withoutTrailingZeros as="span" />
        </p>

        {/*
          Straight to the product page rather than an add-to-cart button.
          A listing cannot add a multi-variant product to a cart without asking
          which variant, and this catalogue has products with dozens — one has
          sixty. A button that works on some cards and not others is worse than
          a consistent link.
        */}
        <Link to={href} prefetch="intent" className={styles.cardCta}>
          View product
        </Link>
      </div>
    </div>
  );
}

/**
 * Numbered pagination — styleguide §07, "the current page fills navy".
 *
 * Real <Link>s, not buttons: a page is a distinct URL, so it should be
 * middle-clickable, shareable and crawlable. That is the whole reason the
 * loader fetches the collection in one go — Shopify's cursors cannot produce a
 * link you can paste.
 *
 * Every page is listed. With a ceiling of 250 products and a page size of 12
 * that is at most 21 links, and this store's largest collection makes two — so
 * the ellipsis logic a generic paginator ships would be dead code.
 *
 * @param {{
 *   pagination?: {page: number, pageCount: number},
 *   searchParams: URLSearchParams,
 * }} props
 */
function Pager({pagination, searchParams}) {
  if (!pagination || pagination.pageCount <= 1) return null;

  const {page, pageCount} = pagination;

  /* Sort and filters have to survive a page change — only `page` is replaced. */
  const hrefFor = (n) => {
    const next = new URLSearchParams(searchParams);
    if (n <= 1) next.delete('page');
    else next.set('page', String(n));
    /*
     * The fragment is what stops a page change jumping to the masthead.
     * <ScrollRestoration> in root.jsx scrolls to the element whose id matches,
     * so the visitor lands on the feed with the heading and sort in view rather
     * than having to scroll back down past the hero every time.
     */
    const qs = next.toString();
    return `${qs ? `?${qs}` : ''}#${FEED_ANCHOR}`;
  };

  const pages = Array.from({length: pageCount}, (_, i) => i + 1);

  return (
    <nav className={styles.pager} aria-label="Pagination">
      {page > 1 ? (
        <Link className={styles.pagerStep} to={hrefFor(page - 1)} rel="prev">
          <span aria-hidden="true">‹</span> Prev
        </Link>
      ) : (
        <span className={`${styles.pagerStep} ${styles.pagerStepDisabled}`}>
          <span aria-hidden="true">‹</span> Prev
        </span>
      )}

      <ol className={styles.pagerPages}>
        {pages.map((n) => (
          <li key={n}>
            {n === page ? (
              /*
                The current page is not a link to itself. aria-current is what
                tells a screen reader which one it is — the navy fill only says
                it to people who can see it.
              */
              <span
                className={`${styles.pagerPage} ${styles.pagerPageCurrent}`}
                aria-current="page"
              >
                {n}
              </span>
            ) : (
              <Link
                className={styles.pagerPage}
                to={hrefFor(n)}
                aria-label={`Page ${n}`}
              >
                {n}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {page < pageCount ? (
        <Link className={styles.pagerStep} to={hrefFor(page + 1)} rel="next">
          Next <span aria-hidden="true">›</span>
        </Link>
      ) : (
        <span className={`${styles.pagerStep} ${styles.pagerStepDisabled}`}>
          Next <span aria-hidden="true">›</span>
        </span>
      )}
    </nav>
  );
}

