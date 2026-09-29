/**
 * The line an add-to-cart form sends, in the shape Hydrogen's optimistic cart
 * needs.
 *
 * `useOptimisticCart` draws the pending line from `selectedVariant` while the
 * request is in flight — it has no other source. Anything the line renders
 * has to be here, and `product` in particular: the line's link and title come
 * from it, and a variant without one threw the moment it was added to an
 * empty cart. Every add on the site builds its line here so the contract
 * lives in one place.
 *
 * @param {{
 *   product: {id?: string, handle: string, title: string},
 *   variant: object,
 *   quantity?: number,
 *   attributes?: Array<{key: string, value: string}>,
 * }} args
 */
export function toCartLine({product, variant, quantity = 1, attributes}) {
  return {
    merchandiseId: variant.id,
    quantity: Math.max(1, Math.round(Number(quantity) || 1)),
    ...(attributes?.length ? {attributes} : {}),
    selectedVariant: {
      id: variant.id,
      title: variant.title,
      sku: variant.sku ?? null,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      image: variant.image ?? null,
      selectedOptions: variant.selectedOptions ?? [],
      availableForSale: variant.availableForSale ?? true,
      product: {
        id: product.id ?? variant.product?.id ?? null,
        handle: product.handle ?? variant.product?.handle,
        title: product.title ?? variant.product?.title,
      },
    },
  };
}

/**
 * A line Hydrogen made up while an add is in flight: it has a placeholder
 * id, no cost, and updating or removing it is a no-op that logs an error.
 * Real lines are Shopify gids.
 *
 * @param {{id?: string, isOptimistic?: boolean} | null | undefined} line
 */
export function isPendingLine(line) {
  return Boolean(line?.isOptimistic) && !String(line?.id ?? '').startsWith('gid://');
}

/** The bundle a line was added as part of, or null. */
export function bundleLabelOf(line) {
  return line?.attributes?.find((a) => a.key === BUNDLE_ATTRIBUTE)?.value ?? null;
}

/** The line attribute the bundle builder tags its lines with. */
export const BUNDLE_ATTRIBUTE = 'Bundle';
