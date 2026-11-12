import {useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {
  FILTER_PARAM,
  SORT_OPTIONS,
  clearFilters,
  visibleFacets,
  withSort,
} from '~/lib/collection-filters';
import {
  SortSelect,
  ListingLayout,
  FilterRail,
  ActiveFilters,
  ResultsSummary,
  ProductGrid,
  Pager,
  useFocusAfterChange,
} from '~/components/product-listing/ProductListing';
// FEED_ANCHOR: the anchor the pager scrolls to — see the <section> and
// Pager's hrefFor(). Lives in tracking.js so no Tracking ID can claim it.
import {FEED_ANCHOR, useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './ProductFeed.module.css';

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
 * The grid, rail, chips and pager are shared with /search — see
 * ~/components/product-listing/ProductListing.jsx.
 *
 * @param {{
 *   data: {heading?: string, showFilters?: boolean, showSort?: boolean},
 *   collection?: object,
 *   activeSort?: string,
 *   pagination?: {page: number, pageCount: number, total: number, from: number, to: number},
 * }} props
 */
export default function ProductFeed({data, collection, activeSort, pagination}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const {heading, showFilters = true, showSort = true} = data ?? {};
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Where focus goes when the control that had it clears the last filter.
  const summaryRef = useRef(null);
  const focusAfterChange = useFocusAfterChange(searchParams);

  /*
   * Only meaningful on a Collections entry — the Shopify handle is what says
   * which products to show. Rendering the chrome with no products would look
   * like an outage rather than a misplaced module.
   */
  if (!collection?.products) return null;

  const products = collection.products;
  const facets = visibleFacets(products.filters);
  const hasActiveFilters = searchParams.getAll(FILTER_PARAM).length > 0;
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
    <section {...trackingRoot} className={styles.section} id={FEED_ANCHOR}>
      <div className={styles.inner}>
        <div className={styles.head}>
          {heading ? <h2 className={styles.heading}>{heading}</h2> : null}

          {showSort ? (
            <SortSelect
              options={SORT_OPTIONS}
              value={activeSort}
              onChange={(value) => go(withSort(searchParams, value))}
            />
          ) : null}
        </div>

        <ListingLayout
          rail={
            showFilters && facets.length > 0 ? (
              <FilterRail
                facets={facets}
                searchParams={searchParams}
                onChange={go}
              />
            ) : null
          }
        >
          <ActiveFilters
            facets={facets}
            searchParams={searchParams}
            onChange={go}
            summaryRef={summaryRef}
          />

          <ResultsSummary
            ref={summaryRef}
            total={total}
            pagination={pagination}
          />

          {count === 0 ? (
            hasActiveFilters ? (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  // This button goes once the products are back.
                  focusAfterChange(() => summaryRef.current);
                  go(clearFilters(searchParams));
                }}
                data-track-id={trackId('clear-filters-empty')}
              >
                Clear filters
              </button>
            ) : null
          ) : (
            <>
              <ProductGrid products={products.nodes} />
              <Pager
                pagination={pagination}
                searchParams={searchParams}
                anchor={FEED_ANCHOR}
              />
            </>
          )}
        </ListingLayout>
      </div>
    </section>
  );
}
