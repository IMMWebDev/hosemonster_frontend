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
  /*
   * No `locales`: the site is single-locale. With them, every entry carried
   * hreflang alternates to /EN-CA/…, /FR-CA/… URLs that don't exist.
   */
  const response = await getSitemap({
    storefront,
    request,
    params,
    getLink: ({type, baseUrl, handle}) => {
      const path =
        type === 'products' ? productPath(handle, paths) : `/${type}/${handle}`;
      return `${baseUrl}${path}`;
    },
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  /*
   * Collections only when they have a page in Strapi — without one the route
   * 404s (collections.$handle.jsx). getSitemap has no filter, so the
   * finished <urlset> is filtered instead.
   */
  if (params.type === 'collections') {
    const linkable = await context.strapi.getCollectionHandles();
    const xml = await response.text();
    const filtered = xml.replace(/<url>[\s\S]*?<\/url>\s*/g, (entry) => {
      const handle = entry.match(/\/collections\/([^/<?#]+)\s*<\/loc>/)?.[1];
      return handle && linkable.has(decodeURIComponent(handle)) ? entry : '';
    });
    return new Response(filtered, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
}

/** @typedef {import('./+types/sitemap.$type.$page[.xml]').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
