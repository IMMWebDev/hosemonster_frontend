import {redirect, useLoaderData} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import BlockManager from '~/components/cms/BlockManager';
import {getModuleProducts} from '~/lib/module-products';
import {
  sortFromSearchParams,
  filtersFromSearchParams,
} from '~/lib/collection-filters';
import {
  absoluteUrl,
  canonicalLink,
  metaDescription,
  shareImage,
  siteOrigin,
  socialTags,
  withBrand,
} from '~/lib/seo';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  if (!data?.collection) return [{title: 'Hose Monster'}];
  /*
   * CMS first, Shopify second. A collection page's title is editorial, so the
   * Strapi `seo` component wins; Shopify's title and description fill in where
   * it's empty.
   */
  const seo = data.cmsPage?.seo ?? {};
  const {page = 1} = data.pagination ?? {};
  const baseTitle = withBrand(seo.metaTitle || data.collection.title);
  // Page 2 onward says so, so paginated pages don't share one title:
  // "Accessories – Page 2 | Hose Monster".
  const title = page > 1 ? pagedTitle(baseTitle, page) : baseTitle;
  const description =
    metaDescription(seo.metaDescription) ||
    metaDescription(data.collection.description);

  const tags = [{title}];
  if (description) tags.push({name: 'description', content: description});
  const canonical = canonicalLink(data.canonicalUrl);
  if (canonical) tags.push(canonical);
  tags.push(
    ...socialTags({
      title,
      description,
      url: data.canonicalUrl,
      image: shareImage(seo.metaImage, data.strapiBaseUrl),
    }),
  );
  if (seo.preventIndexing) {
    tags.push({name: 'robots', content: 'noindex, nofollow'});
  }
  return tags;
};

/**
 * " – Page N" before the brand when the title ends with it, else at the end.
 *
 * @param {string} title
 * @param {number} page
 */
function pagedTitle(title, page) {
  const marker = ` – Page ${page}`;
  const branded = title.match(/^(.*?)(\s*\|\s*Hose\s?Monster)$/i);
  return branded ? `${branded[1]}${marker}${branded[2]}` : `${title}${marker}`;
}

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, params, request, url}) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw redirect('/collections');
  }

  /*
   * Strapi BEFORE Shopify, not in parallel — deliberately.
   *
   * The Product Feed module owns `productsPerPage`, and page size is a query
   * variable, so the CMS answer is needed before Shopify can be asked. The cost
   * is one extra round trip on a cached, null-safe call; the alternative is
   * hard-coding a page size the CMS claims to control.
   */
  const cms = await context.strapi.getCollectionPage(handle);

  /*
   * No collection page in Strapi, no page here. The product grid is a CMS
   * module, so without an entry this rendered an empty <main> — no heading,
   * no products — at a 200, and the sitemap listed it. Products in such a
   * collection already live at /products/{handle} (lib/product-urls.js), and
   * the collections sitemap leaves these out too.
   */
  if (!cms.page) {
    throw new Response(`Collection ${handle} has no page`, {status: 404});
  }

  const feed = (cms.modules ?? []).find(
    (m) => m.__component === 'module.product-feed',
  );

  const pageSize = feed?.productsPerPage ?? 12;

  /*
   * Sort and filters come from the URL so the loader re-runs when they change —
   * Shopify has to recompute the facet COUNTS, not just the products, so this
   * cannot be done client-side.
   */
  const searchParams = new URL(request.url).searchParams;
  const sort = sortFromSearchParams(searchParams);
  const filters = filtersFromSearchParams(searchParams);

  /*
   * The WHOLE collection in one query, then sliced here — not Shopify's cursors.
   *
   * The Storefront API is relay-cursor only: there is no offset, no skip, and a
   * product connection reports neither a total nor a page count. You therefore
   * cannot answer "give me page 3" directly, and you cannot render "1 2 3"
   * without a total, which is why Hydrogen ships Load-more and why headless
   * stores overwhelmingly use it.
   *
   * Fetching everything sidesteps both problems: the loader holds the real list,
   * so the total is arithmetic and any page is reachable cold from a URL. That
   * is only defensible because this catalogue is small — 92 products, largest
   * collection 24. PAGE_FETCH_LIMIT is the ceiling; past it this has to go back
   * to cursors and the design loses its page numbers. The guard below says so
   * out loud rather than silently truncating a collection.
   */
  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      first: PAGE_FETCH_LIMIT,
      sortKey: sort.sortKey,
      reverse: sort.reverse,
      filters,
    },
  });

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  const allProducts = collection.products?.nodes ?? [];

  if (allProducts.length === PAGE_FETCH_LIMIT) {
    console.warn(
      `[collection] "${handle}" returned ${PAGE_FETCH_LIMIT} products, the Storefront ` +
        `API's per-query maximum. Anything beyond that is NOT being shown. This route ` +
        `needs to move back to cursor pagination.`,
    );
  }

  /*
   * Page is clamped, never trusted. A bookmarked ?page=3 on a collection that
   * has since shrunk, or a hand-typed ?page=99, lands on the last real page
   * rather than an empty grid.
   */
  const pageCount = Math.max(1, Math.ceil(allProducts.length / pageSize));
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    pageCount,
  );
  const start = (page - 1) * pageSize;
  const pageProducts = allProducts.slice(start, start + pageSize);

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(url, {handle, data: collection});

  /*
   * Modules cannot fetch — BlockManager renders straight from the CMS payload.
   * module.product-cards stores only references, so its Storefront lookup
   * happens here, same as on $.jsx and _index.jsx.
   */
  const products = await getModuleProducts({
    storefront,
    modules: cms.modules,
  });

  return {
    /*
     * The connection is handed on with `nodes` REPLACED by this page's slice, so
     * the module renders what it is given and never has to know about paging.
     * `filters` still carries Shopify's facet counts for the whole filtered set,
     * which is what the rail needs.
     */
    collection: {
      ...collection,
      products: {...collection.products, nodes: pageProducts},
    },
    pagination: {
      page,
      pageCount,
      pageSize,
      total: allProducts.length,
      // 1-based, inclusive, for "Showing 13–24 of 24".
      from: allProducts.length === 0 ? 0 : start + 1,
      to: start + pageProducts.length,
    },
    activeSort: sort.value,
    /*
     * The canonical. Page 2 must canonicalise to ITSELF, not to page 1: it
     * lists different products, and pointing it at page 1 tells crawlers
     * they're duplicates. Sort and filter params are dropped — the same
     * products in a different order is what canonical is for. An editor's
     * Canonical URL applies to page 1.
     */
    canonicalUrl:
      page > 1
        ? absoluteUrl(`/collections/${handle}?page=${page}`, siteOrigin(request))
        : (absoluteUrl(cms.page.seo?.canonicalURL, siteOrigin(request)) ??
          absoluteUrl(`/collections/${handle}`, siteOrigin(request))),
    cmsPage: cms.page,
    cmsModules: cms.modules,
    products,
    strapiBaseUrl: context.env.STRAPI_API_URL,
    // Read by PageLayout via useMatches to decide whether the newsletter band
    // renders above the footer.
    includeNewsletter: cms.page?.includeNewsletter ?? null,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context}) {
  return {};
}

export default function Collection() {
  /** @type {LoaderReturnData} */
  const {collection, cmsModules, strapiBaseUrl, products, activeSort, pagination} =
    useLoaderData();

  return (
    <div className="collection">
      {/* Everything on this page is a CMS module, product grid included. */}
      <BlockManager
        blocks={cmsModules}
        baseUrl={strapiBaseUrl}
        products={products}
        pagination={pagination}
        collection={collection}
        activeSort={activeSort}
      />

      {/*
        No grid here. The products are rendered by module.product-feed inside
        BlockManager above, which owns the sort and filter controls too — the
        skeleton's grid stayed behind when that module was built and rendered
        every product a second time.

        Shopify's title and description are deliberately not rendered either:
        the heading comes from the Page Hero module so it is editorial, and two
        <h1>s on one page is worse for SEO than none. The CMS owns the words,
        Shopify owns the products.
      */}
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
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
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
`;

/*
 * Shopify’s hard maximum for a single products() request. Also the point at
 * which this route’s whole approach stops working — see the loader.
 */
const PAGE_FETCH_LIMIT = 250;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        sortKey: $sortKey,
        reverse: $reverse,
        filters: $filters
      ) {
        # Facets, recomputed by Shopify for the CURRENT filter selection — which
        # is why filtering has to round-trip rather than happen in the browser.
        filters {
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
          ...ProductItem
        }
      }
    }
  }
`;

/** @typedef {import('./+types/collections.$handle').Route} Route */
/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
