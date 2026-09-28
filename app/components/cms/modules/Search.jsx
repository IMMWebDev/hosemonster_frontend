import {Link, useNavigate, useSearchParams} from 'react-router';
import {strapiMedia} from '~/lib/strapi-media';
import SearchChips from '~/components/search/SearchChips';
import SearchBox from '~/components/search/SearchBox';
import {
  SortSelect,
  ListingLayout,
  FilterRail,
  ActiveFilters,
  ResultsSummary,
  ProductGrid,
  Pager,
} from '~/components/product-listing/ProductListing';
import {
  FILTER_PARAM,
  SEARCH_SORT_OPTIONS,
  clearFilters,
  withSort,
} from '~/lib/collection-filters';
import {
  CONTACT_PATH,
  SEARCH_PLACEHOLDER,
  urlWithTrackingParams,
} from '~/lib/search';
import {useProductPath} from '~/lib/product-urls';
import styles from './Search.module.css';

/** Anchor the pager scrolls to — see the results <section>. */
const RESULTS_ANCHOR = 'results';

/**
 * Search module — the /search page's results, placed on the Strapi Page whose
 * path is /search so editors can put other modules around it.
 *
 * The CMS sets the copy and the picture: `eyebrow` and `heading`, both always
 * shown, and `backgroundImage` behind them. After a search, a results line
 * under the box says what was found — the heading stays the editor's. The top of the module is laid
 * out as Hero Search is — full-bleed navy panel, photo, left-to-right scrim,
 * copy and search box on the left — so the shop's two search surfaces read as
 * one family. The
 * search itself is run by the /search route's loader and arrives as the
 * `search` prop, the same way Product Feed receives its collection. Anywhere
 * else there is no `search` prop, so the module renders nothing rather than an
 * empty search box that goes nowhere useful.
 *
 * No comp exists for this page; it is assembled from the styleguide and the
 * pieces already built for collection pages, following Baymard's ecommerce
 * search research:
 *
 *  - The query stays in an editable box, with a line directly under it saying
 *    what it found ("55 products and 1 page for “gauge”"), so the visitor can
 *    see what was searched and refine it without starting over. That is where
 *    Amazon and Google put it: between the box that holds the query and the
 *    results it produced.
 *  - Matching categories and CMS pages sit above the products. "Gauges" should
 *    offer the Gauges category as well as fifty gauges, and "fire flow
 *    software" is looking for a page, not a product.
 *  - The product grid is the collection page's, filters and pager included —
 *    one set of controls to learn across the shop.
 *  - A search that finds nothing is never a dead end: categories and a link
 *    to the contact page. Baymard found half of major sites fail this.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     backgroundImage?: {url?: string},
 *   },
 *   search?: object,
 *   baseUrl?: string,
 * }} props - `search` is the /search loader's regular-search payload
 */
export default function Search({data, search, baseUrl}) {
  // Hooks before the early return, so the hook order never changes.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pathFor = useProductPath();

  if (!search) return null;

  const {
    term,
    products,
    collections = [],
    pages = [],
    articles = [],
    pagination,
    activeSort,
    browseCollections = [],
    error,
  } = search;

  /*
   * Defaults, not hardcoded copy: Strapi applies field defaults on CREATE
   * only, and the route injects this module with no data at all when the CMS
   * page is missing — see routes/search.jsx.
   */
  const eyebrow = data?.eyebrow || 'Search';
  const heading = data?.heading || 'What are you looking for?';
  const backgroundUrl = strapiMedia(data?.backgroundImage?.url, baseUrl);

  const go = (next) =>
    navigate(`?${next.toString()}`, {preventScrollReset: true});

  const hasFilters = searchParams.getAll(FILTER_PARAM).length > 0;
  const productTotal = products?.total ?? 0;
  const facets = (products?.filters ?? []).filter(
    (f) => (f.values ?? []).length > 0,
  );
  /*
   * Not on error: products is null then, and the listing would say "No
   * products match these filters" — blaming the filters for an outage.
   */
  const showListing =
    Boolean(term) && !error && (productTotal > 0 || hasFilters);
  const relatedCount = collections.length + pages.length + articles.length;
  const nothingFound =
    Boolean(term) && !error && !showListing && relatedCount === 0;

  return (
    <div className={styles.page}>
      {/*
        The panel — Hero Search's layout. Only the copy and the box live on the
        photo; the category and page chips sit on white below it, where they
        stay readable whatever picture an editor chooses.
      */}
      <section className={styles.hero}>
        <div className={styles.panel}>
          {backgroundUrl ? (
            /*
             * Parallax on the WRAPPER, never on the <img> that carries the
             * reveal — a CSS animation overrides a transition on the same
             * property, so one element with both loses its reveal. Same
             * structure as Hero Search.
             */
            <div className={styles.background} data-parallax>
              <img
                src={backgroundUrl}
                /* Decorative: the heading carries the meaning. */
                alt=""
                className={styles.backgroundImage}
                data-reveal="zoom"
                /* The top of the page, so the likely LCP element: eager and
                   high priority, as on Hero Search. */
                loading="eager"
                /* Lowercase on purpose — React 18 drops camelCase
                   fetchPriority. */
                // eslint-disable-next-line react/no-unknown-property
                fetchpriority="high"
                decoding="async"
              />
            </div>
          ) : null}
          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.panelInner}>
            <div className={styles.copy}>
              <p
                className={styles.eyebrow}
                data-reveal
                style={{'--reveal-i': 0}}
              >
                {eyebrow}
              </p>

              <h1
                className={styles.heading}
                data-reveal="focus"
                style={{'--reveal-i': 1}}
              >
                {heading}
              </h1>

              <div
                className={styles.searchWrap}
                data-reveal
                style={{'--reveal-i': 3}}
              >
                {/*
                  Not keyed by the term: SearchBox resyncs itself on every
                  navigation, and remounting it threw focus to <body> after
                  each search made from it.

                  Submitting drops the sort, filters and page on purpose: they
                  belonged to the previous query, and "Price: high to low, in
                  stock only" carried over to a new search would hide results
                  for reasons the visitor never chose.

                  No autofocus, deliberately. React server-renders autoFocus
                  as the native attribute, which the browser acts on while
                  still parsing — before the stylesheet has laid the page out.
                  In dev that scrolled to where the box sat in the unstyled
                  page, then the styles collapsed it and left the visitor at
                  the bottom.
                */}
                <SearchBox
                  defaultValue={term}
                  placeholder={SEARCH_PLACEHOLDER}
                  showIcon
                  classNames={{
                    form: styles.search,
                    input: styles.searchInput,
                    button: styles.searchButton,
                    icon: styles.searchIcon,
                  }}
                />
              </div>

              {/*
                What the search found, right under the box that holds it — or,
                before a search, what can be searched for. Always one line, so
                the panel is the same height before and after a search instead
                of jumping when the first results arrive.

                Always mounted, so it can take part in the reveal: it used to
                mount only with a term, and a search made FROM /search (query
                string only, no pathname change) never had useReveal see it.
              */}
              <p
                className={styles.resultsFor}
                data-reveal
                style={{'--reveal-i': 4}}
              >
                {term && !error ? (
                  <>
                    {describeResults({
                      productTotal,
                      collections,
                      pages,
                      articles,
                    })}{' '}
                    <strong className={styles.term}>“{term}”</strong>
                  </>
                ) : (
                  'Search by product name, category, or part number.'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {relatedCount > 0 ? (
        <section className={styles.relatedSection}>
          <div className={`${styles.inner} ${styles.related}`}>
            {collections.length > 0 ? (
              <RelatedGroup label="Categories">
                <SearchChips
                  label="Matching categories"
                  items={collections.map((c) => ({
                    key: c.id,
                    label: c.title,
                    to: urlWithTrackingParams({
                      baseUrl: `/collections/${c.handle}`,
                      trackingParams: c.trackingParameters,
                      term,
                    }),
                  }))}
                />
              </RelatedGroup>
            ) : null}

            {pages.length > 0 ? (
              <RelatedGroup label="Pages">
                <SearchChips
                  label="Matching pages"
                  items={pages.map((p) => ({
                    key: p.id,
                    label: p.title,
                    to: p.url,
                  }))}
                />
              </RelatedGroup>
            ) : null}

            {articles.length > 0 ? (
              <RelatedGroup label="Articles">
                <SearchChips
                  label="Matching articles"
                  items={articles.map((a) => ({
                    key: a.id,
                    label: a.title,
                    to: a.url,
                  }))}
                />
              </RelatedGroup>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <section className={styles.section}>
          <div className={styles.inner}>
            <p className={styles.error} role="alert">
              {error}
            </p>
          </div>
        </section>
      ) : null}

      {showListing ? (
        /*
         * A stable id: the pager's links end in #results so a page change lands
         * on the grid rather than back at the search box.
         */
        <section className={styles.section} id={RESULTS_ANCHOR}>
          <div className={styles.inner}>
            <div className={styles.head}>
              <h2 className={styles.sectionHeading}>Products</h2>
              <SortSelect
                options={SEARCH_SORT_OPTIONS}
                value={activeSort}
                onChange={(value) =>
                  go(withSort(searchParams, value, SEARCH_SORT_OPTIONS))
                }
              />
            </div>

            <ListingLayout
              rail={
                facets.length > 0 ? (
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
              />

              <ResultsSummary total={productTotal} pagination={pagination} />

              {productTotal === 0 ? (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => go(clearFilters(searchParams))}
                >
                  Clear filters
                </button>
              ) : (
                <>
                  <ProductGrid
                    products={products.nodes}
                    hrefFor={(product) =>
                      urlWithTrackingParams({
                        baseUrl: pathFor(product.handle),
                        trackingParams: product.trackingParameters,
                        term,
                      })
                    }
                  />
                  <Pager
                    pagination={pagination}
                    searchParams={searchParams}
                    anchor={RESULTS_ANCHOR}
                  />
                </>
              )}
            </ListingLayout>
          </div>
        </section>
      ) : null}

      {/*
        Pages or categories matched but no products did — "about us", say. The
        chips above are the answer; this just says so, rather than
        leaving a blank space where the grid would be.
      */}
      {term && !error && !showListing && relatedCount > 0 ? (
        <section className={styles.section}>
          <div className={styles.inner}>
            <p className={styles.note}>
              No products matched “{term}”, but the{' '}
              {relatedCount === 1 ? 'link' : 'links'} above did.
            </p>
          </div>
        </section>
      ) : null}

      {/*
        The empty page, a search that found nothing, and a failed search all
        get somewhere to go next. The loader fetches the categories for the
        failed case too.
      */}
      {nothingFound || !term || error ? (
        <Suggestions
          nothingFound={nothingFound}
          categories={browseCollections}
          showHelp={nothingFound || Boolean(error)}
        />
      ) : null}
    </div>
  );
}

/**
 * @param {{label: string, children: React.ReactNode}} props
 */
function RelatedGroup({label, children}) {
  return (
    <div className={styles.relatedGroup}>
      <p className={styles.relatedLabel}>{label}</p>
      {children}
    </div>
  );
}

/**
 * What to do next — on the empty page, and after a search that found nothing.
 *
 * @param {{
 *   nothingFound: boolean,
 *   categories: Array<{id: string, handle: string, title: string}>,
 *   showHelp: boolean,
 * }} props
 */
function Suggestions({nothingFound, categories, showHelp}) {
  const hasAnything = categories.length > 0;

  /*
   * Nothing to say — the category fetch came back empty and there's no help
   * line to show. Rendering the section anyway left 128px of blank white
   * under the panel.
   */
  if (!nothingFound && !hasAnything && !showHelp) return null;

  return (
    <section className={styles.section}>
      <div className={`${styles.inner} ${styles.suggestions}`}>
        {nothingFound ? (
          <div className={styles.noResults}>
            {/* The panel's results line already says "No results for …";
                this heading moves on to what to do about it. */}
            <h2 className={styles.sectionHeading}>Try another search</h2>
            <p className={styles.noResultsBody}>
              Check the spelling, try fewer words, or search by part number.
            </p>
          </div>
        ) : null}

        {hasAnything ? (
          <div className={styles.suggestionGrid}>
            {categories.length > 0 ? (
              <SuggestionGroup title="Shop by category">
                <SearchChips
                  label="Categories"
                  items={categories.map((c) => ({
                    key: c.id,
                    label: c.title,
                    to: `/collections/${c.handle}`,
                  }))}
                />
              </SuggestionGroup>
            ) : null}
          </div>
        ) : null}

        {showHelp ? (
          <p className={styles.help}>
            Can’t find what you need?{' '}
            <Link to={CONTACT_PATH} className={styles.helpLink}>
              Contact us
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * @param {{title: string, children: React.ReactNode}} props
 */
function SuggestionGroup({title, children}) {
  return (
    <div className={styles.suggestionGroup}>
      <h3 className={styles.groupTitle}>{title}</h3>
      {children}
    </div>
  );
}

/**
 * The lead-in to the results line: "55 products and 1 page for",
 * "1 product, 2 categories and 1 page for", or "No results for" — the term
 * follows it.
 *
 * @param {{productTotal: number, collections: any[], pages: any[], articles: any[]}} args
 */
function describeResults({productTotal, collections, pages, articles}) {
  const parts = [
    [productTotal, 'product', 'products'],
    [collections.length, 'category', 'categories'],
    [pages.length, 'page', 'pages'],
    [articles.length, 'article', 'articles'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);

  if (parts.length === 0) return 'No results for';

  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${list} for`;
}
