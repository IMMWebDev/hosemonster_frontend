import {useLocation} from 'react-router';
import {useMemo} from 'react';
import {useProductPath} from '~/lib/product-urls';

/**
 * A product URL with its selected options in the query — cart lines link
 * back to the exact variant. The path is wherever the product lives
 * (/collections/{c}/{p} or /products/{p}; see lib/product-urls.js).
 *
 * @param {string} handle
 * @param {SelectedOption[]} [selectedOptions]
 */
export function useVariantUrl(handle, selectedOptions) {
  const {pathname} = useLocation();
  const pathFor = useProductPath();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
      productPath: pathFor(handle),
    });
  }, [handle, selectedOptions, pathname, pathFor]);
}

/**
 * @param {{
 *   handle: string;
 *   pathname: string;
 *   searchParams: URLSearchParams;
 *   selectedOptions?: SelectedOption[];
 *   productPath?: string;
 * }}
 */
export function getVariantUrl({
  handle,
  pathname,
  searchParams,
  selectedOptions,
  productPath = `/products/${handle}`,
}) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;

  const path = isLocalePathname
    ? `${match[0].replace(/\/$/, '')}${productPath}`
    : productPath;

  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

  const searchString = searchParams.toString();

  return path + (searchString ? '?' + searchParams.toString() : '');
}

/** @typedef {import('@shopify/hydrogen/storefront-api-types').SelectedOption} SelectedOption */
