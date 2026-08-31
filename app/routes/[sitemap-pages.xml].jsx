/**
 * Sitemap for Strapi CMS pages.
 *
 * Hydrogen's built-in sitemap ([sitemap.xml].jsx → getSitemapIndex) only covers
 * Shopify resources (products, collections, Shopify pages, blogs). The CMS pages
 * served by the catch-all route ($.jsx) are invisible to it, so we emit a
 * separate <urlset> here and reference it from robots.txt. Resilient by design:
 * if Strapi is unreachable or empty, it returns a valid (possibly empty) sitemap
 * rather than erroring.
 *
 * @param {Route.LoaderArgs} args
 */
export async function loader({request, context}) {
  const origin = new URL(request.url).origin;
  const entries = [];

  try {
    const pageSize = 100;
    let page = 1;
    // Bounded loop (max 50 pages × 100 = 5000 URLs) so a bad pageCount can't
    // spin forever.
    for (let i = 0; i < 50; i++) {
      const payload = await context.strapi.fetch('pages', {
        fields: ['path', 'updatedAt'],
        pagination: {page, pageSize},
        status: 'published',
        sort: 'path',
      });

      for (const row of payload?.data ?? []) {
        if (row?.path) entries.push({path: row.path, lastmod: row.updatedAt});
      }

      const pageCount = payload?.meta?.pagination?.pageCount ?? 1;
      if (page >= pageCount) break;
      page += 1;
    }
  } catch (error) {
    console.error('CMS sitemap: failed to load Strapi pages', error);
    // Fall through and emit whatever we have (possibly nothing).
  }

  const urls = entries
    .map(({path, lastmod}) => {
      const loc = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
      const lastmodTag = lastmod
        ? `\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`
        : '';
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}

/**
 * @param {string} value
 */
function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** @typedef {import('./+types/[sitemap-pages.xml]').Route} Route */
