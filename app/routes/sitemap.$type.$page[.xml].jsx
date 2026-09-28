import {getSitemap} from '@shopify/hydrogen';
import {loadProductUrls, productPath} from '~/lib/product-urls';

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, params, context}) {
  const {storefront} = context;
  // Products are listed at the URL they live at (and redirect to), not
  // /products/{handle} — see lib/product-urls.js.
  const {paths} = await loadProductUrls(context);
  const response = await getSitemap({
    storefront,
    request,
    params,
    locales: ['EN-US', 'EN-CA', 'FR-CA'],
    getLink: ({type, baseUrl, handle, locale}) => {
      const path = type === 'products' ? productPath(handle, paths) : `/${type}/${handle}`;
      if (!locale) return `${baseUrl}${path}`;
      return `${baseUrl}/${locale}${path}`;
    },
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}

/** @typedef {import('./+types/sitemap.$type.$page[.xml]').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
