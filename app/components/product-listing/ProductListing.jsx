import {forwardRef, useCallback, useId, useRef, useState} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {
  FILTER_PARAM,
  isFilterActive,
  toggleFilter,
  clearFilters,
  removeFilter,
  activeFilterLabels,
} from '~/lib/collection-filters';
import {useProductPath} from '~/lib/product-urls';
import {sharpImageProps} from '~/lib/image';
import {useTrackId} from '~/lib/tracking';
import {useIsomorphicLayoutEffect} from '~/lib/use-isomorphic-layout-effect';
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
 * Moves focus once a filter change has rendered.
 *
 * Removing a chip or pressing a Clear button navigates, and by the time the
 * new results render the pressed control has often gone (a chip, the
 * empty-state button) or been disabled (the rail's Clear all) — which drops
 * keyboard and screen-reader users to <body>. Call the returned function in
 * the click handler with a getter for where focus should land; it runs once
 * the URL has changed and the new controls exist.
 *
 * @param {URLSearchParams} searchParams
 * @returns {(getTarget: () => HTMLElement | null | undefined) => void}
 */
export function useFocusAfterChange(searchParams) {
  const pendingRef = useRef(
    /** @type {null | (() => HTMLElement | null | undefined)} */ (null),
  );
  const key = searchParams.toString();

  // A layout effect, so focus moves in the same commit that removed the
  // control rather than a frame later.
  useIsomorphicLayoutEffect(() => {
    const getTarget = pendingRef.current;
    if (!getTarget) return;
    pendingRef.current = null;
    getTarget()?.focus();
  }, [key]);

  return useCallback((getTarget) => {
    pendingRef.current = getTarget;
  }, []);
}

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
  const trackId = useTrackId();

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
        data-track-id={trackId('sort')}
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
 * The UI is deliberately generic: it renders whatever facets it is given
 * rather than modelling any particular one (price is left out upstream, by
 * visibleFacets in lib/collection-filters.js). If the Search & Discovery app
 * is configured later, product-type and metafield facets appear here with no
 * code change.
 *
 * @param {{
 *   facets: Array<object>,
 *   searchParams: URLSearchParams,
 *   onChange: (next: URLSearchParams) => void,
 * }} props
 */
export function FilterRail({facets, searchParams, onChange}) {
  const trackId = useTrackId();
  const hasActiveFilters = searchParams.getAll(FILTER_PARAM).length > 0;
  const railRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const focusAfterChange = useFocusAfterChange(searchParams);

  return (
    <div
      ref={railRef}
      className={styles.rail}
      role="region"
      aria-label="Filters"
    >
      <div className={styles.railHead}>
        <h3 className={styles.railTitle}>Filters</h3>
        {/* Always present, not only when something is active, so the rail
            does not reflow on the first click. Disabled rather than hidden
            when there is nothing to clear — and a disabled button loses
            focus, so it hands focus on to the first filter group. */}
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            focusAfterChange(() =>
              railRef.current?.querySelector(`.${styles.facetToggle}`),
            );
            onChange(clearFilters(searchParams));
          }}
          disabled={!hasActiveFilters}
          data-track-id={trackId('clear-filters')}
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
  const toggleId = useId();
  const trackId = useTrackId();

  return (
    <div className={styles.facet}>
      <button
        type="button"
        id={toggleId}
        className={styles.facetToggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        data-track-id={trackId(`facet-${facet.label}-toggle`)}
      >
        <span>{facet.label}</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>

      {/* A group named by the toggle, so each checkbox is read with its
          facet — "Availability, In stock (12)" — not just "In stock (12)". */}
      <div
        id={panelId}
        role="group"
        aria-labelledby={toggleId}
        hidden={!open}
      >
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
                  /* Shopify's facet and value names, not CMS copy:
                     filter-availability-in-stock. */
                  data-track-id={trackId(
                    `filter-${facet.label}-${value.label}`,
                  )}
                />
                <span className={styles.optionLabel}>{value.label}</span>
                {/* Counts are Shopify's, for the current selection — not a
                    tally of what happens to be on this page. */}
                <span className={styles.count}>({value.count})</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Removable filter chips — styleguide §07.
 *
 * The rail already shows what is ticked, but on a phone the rail is above the
 * grid and scrolled out of sight. The chips restate every active filter right where the results are,
 * each with one-tap removal. Renders nothing when no filter is on.
 *
 * A chip takes itself away when pressed, so focus moves on: to the next chip,
 * the previous one when it was the last, or — with none left — to
 * `summaryRef`, the results count.
 *
 * @param {{
 *   facets: Array<object>,
 *   searchParams: URLSearchParams,
 *   onChange: (next: URLSearchParams) => void,
 *   summaryRef?: import('react').RefObject<HTMLElement>,
 * }} props
 */
export function ActiveFilters({facets, searchParams, onChange, summaryRef}) {
  const trackId = useTrackId();
  const focusAfterChange = useFocusAfterChange(searchParams);
  // The chip buttons by filter, to find the neighbour once the list re-renders.
  const chipRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const chips = activeFilterLabels(facets, searchParams);
  if (chips.length === 0) return null;

  /** @param {string | undefined} raw */
  const focusChipOrSummary = (raw) =>
    focusAfterChange(() => {
      const chip = raw ? chipRefs.current.get(raw) : null;
      return chip?.isConnected ? chip : summaryRef?.current;
    });

  return (
    <div className={styles.chips}>
      <ul className={styles.chipList} role="list" aria-label="Active filters">
        {chips.map((chip, index) => (
          <li key={chip.raw}>
            <button
              ref={(el) => {
                if (el) chipRefs.current.set(chip.raw, el);
                else chipRefs.current.delete(chip.raw);
              }}
              type="button"
              className={styles.chip}
              onClick={() => {
                const neighbour = chips[index + 1] ?? chips[index - 1];
                focusChipOrSummary(neighbour?.raw);
                onChange(removeFilter(searchParams, chip.raw));
              }}
              aria-label={`Remove filter: ${chip.label}`}
              /* chip.label is "Facet: Value", so this slugs to the same
                 pair as the rail's checkbox: remove-filter-availability-in-stock. */
              data-track-id={trackId(`remove-filter-${chip.label}`)}
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
          onClick={() => {
            focusChipOrSummary(undefined);
            onChange(clearFilters(searchParams));
          }}
          data-track-id={trackId('clear-filters-chips')}
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
 * Focusable from script (tabIndex -1, never in the Tab order): focus lands
 * here when the filter control that had it removes itself.
 */
export const ResultsSummary = forwardRef(
  /**
   * @param {{
   *   total: number,
   *   pagination?: {pageCount: number, from: number, to: number},
   *   emptyText?: string,
   * }} props
   * @param {import('react').ForwardedRef<HTMLParagraphElement>} ref
   */
  function ResultsSummary({total, pagination, emptyText}, ref) {
    return (
      <p
        ref={ref}
        className={styles.showing}
        aria-live="polite"
        tabIndex={-1}
      >
        {total === 0
          ? (emptyText ?? 'No products match these filters')
          : pagination && pagination.pageCount > 1
            ? `Showing ${pagination.from}–${pagination.to} of ${total} products`
            : `Showing ${total} product${total === 1 ? '' : 's'}`}
      </p>
    );
  },
);

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
  // Three links to the same page — title, image, button — told apart by role.
  const trackId = useTrackId();
  const trackRole = `product-${product.handle}`;

  return (
    <div className={styles.card}>
      {/*
        The image is a click target for the mouse and touch only — out of the
        Tab order and hidden from screen readers, with an empty alt. Otherwise
        every card was three stops and read its name twice; the title and the
        button already reach the same page.
      */}
      <Link
        to={href}
        prefetch="intent"
        className={styles.cardMedia}
        tabIndex={-1}
        aria-hidden="true"
        data-track-id={trackId(`${trackRole}-image`)}
      >
        {image ? (
          <Image
            /* altText cleared: Hydrogen's Image swaps an empty alt for it,
               and the title beside it already names the product. */
            data={{...image, altText: null}}
            /* The 4:3 frame goes in `style`, NOT the aspectRatio prop: the
               prop also tells Shopify's CDN to crop the file to 4:3, which
               cut the top and bottom off square photos — no object-fit can
               bring those pixels back. Hydrogen writes its own ratio as an
               inline style, so only an inline style overrides it. */
            style={{aspectRatio: '4 / 3'}}
            sizes="(min-width: 1100px) 350px, (min-width: 700px) 45vw, 90vw"
            className={styles.cardImage}
            loading={loading}
            alt=""
            // Small uploads served whole and untouched — see lib/image.js.
            {...sharpImageProps(image)}
          />
        ) : null}
      </Link>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link
            to={href}
            prefetch="intent"
            className={styles.cardTitleLink}
            data-track-id={trackId(trackRole)}
          >
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
          <Link
            to={href}
            prefetch="intent"
            className={`btn btn--secondary ${styles.cardCta}`}
            data-track-id={trackId(`${trackRole}-view`)}
          >
            {/* Named, so a links list isn't twelve identical "View product"s. */}
            View product<span className="sr-only"> {product.title}</span>
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
  const trackId = useTrackId();
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
        <Link
          className={styles.pagerStep}
          to={hrefFor(page - 1)}
          rel="prev"
          data-track-id={trackId('prev-page')}
        >
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
                data-track-id={trackId(`page-${n}`)}
              >
                {n}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {page < pageCount ? (
        <Link
          className={styles.pagerStep}
          to={hrefFor(page + 1)}
          rel="next"
          data-track-id={trackId('next-page')}
        >
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
