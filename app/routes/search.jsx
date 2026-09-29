import {useLoaderData} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import BlockManager from '~/components/cms/BlockManager';
import {getModuleProducts} from '~/lib/module-products';
import {strapiMedia} from '~/lib/strapi-media';
import {SEARCH_PAGE_SIZE, urlWithTrackingParams} from '~/lib/search';
import {
  SEARCH_SORT_OPTIONS,
  sortFromSearchParams,
  collectionFilterHandles,
  collectionFilterInput,
  filtersFromSearchParams,
} from '~/lib/collection-filters';

/**
 * /search — the full results page, and the endpoint the quick-search panel
 * fetches from (`?predictive=1`).
 *
 * One route for both so there is one place that knows how to search: the
 * panel's suggestions and the page's results can never disagree about which
 * pages exist or which collections are linkable.
 *
 * The page itself is the Strapi Page whose path is /search, rendered through
 * BlockManager like any other CMS page, so editors can add modules around the
 * results. The results are run here and handed to module.search — the same
 * split as collection pages, where the route queries Shopify and Product Feed
 * renders what it is given. This route file wins over the $.jsx catch-all for
 * /search, which is why the CMS page is fetched here rather than there.
 */

/** Where the CMS page lives. Must match the Page's `path` in Strapi. */
const SEARCH_PAGE_PATH = '/search';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const term = data?.search?.term;
  const seo = data?.cmsPage?.seo;

  /*
   * With a term the title names it — that is what shows in the tab and the
   * history list. Without one, the CMS title.
   */
  const title = term
    ? `Search results for “${term}” | Hose Monster`
    : seo?.metaTitle || 'Search | Hose Monster';

  const tags = [{title}, {property: 'og:title', content: title}];

  if (seo?.metaDescription) {
    tags.push({name: 'description', content: seo.metaDescription});
    tags.push({property: 'og:description', content: seo.metaDescription});
  }
  if (seo?.metaImage?.url) {
    tags.push({
      property: 'og:image',
      content: strapiMedia(seo.metaImage.url, data?.strapiBaseUrl),
    });
  }

  /*
   * noindex, follow — ALWAYS, whatever the CMS page's preventIndexing says.
   * Google's guidance is to keep internal search results out of the index:
   * they are thin, near-duplicate pages generated from arbitrary input. The
   * crawler may still follow the product links on them.
   */
  tags.push({name: 'robots', content: 'noindex, follow'});

  return tags;
};

/**
 * Skip re-running search after a form POST — adding to the cart, above all.
 *
 * React Router revalidates every loaded fetcher after any action by default.
 * Every search box keeps its own type-ahead fetcher pointed at this loader, so
 * each cart change re-ran the predictive Storefront query, its count query and
 * the Strapi page search for every box that had been typed in, and re-ran the
 * full results page too. None of it depends on the cart.
 *
 * @param {{formMethod?: string, defaultShouldRevalidate: boolean}} args
 */
export function shouldRevalidate({formMethod, defaultShouldRevalidate}) {
  if (formMethod && formMethod.toUpperCase() !== 'GET') return false;
  return defaultShouldRevalidate;
}

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const url = new URL(request.url);

  /*
   * `predictive` is only honoured for the panel's background fetch. Someone who
   * opens a /search?predictive=1 URL in the tab (a copied link, a crawler)
   * gets the real results page instead of a suggestions payload rendered as
   * one — browsers mark a tab navigation with Sec-Fetch-Dest: document.
   */
  const isNavigation = request.headers.get('Sec-Fetch-Dest') === 'document';

  if (url.searchParams.has('predictive') && !isNavigation) {
    return predictiveSearch({url, context});
  }

  const [search, cms] = await Promise.all([
    regularSearch({url, context}),
    context.strapi.getPage(SEARCH_PAGE_PATH),
  ]);

  // Product Cards stores only handles; its Storefront lookup happens in the
  // route, as on every other CMS page.
  const products = await getModuleProducts({
    storefront: context.storefront,
    modules: cms.modules,
  });

  return {
    type: 'regular',
    search,
    cmsPage: cms.page,
    cmsModules: withSearchModule(cms.modules),
    products,
    strapiBaseUrl: context.env.STRAPI_API_URL,
    // Read by PageLayout via useMatches to decide whether the newsletter band
    // renders above the footer.
    includeNewsletter: cms.page?.includeNewsletter ?? null,
  };
}

export default function Search() {
  /** @type {LoaderReturnData} */
  const {search, cmsModules, products, strapiBaseUrl} = useLoaderData();

  return (
    <>
      <BlockManager
        blocks={cmsModules}
        baseUrl={strapiBaseUrl}
        products={products}
        search={search}
      />
      <Analytics.SearchView
        data={{searchTerm: search?.term, searchResults: search?.products}}
      />
    </>
  );
}

/**
 * The CMS modules, guaranteed to include module.search.
 *
 * Search is a site function, not optional content: if the Strapi page is
 * missing, unpublished, or someone removes the module from it, /search would
 * otherwise render no search box and no results at all. Rather than fail that
 * quietly, a Search module with default copy goes first. An editor's own
 * module, wherever they placed it, is left exactly as it is.
 *
 * @param {Array<{__component: string}>} modules
 */
function withSearchModule(modules = []) {
  if (modules.some((m) => m.__component === 'module.search')) return modules;
  return [{__component: 'module.search'}, ...modules];
}

/*
 * -----------------------------------------------------------------------------
 * REGULAR SEARCH — the /search page
 * -----------------------------------------------------------------------------
 */

/**
 * Same fields as the collection route's ProductItem, so the shared ProductCard
 * renders a search result and a collection product identically.
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    id
    handle
    title
    trackingParameters
    seo {
      description
    }
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
  }
`;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $language: LanguageCode
    $term: String!
    $first: Int!
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    products: search(
      query: $term
      types: [PRODUCT]
      first: $first
      sortKey: $sortKey
      reverse: $reverse
      productFilters: $filters
      # Partial last word: "dechlorin" finds "dechlorination". Without it a
      # search typed quickly and submitted early finds nothing.
      prefix: LAST
      # Out-of-stock products last, not hidden. This catalogue is equipment
      # people order ahead; hiding a gauge because it is back-ordered hides the
      # only answer to the query.
      unavailableProducts: LAST
    ) {
      totalCount
      productFilters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }
      nodes {
        ...SearchProduct
        ... on Product {
          # For the collection filter, which the route applies itself, and the
          # availability counts it redoes.
          availableForSale
          variants(first: 100) {
            nodes {
              availableForSale
            }
          }
          collections(first: 20) {
            nodes {
              handle
              title
            }
          }
        }
      }
    }
    pages: search(query: $term, types: [PAGE], first: 10, prefix: LAST) {
      nodes {
        ... on Page {
          __typename
          id
          handle
          title
          trackingParameters
        }
      }
    }
    articles: search(query: $term, types: [ARTICLE], first: 10, prefix: LAST) {
      nodes {
        ... on Article {
          __typename
          id
          handle
          title
          trackingParameters
          blog {
            handle
          }
        }
      }
    }
    # Names for the collection filter, including a ticked collection that no
    # longer has any results (it stays listed so it can be unticked).
    collectionNames: collections(first: 100) {
      nodes {
        handle
        title
      }
    }
    # The regular search query cannot return collections, so the predictive
    # endpoint supplies them. "gauge" should surface the Gauges collection as
    # well as fifty-odd gauges.
    related: predictiveSearch(query: $term, types: [COLLECTION], limit: 6) {
      collections {
        id
        handle
        title
        trackingParameters
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
`;

/*
 * Shopify's per-request maximum, and the ceiling for the fetch-everything-then-
 * slice approach the collection route uses. See the note in regularSearch.
 */
const SEARCH_FETCH_LIMIT = 250;

/** Collections that group the storefront rather than a kind of product. */
const NOT_A_FILTER = new Set(['frontpage', 'all']);

/**
 * The Collection filter for a search, plus the products it leaves.
 *
 * Storefront search has no collection filter, but the route already holds the
 * whole result set (see regularSearch), each product listing its collections —
 * so it is counted and applied here. Several ticked collections widen the
 * results (any of them), as ticking two values of any other filter does.
 *
 * Counts are taken BEFORE this filter is applied, so ticking one collection
 * doesn't zero out the others and the visitor can add a second. A ticked
 * collection stays listed even at zero (after a price change, say) so it can
 * be unticked.
 *
 * @param {Array<object>} products - every result for the term and Shopify filters
 * @param {Set<string>} selected - ticked collection handles
 * @param {Map<string, string>} names - collection handle -> title
 */
function applyCollectionFilter(products, selected, names) {
  /** @type {Map<string, {handle: string, title: string, count: number}>} */
  const counts = new Map();
  for (const product of products) {
    for (const c of product.collections?.nodes ?? []) {
      if (NOT_A_FILTER.has(c.handle)) continue;
      const entry = counts.get(c.handle) ?? {handle: c.handle, title: c.title, count: 0};
      entry.count += 1;
      counts.set(c.handle, entry);
    }
  }
  for (const handle of selected) {
    if (!counts.has(handle)) {
      counts.set(handle, {handle, title: names.get(handle) ?? handle, count: 0});
    }
  }

  const values = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .map((c) => ({
      id: `filter.category.${c.handle}`,
      label: c.title,
      count: c.count,
      input: collectionFilterInput(c.handle),
    }));

  const kept = selected.size
    ? products.filter((p) =>
        (p.collections?.nodes ?? []).some((c) => selected.has(c.handle)),
      )
    : products;

  return {
    // One choice filters nothing; hide it unless it's the ticked one.
    facet:
      values.length > 1 || selected.size
        // "Category" to visitors; a collection is Shopify's term for it.
        ? {id: 'filter.category', label: 'Category', type: 'LIST', values}
        : null,
    products: kept,
  };
}

/**
 * Shopify's facet counts know nothing of the collection filter. Availability
 * can be recounted from the products left, so "In stock (55)" doesn't sit
 * beside six hoses; the others (price bounds) are left as Shopify gave them.
 *
 * Counted Shopify's way: "In stock" is any variant buyable, "Out of stock" any
 * variant not — so a product sold in only some threads is in both, and the
 * count matches what ticking the box returns.
 *
 * @param {Array<object>} facets
 * @param {Array<object>} products - the results after the collection filter
 */
function recountAvailability(facets, products) {
  return facets.map((facet) => {
    if (facet.id !== 'filter.v.availability') return facet;
    return {
      ...facet,
      values: facet.values.map((v) => {
        let wanted;
        try {
          wanted = JSON.parse(v.input)?.available;
        } catch {
          return v;
        }
        if (typeof wanted !== 'boolean') return v;
        const matches = (p) =>
          wanted
            ? p.availableForSale
            : (p.variants?.nodes ?? []).some((variant) => !variant.availableForSale);
        return {...v, count: products.filter(matches).length};
      }),
    };
  });
}

/**
 * @param {{url: URL, context: Route.LoaderArgs['context']}}
 */
async function regularSearch({url, context}) {
  const {storefront, strapi} = context;
  const searchParams = url.searchParams;
  const term = String(searchParams.get('q') ?? '').trim();
  const sort = sortFromSearchParams(searchParams, SEARCH_SORT_OPTIONS);

  const base = {
    type: 'regular',
    term,
    activeSort: sort.value,
    products: null,
    collections: [],
    pages: [],
    articles: [],
    pagination: null,
    browseCollections: [],
    error: null,
  };

  /*
   * The collections that have a CMS entry — the only ones whose page renders
   * anything. Needed whether or not there is a term: an empty or failed search
   * offers them as a way in.
   */
  const linkableHandles = strapi.getCollectionHandles();

  if (!term) {
    return {
      ...base,
      browseCollections: await browseCollections({
        storefront,
        linkableHandles: await linkableHandles,
      }).catch(() => []),
    };
  }

  /*
   * The whole result set in one query, then sliced — the same reasoning as the
   * collection route. Storefront search is cursor-only, so "page 3" cannot be
   * asked for directly; fetching everything gives a real total and a pasteable
   * URL for every page. Unlike a collection, search DOES report a totalCount,
   * but that alone still cannot reach page 3 without walking pages 1 and 2.
   * Safe while the catalogue is 92 products; the warning below says when not.
   */
  let items;
  try {
    const [response, cmsPages] = await Promise.all([
      storefront.query(SEARCH_QUERY, {
        variables: {
          term,
          first: SEARCH_FETCH_LIMIT,
          sortKey: sort.sortKey,
          reverse: sort.reverse,
          filters: filtersFromSearchParams(searchParams),
        },
      }),
      strapi.searchPages(term),
    ]);
    items = {...response, cmsPages};
  } catch (error) {
    console.error('[search] query failed:', error);
    return {
      ...base,
      error: 'Search is unavailable right now. Please try again shortly.',
      browseCollections: await browseCollections({
        storefront,
        linkableHandles: await linkableHandles,
      }).catch(() => []),
    };
  }

  const matched = items.products?.nodes ?? [];
  const selectedCollections = collectionFilterHandles(searchParams);
  const {facet: collectionFacet, products: allProducts} = applyCollectionFilter(
    matched,
    selectedCollections,
    new Map((items.collectionNames?.nodes ?? []).map((c) => [c.handle, c.title])),
  );
  const shopifyFacets = items.products?.productFilters ?? [];
  const facets = [
    ...(collectionFacet ? [collectionFacet] : []),
    ...(selectedCollections.size
      ? recountAvailability(shopifyFacets, allProducts)
      : shopifyFacets),
  ];

  if (matched.length === SEARCH_FETCH_LIMIT) {
    console.warn(
      `[search] "${term}" returned ${SEARCH_FETCH_LIMIT} products, the Storefront ` +
        `API's per-query maximum. Results beyond that are NOT shown; this route ` +
        `needs cursor pagination.`,
    );
  }

  const pageCount = Math.max(1, Math.ceil(allProducts.length / SEARCH_PAGE_SIZE));
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    pageCount,
  );
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  const pageProducts = allProducts.slice(start, start + SEARCH_PAGE_SIZE);

  const handles = await linkableHandles;
  const collections = (items.related?.collections ?? []).filter((c) =>
    handles.has(c.handle),
  );

  const pages = mergePages({
    shopifyPages: items.pages?.nodes ?? [],
    cmsPages: items.cmsPages ?? [],
    term,
  });

  const articles = (items.articles?.nodes ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    url: `/blogs/${a.blog.handle}/${a.handle}`,
  }));

  /*
   * A search that finds nothing at all gets the categories to fall back on.
   * Filters narrowing a real result to zero do NOT — that visitor needs a
   * "clear filters" button, not a list of somewhere else to go.
   */
  const nothingFound =
    allProducts.length === 0 &&
    searchParams.getAll('filter').length === 0 &&
    collections.length === 0 &&
    pages.length === 0 &&
    articles.length === 0;

  return {
    ...base,
    products: {
      // The list's length rather than Shopify's totalCount: the two agree, but
      // the list is what the visitor actually pages through.
      total: allProducts.length,
      nodes: pageProducts,
      filters: facets,
    },
    collections,
    pages,
    articles,
    pagination: {
      page,
      pageCount,
      pageSize: SEARCH_PAGE_SIZE,
      total: allProducts.length,
      from: allProducts.length === 0 ? 0 : start + 1,
      to: start + pageProducts.length,
    },
    browseCollections: nothingFound
      ? await browseCollections({storefront, linkableHandles: handles}).catch(
          () => [],
        )
      : [],
  };
}

/*
 * -----------------------------------------------------------------------------
 * PREDICTIVE SEARCH — the quick-search panel
 * -----------------------------------------------------------------------------
 */

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $term: String!
    $limit: Int!
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      query: $term
      limit: $limit
      limitScope: EACH
      types: [QUERY, PRODUCT, COLLECTION, PAGE, ARTICLE]
      # SKU added to the default four, so a part number typed into the panel
      # finds its product — the hero's placeholder invites exactly that.
      searchableFields: [TITLE, PRODUCT_TYPE, VARIANTS_TITLE, VENDOR, VARIANTS_SKU]
      unavailableProducts: LAST
    ) {
      queries {
        text
        trackingParameters
      }
      products {
        id
        handle
        title
        trackingParameters
        featuredImage {
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
      }
      collections {
        id
        handle
        title
        trackingParameters
      }
      pages {
        id
        handle
        title
        trackingParameters
      }
      articles {
        id
        handle
        title
        trackingParameters
        blog {
          handle
        }
      }
    }
    # Predictive search returns no total. This is the count the panel's
    # "View all 55 results" button quotes, from the same query the /search page
    # runs, so the number it promises is the number the page shows.
    total: search(
      query: $term
      types: [PRODUCT]
      first: 1
      prefix: LAST
      unavailableProducts: LAST
    ) {
      totalCount
    }
  }
`;

/**
 * @param {{url: URL, context: Route.LoaderArgs['context']}}
 */
async function predictiveSearch({url, context}) {
  const {storefront, strapi} = context;
  const term = String(url.searchParams.get('q') ?? '').trim();
  const linkableHandles = strapi.getCollectionHandles();

  /*
   * No term: the panel has just opened. It gets the categories to show before
   * anyone types. Everything else in the empty state (popular and recent
   * searches) is already on the client.
   */
  if (!term) {
    return {
      type: 'predictive',
      term,
      browseCollections: await browseCollections({
        storefront,
        linkableHandles: await linkableHandles,
      }).catch(() => []),
    };
  }

  try {
    const [{predictiveSearch: items, total}, cmsPages, handles] =
      await Promise.all([
        storefront.query(PREDICTIVE_SEARCH_QUERY, {
          variables: {term, limit: 6},
        }),
        strapi.searchPages(term),
        linkableHandles,
      ]);

    return {
      type: 'predictive',
      term,
      queries: (items?.queries ?? [])
        // A suggestion identical to what was typed tells the visitor nothing.
        .filter((q) => q.text.toLowerCase() !== term.toLowerCase())
        .slice(0, 5),
      products: items?.products ?? [],
      collections: (items?.collections ?? []).filter((c) =>
        handles.has(c.handle),
      ),
      pages: mergePages({
        shopifyPages: items?.pages ?? [],
        cmsPages,
        term,
      }).slice(0, 4),
      articles: (items?.articles ?? []).slice(0, 3).map((a) => ({
        id: a.id,
        title: a.title,
        url: `/blogs/${a.blog.handle}/${a.handle}`,
      })),
      total: total?.totalCount ?? 0,
    };
  } catch (error) {
    console.error('[search] predictive query failed:', error);
    return {type: 'predictive', term, error: true};
  }
}

/*
 * -----------------------------------------------------------------------------
 * SHARED
 * -----------------------------------------------------------------------------
 */

const BROWSE_COLLECTIONS_QUERY = `#graphql
  query SearchBrowseCollections(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collections(first: 50, sortKey: TITLE) {
      nodes {
        id
        handle
        title
      }
    }
  }
`;

/**
 * Collections to offer when there is nothing typed or nothing found.
 *
 * Only ones with a CMS entry, for the reason given on getCollectionHandles:
 * the others render an empty page. As collection pages are built in Strapi they
 * join this list with no code change.
 *
 * @param {{storefront: any, linkableHandles: Set<string>}}
 */
async function browseCollections({storefront, linkableHandles}) {
  if (linkableHandles.size === 0) return [];
  const {collections} = await storefront.query(BROWSE_COLLECTIONS_QUERY, {
    cache: storefront.CacheLong(),
  });
  return (collections?.nodes ?? [])
    .filter((c) => linkableHandles.has(c.handle))
    .map(({id, handle, title}) => ({id, handle, title}));
}

/**
 * Shopify pages and Strapi pages as one list of {id, title, url}.
 *
 * Strapi's come first: those are the site's real content pages. Shopify's are
 * the leftovers the storefront still hosts (Contact, the privacy opt-out).
 *
 * @param {{shopifyPages: Array<object>, cmsPages: Array<object>, term: string}}
 */
function mergePages({shopifyPages, cmsPages, term}) {
  const seen = new Set();
  const out = [];

  for (const p of cmsPages) {
    if (seen.has(p.path)) continue;
    seen.add(p.path);
    out.push({id: `cms:${p.path}`, title: p.name, url: p.path});
  }

  for (const p of shopifyPages) {
    const path = `/pages/${p.handle}`;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({
      id: p.id,
      title: p.title,
      url: urlWithTrackingParams({
        baseUrl: path,
        trackingParams: p.trackingParameters,
        term,
      }),
    });
  }

  return out;
}

/** @typedef {import('./+types/search').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
