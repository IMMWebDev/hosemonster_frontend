/**
 * Shopify lookups for CMS modules that reference products.
 *
 * `module.product-cards` stores only a reference per card — title, price, image
 * and URL come live from the Storefront API so a price change in Shopify can
 * never leave a stale number on the page. Nothing in BlockManager can fetch, so
 * the route loader resolves the references and passes the result down.
 */

const PRODUCT_CARD_MODULE = 'module.product-cards';

/**
 * Upper bound on references per page. Each one adds a selection to a single
 * query, so without a cap a CMS editor could make an arbitrarily large request
 * just by pasting rows into the dynamic zone.
 */
const MAX_REFS = 24;

/** A Shopify product id is all digits; a handle never is. */
const NUMERIC_ID = /^\d+$/;

/*
 * Keep this GraphQL only — no JS comments inside the template literal. Hydrogen
 * minifies the document onto one line before sending it, and a stray `/` from a
 * C-style comment comes back as a parse error pointing at a column number in a
 * query you never wrote.
 *
 * maxVariantPrice is here purely so the card can tell a price RANGE from a
 * single price, and print "From $X" only when there is actually a range.
 */
const PRODUCT_CARD_FRAGMENT = `
  fragment ModuleProductCard on Product {
    id
    handle
    title
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
  const refs = collectProductRefs(modules);
  if (refs.length === 0) return {};

  const ids = refs.filter((ref) => NUMERIC_ID.test(ref));
  const handles = refs.filter((ref) => !NUMERIC_ID.test(ref));

  const declarations = [
    '$country: CountryCode',
    '$language: LanguageCode',
    '$ids: [ID!]!',
    ...handles.map((_, i) => `$h${i}: String!`),
  ].join(', ');

  const selections = [
    '  byId: nodes(ids: $ids) { ... on Product { ...ModuleProductCard } }',
    ...handles.map(
      (_, i) => `  p${i}: product(handle: $h${i}) { ...ModuleProductCard }`,
    ),
  ].join('\n');

  const query = `query ModuleProducts(${declarations}) @inContext(country: $country, language: $language) {\n${selections}\n}\n${PRODUCT_CARD_FRAGMENT}`;

  const variables = {
    ids: ids.map((id) => `gid://shopify/Product/${id}`),
    ...Object.fromEntries(handles.map((h, i) => [`h${i}`, h])),
  };

  try {
    const data = await storefront.query(query, {
      variables,
      // Short, not long: this is pricing. A stale price is worse than a
      // slightly slower page.
      cache: storefront.CacheShort(),
    });

    const byRef = {};

    // nodes() answers positionally, so byId[i] belongs to ids[i].
    const nodes = data?.byId ?? [];
    ids.forEach((id, i) => {
      if (nodes[i]) byRef[id] = nodes[i];
    });

    handles.forEach((handle, i) => {
      const product = data?.[`p${i}`];
      if (product) byRef[handle] = product;
    });

    return byRef;
  } catch (error) {
    // A Storefront outage should cost the product cards, not the whole page.
    console.error('[cms] module product lookup failed', error);
    return {};
  }
}
