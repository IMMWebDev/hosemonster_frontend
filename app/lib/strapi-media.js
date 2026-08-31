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
