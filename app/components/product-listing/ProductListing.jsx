import {useId, useState} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {
  FILTER_PARAM,
  isFilterActive,
  toggleFilter,
  clearFilters,
  setPriceRange,
  removeFilter,
  activeFilterLabels,
} from '~/lib/collection-filters';
import {useProductPath} from '~/lib/product-urls';
import {sharpImageProps} from '~/lib/image';
import styles from './ProductListing.module.css';

/**
 * The pieces of a filtered, sorted, paginated product grid, shared by the
 * Product Feed module (collection pages) and the /search page.
 *
 * Split out of ProductFeed.jsx when search needed the same grid. Two copies of
 * the card, the filter rail and the pager would have drifted the first time
 * either was touched — the hover states on this site already did exactly that
 * once, between buttons that were meant to be the same.
 *
 * Nothing here fetches or owns state beyond a collapse toggle. The URL is the
 * source of truth: every control hands a new URLSearchParams to `onChange`,
 * and the page navigates, so the loader re-runs and Shopify recomputes the
 * facet counts.
 */

/**
 * A real <select>, not a custom dropdown. It is a single-choice control that
 * reloads the page — the native one is keyboard accessible, works before
 * hydration, and on mobile opens the platform picker.
 *
 * @param {{
 *   options: Array<{value: string, label: string}>,
 *   value?: string,
 *   onChange: (value: string) => void,
 * }} props
 */
export function SortSelect({options, value, onChange}) {
  const id = useId();

  return (
    <div className={styles.sort}>
      <label className={styles.sortLabel} htmlFor={id}>
        Sort by
      </label>
      <select
        id={id}
        className={styles.sortSelect}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * The rail and the results column side by side. Collapses to one column at
 * tablet, where the rail sits above the grid.
 *
 * @param {{rail?: React.ReactNode, children: React.ReactNode}} props
 */
export function ListingLayout({rail, children}) {
  return (
    <div className={`${styles.layout} ${rail ? '' : styles.layoutNoRail}`}>
      {rail}
      <div className={styles.results}>{children}</div>
    </div>
  );
}

/**
 * The filter rail.
 *
 * A labelled region, NOT an <aside>. app.css styles bare `aside` for the
 * off-canvas drawers — fixed, 100vh, 400px wide — so using one here silently
 * gave the rail the cart drawer's width and made it overlap the grid.
 *
 * The UI is deliberately generic: it renders whatever facets Shopify returns
 * rather than modelling any particular one. Today that is Availability and
 * Price; if the Search & Discovery app is configured later, product-type and
 * metafield facets appear here with no code change.
 *
 * @param {{
 *   facets: Array<object>,
 *   searchParams: URLSearchParams,
 *   onChange: (next: URLSearchParams) => void,
 * }} props
 */
export function FilterRail({facets, searchParams, onChange}) {
  const hasActiveFilters = searchParams.getAll(FILTER_PARAM).length > 0;

  return (
    <div className={styles.rail} role="region" aria-label="Filters">
      <div className={styles.railHead}>
        <h3 className={styles.railTitle}>Filters</h3>
        {/* Always present, not only when something is active, so the rail
            does not reflow on the first click. Disabled rather than hidden
            when there is nothing to clear. */}
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange(clearFilters(searchParams))}
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
          onChange={onChange}
        />
      ))}
    </div>
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
 * Removable filter chips — styleguide §07.
 *
 * The rail already shows what is ticked, but on a phone the rail is above the
 * grid and scrolled out of sight, and a price range is two numbers in small
 * inputs. The chips restate every active filter right where the results are,
 * each with one-tap removal. Renders nothing when no filter is on.
 *
 * @param {{
 *   facets: Array<object>,
 *   searchParams: URLSearchParams,
 *   onChange: (next: URLSearchParams) => void,
 * }} props
 */
export function ActiveFilters({facets, searchParams, onChange}) {
  const chips = activeFilterLabels(facets, searchParams);
  if (chips.length === 0) return null;

  return (
    <div className={styles.chips}>
      <ul className={styles.chipList} role="list" aria-label="Active filters">
        {chips.map((chip) => (
          <li key={chip.raw}>
            <button
              type="button"
              className={styles.chip}
              onClick={() => onChange(removeFilter(searchParams, chip.raw))}
              aria-label={`Remove filter: ${chip.label}`}
            >
              <span>{chip.label}</span>
              <svg
                className={styles.chipIcon}
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {chips.length > 1 ? (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange(clearFilters(searchParams))}
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

/**
 * "Showing 13–24 of 55 products". aria-live so a screen reader hears the new
 * count after a filter changes, which is otherwise silent.
 *
 * `total` is the count across ALL pages, not this page's slice — reading the
 * slice announced "Showing 12 products" while the listing held 24.
 *
 * @param {{
 *   total: number,
 *   pagination?: {pageCount: number, from: number, to: number},
 *   emptyText?: string,
 * }} props
 */
export function ResultsSummary({total, pagination, emptyText}) {
  return (
    <p className={styles.showing} aria-live="polite">
      {total === 0
        ? (emptyText ?? 'No products match these filters')
        : pagination && pagination.pageCount > 1
          ? `Showing ${pagination.from}–${pagination.to} of ${total} products`
          : `Showing ${total} product${total === 1 ? '' : 's'}`}
    </p>
  );
}

/**
 * @param {{
 *   products: Array<object>,
 *   hrefFor?: (product: object, index: number) => string,
 * }} props
 */
export function ProductGrid({products, hrefFor}) {
  return (
    <div className={styles.grid}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          href={hrefFor?.(product, index)}
          loading={index < 4 ? 'eager' : 'lazy'}
        />
      ))}
    </div>
  );
}

/**
 * @param {{product: object, href?: string, loading?: 'eager' | 'lazy'}} props
 */
export function ProductCard({product, href: hrefOverride, loading}) {
  const image = product.featuredImage;
  const price = product.priceRange?.minVariantPrice;
  const max = product.priceRange?.maxVariantPrice;
  const hasRange = Boolean(price && max && price.amount !== max.amount);
  // Where the product lives: /collections/{c}/{p} or /products/{p}.
  const pathFor = useProductPath();
  const href = hrefOverride ?? pathFor(product.handle);
  // The meta description, written short and per product in the admin.
  const blurb = product.seo?.description?.trim() || '';

  return (
    <div className={styles.card}>
      <Link to={href} prefetch="intent" className={styles.cardMedia}>
        {image ? (
          <Image
            data={image}
            /* The 4:3 frame goes in `style`, NOT the aspectRatio prop: the
               prop also tells Shopify's CDN to crop the file to 4:3, which
               cut the top and bottom off square photos — no object-fit can
               bring those pixels back. Hydrogen writes its own ratio as an
               inline style, so only an inline style overrides it. */
            style={{aspectRatio: '4 / 3'}}
            sizes="(min-width: 1100px) 350px, (min-width: 700px) 45vw, 90vw"
            className={styles.cardImage}
            loading={loading}
            alt={image.altText || product.title}
            // Small uploads served whole and untouched — see lib/image.js.
            {...sharpImageProps(image)}
          />
        ) : null}
      </Link>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link to={href} prefetch="intent" className={styles.cardTitleLink}>
            {product.title}
          </Link>
        </h3>

        {blurb ? <p className={styles.cardBlurb}>{blurb}</p> : null}

        {/* Pinned to the card's foot, so the price and button sit at the
            same height across a row whatever the titles and blurbs do. */}
        <div className={styles.cardFoot}>
          {price ? (
            <p className={styles.cardPrice}>
              {hasRange ? <span className={styles.from}>From </span> : null}
              <Money data={price} withoutTrailingZeros as="span" />
            </p>
          ) : null}

          {/*
            Straight to the product page rather than an add-to-cart button.
            A listing cannot add a multi-variant product to a cart without
            asking which variant, and this catalogue has products with dozens
            — one has sixty. A button that works on some cards and not others
            is worse than a consistent link.
          */}
          <Link to={href} prefetch="intent" className={`btn btn--secondary ${styles.cardCta}`}>
            View product
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Numbered pagination — styleguide §07, "the current page fills navy".
 *
 * Real <Link>s, not buttons: a page is a distinct URL, so it should be
 * middle-clickable, shareable and crawlable. That is the whole reason the
 * loaders fetch the result set in one go — Shopify's cursors cannot produce a
 * link you can paste.
 *
 * Every page is listed. With a ceiling of 250 products and a page size of 12
 * that is at most 21 links, and this store's largest listing makes eight — so
 * the ellipsis logic a generic paginator ships would be dead code.
 *
 * @param {{
 *   pagination?: {page: number, pageCount: number},
 *   searchParams: URLSearchParams,
 *   anchor: string,
 * }} props
 */
export function Pager({pagination, searchParams, anchor}) {
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
     * so the visitor lands on the listing with its heading and sort in view
     * rather than having to scroll back down past the hero every time.
     */
    const qs = next.toString();
    return `${qs ? `?${qs}` : ''}#${anchor}`;
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
