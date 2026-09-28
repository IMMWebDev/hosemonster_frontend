/**
 * Shopify lookups for CMS modules that reference products.
 *
 * `module.product-cards` stores only a reference per card — title, price, image
 * and URL come live from the Storefront API so a price change in Shopify can
 * never leave a stale number on the page. Nothing in BlockManager can fetch, so
 * the route loader resolves the references and passes the result down.
 *
 * `module.bundle-builder` references products the same way, through the
 * builder entry it points at, but needs every VARIANT (thread, length, PSI
 * range) with its price and stock — so its products are fetched with a larger
 * fragment. Both land in the same map, keyed by the reference as typed.
 *
 * `module.featured-product` spotlights one product with an Add to cart, so it
 * needs the variants and stock too, and shares the builder's fragment.
 *
 * A Product Cards module can instead name a COLLECTION: its first N products,
 * in the chosen order, land in the same map under `collectionSourceFor(...)`
 * `.key` as a list.
 */

const PRODUCT_CARD_MODULE = 'module.product-cards';
const BUNDLE_BUILDER_MODULE = 'module.bundle-builder';
const FEATURED_PRODUCT_MODULE = 'module.featured-product';

/** Featured products per page. One is the design; this is headroom. */
const MAX_FEATURED_REFS = 6;

/**
 * A builder references ~15-20 products; this is headroom, not a target. It is
 * separate from MAX_REFS so a builder on the same page as a row of product
 * cards cannot push the cards out.
 */
const MAX_BUILDER_REFS = 60;

/**
 * Upper bound on references per page. Each one adds a selection to a single
 * query, so without a cap a CMS editor could make an arbitrarily large request
 * just by pasting rows into the dynamic zone.
 */
const MAX_REFS = 24;

/** A Shopify product id is all digits; a handle never is. */
const NUMERIC_ID = /^\d+$/;

/** Product Cards' Sort field -> Storefront collection sort. */
const COLLECTION_SORTS = {
  // However the products are arranged on the collection in Shopify.
  collectionOrder: {sortKey: 'COLLECTION_DEFAULT', reverse: false},
  bestSelling: {sortKey: 'BEST_SELLING', reverse: false},
  newest: {sortKey: 'CREATED', reverse: true},
  priceLowToHigh: {sortKey: 'PRICE', reverse: false},
};

/** Product Cards' Product Limit, when empty (modules made before the field). */
const DEFAULT_COLLECTION_LIMIT = 4;

/**
 * Where a Product Cards module gets its products from a collection, or null
 * when it uses hand-picked items. `key` is where the list lands in the
 * products map — the module reads it back with the same function.
 *
 * @param {{collection?: {shopifyCollectionHandle?: string}, productLimit?: number, sort?: string}} [module]
 * @returns {{handle: string, first: number, sortKey: string, reverse: boolean, key: string} | null}
 */
export function collectionSourceFor(module) {
  const handle = module?.collection?.shopifyCollectionHandle?.trim();
  if (!handle) return null;
  const first = Math.min(12, Math.max(1, Number(module.productLimit) || DEFAULT_COLLECTION_LIMIT));
  const sort = COLLECTION_SORTS[module.sort] ?? COLLECTION_SORTS.collectionOrder;
  return {
    handle,
    first,
    ...sort,
    key: `collection:${handle}:${sort.sortKey}:${sort.reverse ? 'desc' : 'asc'}:${first}`,
  };
}

/**
 * Every distinct collection source on the page.
 *
 * @param {Array<object>} [modules]
 */
function collectCollectionSources(modules) {
  const sources = [];
  for (const module of modules ?? []) {
    if (module?.__component !== PRODUCT_CARD_MODULE) continue;
    const source = collectionSourceFor(module);
    if (source && !sources.some((s) => s.key === source.key)) sources.push(source);
  }
  return sources;
}

/*
 * Keep this GraphQL only — no JS comments inside the template literal. Hydrogen
 * minifies the document onto one line before sending it, and a stray `/` from a
 * C-style comment comes back as a parse error pointing at a column number in a
 * query you never wrote.
 *
 * maxVariantPrice is here purely so the card can tell a price RANGE from a
 * single price, and print "From $X" only when there is actually a range.
 */
export const PRODUCT_CARD_FRAGMENT = `
  fragment ModuleProductCard on Product {
    id
    handle
    title
    productType
    featuredImage {
      id
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
`;

/*
 * Superset of the card fragment. variants(first: 100): the largest product a
 * builder uses today has 30 (3 lengths x 10 threads); Shopify's own cap per
 * product is 100 for most stores.
 */
const BUNDLE_PRODUCT_FRAGMENT = `
  fragment ModuleBundleProduct on Product {
    ...ModuleProductCard
    availableForSale
    options {
      name
      optionValues {
        name
      }
    }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        image {
          url
          altText
          width
          height
        }
      }
    }
  }
`;

/**
 * Every product reference in the bundle builders on the page, deduped.
 *
 * @param {Array<object>} [modules]
 * @returns {string[]}
 */
export function collectBuilderRefs(modules) {
  const refs = [];
  for (const module of modules ?? []) {
    if (module?.__component !== BUNDLE_BUILDER_MODULE) continue;
    for (const step of module.builder?.steps ?? []) {
      for (const question of step.questions ?? []) {
        for (const choice of question.choices ?? []) {
          for (const product of choice.products ?? []) {
            const ref = product?.productHandle?.trim();
            if (ref && !refs.includes(ref)) refs.push(ref);
          }
        }
      }
    }
  }
  return refs.slice(0, MAX_BUILDER_REFS);
}

/**
 * Every Featured Product reference on the page, deduped.
 *
 * @param {Array<object>} [modules]
 * @returns {string[]}
 */
export function collectFeaturedRefs(modules) {
  const refs = [];
  for (const module of modules ?? []) {
    if (module?.__component !== FEATURED_PRODUCT_MODULE) continue;
    const ref = productRefFor(module);
    if (ref && !refs.includes(ref)) refs.push(ref);
  }
  return refs.slice(0, MAX_FEATURED_REFS);
}

/**
 * The raw product reference for one card, as typed into the CMS.
 *
 * The field accepts EITHER form, because the two are convenient in different
 * places in the Shopify admin:
 *
 *   handle — `dechlor-demon-2-12-assembly`, shown in the product's Search
 *            engine listing card, and the only one the product CSV exports.
 *            Readable in Strapi, but it changes if someone renames the product.
 *   id     — `7995943649323`, straight from the admin URL bar. Opaque in
 *            Strapi, but never changes.
 *
 * @param {{productRef?: string}} [item]
 * @returns {string | undefined}
 */
export function productRefFor(item) {
  return item?.productRef?.trim() || undefined;
}

/**
 * Every product reference on the page, in order, deduped.
 *
 * @param {Array<{__component?: string, items?: Array<object>}>} [modules]
 * @returns {string[]}
 */
export function collectProductRefs(modules) {
  const refs = [];

  for (const module of modules ?? []) {
    if (module?.__component !== PRODUCT_CARD_MODULE) continue;
    // Filled from a collection: its hand-picked items aren't shown.
    if (collectionSourceFor(module)) continue;
    for (const item of module.items ?? []) {
      const ref = productRefFor(item);
      if (ref && !refs.includes(ref)) refs.push(ref);
    }
  }

  return refs.slice(0, MAX_REFS);
}

/**
 * Resolve those references to products, keyed by the reference as written.
 *
 * Ids and handles need different Storefront fields, so one document carries
 * both: `nodes(ids:)` for the ids and an aliased `product(handle:)` per handle.
 *
 * Handles use aliases rather than `products(query: "handle:…")`, which looked
 * like the obvious choice and is quietly wrong — hyphens in a handle get
 * tokenised, so asking for four specific handles came back with twenty
 * unrelated products and missed two of the four. Aliases match exactly.
 *
 * Values travel as GraphQL VARIABLES, never interpolated into the document.
 * Only the alias and variable names (p0…pN, h0…hN) are generated here, so
 * nothing typed into Strapi can reach the query text.
 *
 * $country / $language and @inContext are NOT optional, even though nothing
 * here reads them. Hydrogen's storefront client injects both variables into
 * every request; an operation that does not declare them is rejected before it
 * runs, and the catch below would turn that into an empty result with every
 * card silently gone. They also do real work — @inContext is what returns
 * prices in the buyer's market rather than the shop's default currency.
 *
 * Deliberately NOT marked `#graphql`: the document is assembled at runtime, so
 * codegen cannot statically extract it and would fail the build trying.
 *
 * A reference with no product resolves to null and is simply absent from the
 * result — the card is skipped rather than rendering empty.
 *
 * @param {{storefront: any, modules?: Array<object>}} args
 * @returns {Promise<Record<string, object>>}
 */
export async function getModuleProducts({storefront, modules}) {
  // Builder and Featured Product refs both need variants and stock, so they
  // share the larger fragment.
  const builderRefs = [
    ...new Set([...collectBuilderRefs(modules), ...collectFeaturedRefs(modules)]),
  ];
  // A ref used by both a card and a builder is fetched once, with the larger
  // fragment — it is a superset, so the card still gets what it reads.
  const cardRefs = collectProductRefs(modules).filter(
    (ref) => !builderRefs.includes(ref),
  );
  const refs = [...cardRefs, ...builderRefs];
  const sources = collectCollectionSources(modules);
  if (refs.length === 0 && sources.length === 0) return {};

  const fragmentFor = (ref) =>
    builderRefs.includes(ref) ? 'ModuleBundleProduct' : 'ModuleProductCard';

  const cardIds = cardRefs.filter((ref) => NUMERIC_ID.test(ref));
  const builderIds = builderRefs.filter((ref) => NUMERIC_ID.test(ref));
  const handles = refs.filter((ref) => !NUMERIC_ID.test(ref));

  const declarations = [
    '$country: CountryCode',
    '$language: LanguageCode',
    '$ids: [ID!]!',
    '$bundleIds: [ID!]!',
    ...handles.map((_, i) => `$h${i}: String!`),
    ...sources.flatMap((_, i) => [
      `$c${i}: String!`,
      `$cf${i}: Int!`,
      `$cs${i}: ProductCollectionSortKeys`,
      `$cr${i}: Boolean`,
    ]),
  ].join(', ');

  const selections = [
    '  byId: nodes(ids: $ids) { ... on Product { ...ModuleProductCard } }',
    '  bundleById: nodes(ids: $bundleIds) { ... on Product { ...ModuleBundleProduct } }',
    ...handles.map(
      (h, i) => `  p${i}: product(handle: $h${i}) { ...${fragmentFor(h)} }`,
    ),
    ...sources.map(
      (_, i) =>
        `  c${i}: collection(handle: $c${i}) { products(first: $cf${i}, sortKey: $cs${i}, reverse: $cr${i}) { nodes { ...ModuleProductCard } } }`,
    ),
  ].join('\n');

  /*
   * BOTH fragments, always. The byId and bundleById selections are always in
   * the document (with empty id lists when unused), and GraphQL rejects a
   * document that spreads a fragment it doesn't define — "Fragment
   * ModuleBundleProduct was used, but not defined". Appending it only when a
   * builder was on the page made every product card on every OTHER page
   * silently disappear, because the catch below turns the error into {}.
   * Always defining both keeps every fragment used and every document valid.
   */
  const fragments = `${PRODUCT_CARD_FRAGMENT}\n${BUNDLE_PRODUCT_FRAGMENT}`;

  const query = `query ModuleProducts(${declarations}) @inContext(country: $country, language: $language) {\n${selections}\n}\n${fragments}`;

  const variables = {
    ids: cardIds.map((id) => `gid://shopify/Product/${id}`),
    bundleIds: builderIds.map((id) => `gid://shopify/Product/${id}`),
    ...Object.fromEntries(handles.map((h, i) => [`h${i}`, h])),
    ...Object.fromEntries(
      sources.flatMap((source, i) => [
        [`c${i}`, source.handle],
        [`cf${i}`, source.first],
        [`cs${i}`, source.sortKey],
        [`cr${i}`, source.reverse],
      ]),
    ),
  };

  try {
    const data = await storefront.query(query, {
      variables,
      // Short, not long: this is pricing. A stale price is worse than a
      // slightly slower page.
      cache: storefront.CacheShort(),
    });

    const byRef = {};

    // nodes() answers positionally, so byId[i] belongs to cardIds[i].
    const nodes = data?.byId ?? [];
    cardIds.forEach((id, i) => {
      if (nodes[i]) byRef[id] = nodes[i];
    });
    const bundleNodes = data?.bundleById ?? [];
    builderIds.forEach((id, i) => {
      if (bundleNodes[i]) byRef[id] = bundleNodes[i];
    });

    handles.forEach((handle, i) => {
      const product = data?.[`p${i}`];
      if (product) byRef[handle] = product;
    });

    sources.forEach((source, i) => {
      byRef[source.key] = data?.[`c${i}`]?.products?.nodes ?? [];
    });

    return byRef;
  } catch (error) {
    // A Storefront outage should cost the product cards, not the whole page.
    console.error('[cms] module product lookup failed', error);
    return {};
  }
}
