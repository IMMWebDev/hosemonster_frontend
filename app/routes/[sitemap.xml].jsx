import {getSitemapIndex} from '@shopify/hydrogen';

/**
 * Sitemap index. `getSitemapIndex` builds the Shopify sitemap index
 * (products, collections, Shopify pages, blogs). We then inject the CMS
 * sitemap (`/sitemap-pages.xml`, the Strapi pages) so search engines find
 * everything from a single entry point.
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context: {storefront}}) {
  const response = await getSitemapIndex({
    storefront,
    request,
  });

  const origin = new URL(request.url).origin;
  const cmsSitemap = `<sitemap><loc>${origin}/sitemap-pages.xml</loc></sitemap>`;

  let body = await response.text();
  if (body.includes('</sitemapindex>')) {
    body = body.replace('</sitemapindex>', `${cmsSitemap}</sitemapindex>`);
  }

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return new Response(body, {status: response.status, headers});
}

/** @typedef {import('./+types/[sitemap.xml]').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
