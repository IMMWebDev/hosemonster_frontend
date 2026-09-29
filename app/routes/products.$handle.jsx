import {redirect, useLoaderData} from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
} from '@shopify/hydrogen';
import {ProductPage} from '~/components/product/ProductPage';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/module-products';
import {plainText} from '~/lib/product-description';
import {loadProductUrls, productPath} from '~/lib/product-urls';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const product = data?.product;
  return [
    {title: `${product?.seo?.title || product?.title || 'Product'} | Hose Monster`},
    {
      name: 'description',
      content: product?.seo?.description || plainText(product?.description),
    },
    {
      rel: 'canonical',
      href: data?.canonical ?? `/products/${product?.handle}`,
    },
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const criticalData = await loadCriticalData(args);
  // Started once the product's collection is known, and streamed in below the
  // fold rather than awaited.
  const deferredData = loadDeferredData(args, criticalData);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, params, request, url}) {
  // /products/{handle}, or /collections/{collection}/{product} (routes.js).
  const handle = params.product ?? params.handle;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}, productUrls] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    loadProductUrls(context),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(url, {handle, data: product});

  /*
   * One URL per product. /products/x once x's collection has a page, a
   * collection it isn't filed under, or a collection with no page yet all
   * redirect (permanently, query kept — a picked option survives) to where
   * it lives. A trailing slash alone isn't worth a redirect.
   */
  const canonical = productPath(product.handle, productUrls.paths);
  if (url.pathname.replace(/\/+$/, '') !== canonical) {
    throw redirect(`${canonical}${url.search}`, 301);
  }

  // Its home collection: the breadcrumb, and where "More in …" comes from.
  const home = productUrls.homes[product.handle] ?? null;

  return {
    product,
    canonical,
    category: home
      ? {
          handle: home.handle,
          title: home.title,
          linkable: Boolean(productUrls.paths[product.handle]),
        }
      : null,
  };
}

/**
 * "More in {collection}": the other products in the product's collection,
 * streamed in below the fold. A failure just means no row.
 *
 * Not Shopify's productRecommendations: they're built from sales and browsing,
 * and with next to nothing sold online they recommended the one buyable item
 * (a 2″ nozzle) on almost every page.
 *
 * @param {Route.LoaderArgs} args
 * @param {{product: object, category: {handle: string, title: string} | null}} critical
 */
function loadDeferredData({context}, {product, category}) {
  if (!category) return {recommended: Promise.resolve(null)};

  const recommended = context.storefront
    .query(COLLECTION_PRODUCTS_QUERY, {variables: {handle: category.handle}})
    .then((data) => {
      const products = (data?.collection?.products?.nodes ?? []).filter(
        (p) => p.handle !== product.handle,
      );
      return products.length
        ? {title: `More in ${data.collection.title}`, products}
        : null;
    })
    .catch((error) => {
      console.error('[product] related products failed:', error);
      return null;
    });

  return {recommended};
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const {product, category, recommended} = useLoaderData();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  /*
   * No useSelectedOptionInUrlParam (the Hydrogen starter's): it wrote the
   * default variant into the URL on every load — `?Title=Default+Title` on a
   * product with no options at all. The URL only carries an option once the
   * visitor picks one (the chips navigate to it), which is all a shared link
   * needs.
   */

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, selectedVariant)),
        }}
      />
      <ProductPage
        product={product}
        selectedVariant={selectedVariant}
        productOptions={productOptions}
        category={category}
        recommended={recommended}
      />
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </>
  );
}

/**
 * Product structured data, so search results can show the price and whether
 * it's in stock. Built from the same Shopify data the page shows.
 *
 * @param {object} product
 * @param {object} variant
 */
function productJsonLd(product, variant) {
  const image = variant?.image?.url ?? product.images?.nodes?.[0]?.url;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: plainText(product.description, 500),
    ...(image ? {image} : {}),
    ...(variant?.sku ? {sku: variant.sku} : {}),
    brand: {'@type': 'Brand', name: product.vendor || 'Hose Monster'},
    ...(variant?.price
      ? {
          offers: {
            '@type': 'Offer',
            price: variant.price.amount,
            priceCurrency: variant.price.currencyCode,
            availability: variant.availableForSale
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }
      : {}),
  };
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      id
      title
      handle
      vendor
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    productType
    availableForSale
    descriptionHtml
    description
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
    images(first: 20) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  query ProductCollectionProducts(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      title
      # One more than the row shows, since the product itself is dropped.
      products(first: 5) {
        nodes {
          ...ModuleProductCard
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
