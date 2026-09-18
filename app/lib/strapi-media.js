/**
 * Resolve a Strapi media URL to something the browser can load.
 *
 * Strapi may serve either absolute URLs (when using a CDN/Cloudinary upload
 * provider) or relative paths like `/uploads/foo.png` (the default local
 * provider). Absolute URLs are returned as-is; relative paths are prefixed
 * with the Strapi origin (`STRAPI_API_URL`, passed through loader data).
 *
 * @param {string | null | undefined} url
 * @param {string} [baseUrl] - The Strapi origin (env.STRAPI_API_URL)
 * @returns {string | undefined}
 */
export function strapiMedia(url, baseUrl) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith('//')) return url;
  return `${(baseUrl ?? '').replace(/\/$/, '')}${url}`;
}

/**
 * A browser-displayable thumbnail for a media asset that may be a PDF.
 *
 * Strapi hands back the PDF's own URL, which an <img> cannot render. Cloudinary
 * can: inserting `pg_1,f_jpg` into the delivery path returns the first page as a
 * JPEG, so a single upload serves as both the document and its cover. That is
 * why the CMS takes the PDF itself rather than asking an editor to export a
 * thumbnail and upload it alongside — one file, no drift between the two.
 *
 * Cloudinary-specific by necessity, and written to fail soft: anything that is
 * not a PDF on a Cloudinary `/upload/` path comes back untouched, so a plain
 * image asset, a local-provider path, or a future move off Cloudinary all keep
 * working — a PDF would simply stop rendering a preview rather than break.
 *
 * Note this needs "Allow delivery of PDF and ZIP files" enabled on the
 * Cloudinary account; without it the derived URL 401s.
 *
 * @param {{url?: string, mime?: string} | null | undefined} asset
 * @param {string} [baseUrl] - The Strapi origin (env.STRAPI_API_URL)
 * @param {{width?: number}} [options]
 * @returns {string | undefined}
 */
export function documentThumbnail(asset, baseUrl, options = {}) {
  const url = strapiMedia(asset?.url, baseUrl);
  if (!url) return undefined;
  if (asset?.mime !== 'application/pdf') return url;
  if (!url.includes('/upload/')) return url;

  const width = options.width ?? 184; // 92px at 2x
  /* c_fill + g_north keeps the top of the page, which is where a report's
     header and title are — c_fit would letterbox it into the card. */
  return url.replace(
    '/upload/',
    `/upload/pg_1,f_jpg,q_auto,w_${width},c_fill,g_north/`,
  );
}
