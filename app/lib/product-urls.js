import {useCallback} from 'react';
import {useRouteLoaderData} from 'react-router';

/**
 * Where each product lives.
 *
 * A product's URL is `/collections/{its collection}/{product}` once that
 * collection has a page (a Strapi collection entry); until then it's
 * `/products/{product}`. So creating a collection page moves its products
 * with no code change, and each product's URL changes once, ever.
 *
 * "Its collection" (its home):
 *  - the `custom.primary_collection` product metafield, when it's set to a
 *    collection the product is actually in — how the client picks for a
 *    product in several;
 *  - otherwise its most specific collection, the one with the fewest
 *    products (the Smart Monster gauge is in Hose Monsters AND Smart Monster
 *    & Digital; the latter wins);
 *  - never the storefront groupings (Home page, All).
 *
 * The same home drives the product page's breadcrumb and "More in …", so the
 * URL, the breadcrumb and the related row always agree.
 *
 * Computed from one query over the whole catalogue (92 products today),
 * once per request, and handed to the browser in the root loader's data so
 * every product link on the site — cards, search, cart — uses the same URL.
 */

/** The product metafield that names a product's primary collection. */
export const PRIMARY_COLLECTION_METAFIELD = {
  namespace: 'custom',
  key: 'primary_collection',
};

/** Storefront groupings, not places a product lives. */
const NOT_A_HOME = new Set(['frontpage', 'all']);

/** The Storefront API's page size; past it, this needs pagination. */
const CATALOGUE_LIMIT = 250;

const PRODUCT_HOMES_QUERY = `#graphql
  query ProductHomes($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: ${CATALOGUE_LIMIT}) {
      nodes {
        handle
        primaryCollection: metafield(
          namespace: "${PRIMARY_COLLECTION_METAFIELD.namespace}"
          key: "${PRIMARY_COLLECTION_METAFIELD.key}"
        ) {
          reference {
            ... on Collection {
              handle
            }
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
`;

/**
 * @typedef {{
 *   homes: Record<string, {handle: string, title: string} | null>,
 *   paths: Record<string, string>,
 * }} ProductUrls
 * `homes`: every product's home collection. `paths`: only products whose
 * home has a page — everything else is at /products/{handle}.
 */

/** One lookup per request, however many loaders ask. */
const perRequest = new WeakMap();

/**
 * @param {{storefront: object, strapi: object}} context - the loader context
 * @returns {Promise<ProductUrls>}
 */
export function loadProductUrls(context) {
  const cached = perRequest.get(context);
  if (cached) return cached;

  const promise = Promise.all([
    context.storefront.query(PRODUCT_HOMES_QUERY, {
      cache: context.storefront.CacheShort(),
    }),
    context.strapi.getCollectionHandles(),
  ])
    .then(([data, linkable]) => buildProductUrls(data?.products?.nodes ?? [], linkable))
    .catch((error) => {
      // Every link falls back to /products/{handle}: still a working page.
      console.error('[product-urls] lookup failed:', error);
      return {homes: {}, paths: {}};
    });

  perRequest.set(context, promise);
  return promise;
}

/**
 * @param {Array<object>} products - ProductHomes nodes
 * @param {Set<string>} linkable - collection handles that have a page
 * @returns {ProductUrls}
 */
export function buildProductUrls(products, linkable) {
  if (products.length >= CATALOGUE_LIMIT) {
    console.warn(
      `[product-urls] ${CATALOGUE_LIMIT}+ products: the rest fall back to ` +
        '/products/{handle}. The lookup needs pagination.',
    );
  }

  /** @type {Map<string, number>} */
  const size = new Map();
  for (const product of products) {
    for (const c of product.collections?.nodes ?? []) {
      size.set(c.handle, (size.get(c.handle) ?? 0) + 1);
    }
  }

  const homes = {};
  const paths = {};
  for (const product of products) {
    const home = pickHome(product, size);
    homes[product.handle] = home;
    if (home && linkable.has(home.handle)) {
      paths[product.handle] = `/collections/${home.handle}/${product.handle}`;
    }
  }
  return {homes, paths};
}

/**
 * @param {object} product
 * @param {Map<string, number>} size - products per collection
 * @returns {{handle: string, title: string} | null}
 */
function pickHome(product, size) {
  const collections = (product.collections?.nodes ?? []).filter(
    (c) => !NOT_A_HOME.has(c.handle),
  );
  const primary = product.primaryCollection?.reference?.handle;
  const chosen = primary && collections.find((c) => c.handle === primary);
  if (chosen) return {handle: chosen.handle, title: chosen.title};

  const specific = [...collections].sort(
    (a, b) =>
      (size.get(a.handle) ?? 0) - (size.get(b.handle) ?? 0) ||
      a.handle.localeCompare(b.handle),
  )[0];
  return specific ? {handle: specific.handle, title: specific.title} : null;
}

/**
 * @param {string} handle - product handle
 * @param {Record<string, string> | undefined} paths - ProductUrls.paths
 */
export function productPath(handle, paths) {
  return paths?.[handle] ?? `/products/${handle}`;
}

/**
 * In components: `const pathFor = useProductPath(); pathFor(handle)`. Reads
 * the map the root loader ships.
 */
export function useProductPath() {
  const paths = useRouteLoaderData('root')?.productPaths;
  return useCallback((handle) => productPath(handle, paths), [paths]);
}
