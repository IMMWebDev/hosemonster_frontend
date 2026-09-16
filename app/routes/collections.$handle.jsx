import {redirect, useLoaderData} from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import BlockManager from '~/components/cms/BlockManager';
import {getModuleProducts} from '~/lib/module-products';
import {
  sortFromSearchParams,
  filtersFromSearchParams,
} from '~/lib/collection-filters';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  /*
   * CMS first, Shopify second. A collection page's title is editorial, so the
   * Strapi `seo` component wins when the handle has a CMS entry; a collection
   * with no entry still gets a sensible title from Shopify rather than nothing.
   */
  const seo = data?.cmsPage?.seo;
  const title = seo?.metaTitle || `${data?.collection?.title ?? ''} | Hose Monster`;

  const tags = [{title}, {property: 'og:title', content: title}];
  if (seo?.metaDescription) {
    tags.push({name: 'description', content: seo.metaDescription});
    tags.push({property: 'og:description', content: seo.metaDescription});
  }
  if (seo?.preventIndexing) {
    tags.push({name: 'robots', content: 'noindex, nofollow'});
  }
  return tags;
};

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

  const feed = (cms.modules ?? []).find(
    (m) => m.__component === 'module.product-feed',
  );

  const paginationVariables = getPaginationVariables(request, {
    pageBy: feed?.productsPerPage ?? 12,
  });

  /*
   * Sort and filters come from the URL so the loader re-runs when they change —
   * Shopify has to recompute the facet COUNTS, not just the products, so this
   * cannot be done client-side.
   */
  const searchParams = new URL(request.url).searchParams;
  const sort = sortFromSearchParams(searchParams);
  const filters = filtersFromSearchParams(searchParams);

  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      ...paginationVariables,
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
    collection,
    activeSort: sort.value,
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
  const {collection, cmsModules, strapiBaseUrl, products, activeSort} =
    useLoaderData();

  return (
    <div className="collection">
      {/* Everything on this page is a CMS module, product grid included. */}
      <BlockManager
        blocks={cmsModules}
        baseUrl={strapiBaseUrl}
        products={products}
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

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
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
        last: $last,
        before: $startCursor,
        after: $endCursor,
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
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`;

/** @typedef {import('./+types/collections.$handle').Route} Route */
/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
