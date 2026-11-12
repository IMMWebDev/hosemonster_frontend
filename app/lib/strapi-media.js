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
 * @typedef {{url?: string, width?: number, height?: number}} StrapiImageFormat
 * @typedef {StrapiImageFormat & {
 *   alternativeText?: string | null,
 *   formats?: Partial<Record<'thumbnail' | 'small' | 'medium' | 'large', StrapiImageFormat>> | null,
 * }} StrapiImage
 */

/** Strapi's responsive formats, smallest first — `thumbnail` is too small to use. */
const RESPONSIVE_FORMATS = /** @type {const} */ (['small', 'medium', 'large']);

/**
 * The biggest copy of an image worth sending to a browser, with its size: the
 * `large` format (1000px wide) when Strapi made one, otherwise the original.
 *
 * Strapi only makes a format when the upload is wider than it, so a missing
 * `large` means the original is 1000px or less — cheap enough to use as is.
 * A present one means the original may be a 6000px camera file, which no
 * screen here needs.
 *
 * @param {StrapiImage | null | undefined} image
 * @param {string} [baseUrl] - The Strapi origin (env.STRAPI_API_URL)
 * @returns {{url: string, width?: number, height?: number} | undefined}
 */
export function strapiLargest(image, baseUrl) {
  const large = image?.formats?.large;
  const source = large?.url ? large : image;
  const url = strapiMedia(source?.url, baseUrl);
  if (!url) return undefined;
  return {url, width: source.width, height: source.height};
}

/**
 * A `srcset` built from an image's responsive formats (500 / 750 / 1000px
 * wide), so a phone's half-width tile doesn't download a desktop-sized photo.
 *
 * The original is always the widest candidate. Without it the set would top
 * out at 1000px, and a photo shown wider than that on a retina screen (a
 * 760px Image module, the full-screen photo viewer) would come out softer
 * than the plain original it replaced. Browsers take the smallest candidate
 * that's sharp enough — Chrome leans to the smaller of two — so a 6000px
 * camera file is only fetched where a 1000px one clearly falls short.
 * Undefined when there is nothing to choose between, so the plain `src` does
 * the job.
 *
 * @param {StrapiImage | null | undefined} image
 * @param {string} [baseUrl] - The Strapi origin (env.STRAPI_API_URL)
 * @returns {string | undefined}
 */
export function strapiSrcSet(image, baseUrl) {
  const formats = [
    ...RESPONSIVE_FORMATS.map((name) => image?.formats?.[name]),
    image ?? undefined,
  ];

  /** @type {Map<number, string>} */
  const byWidth = new Map();
  for (const format of formats) {
    const url = strapiMedia(format?.url, baseUrl);
    if (url && format?.width && !byWidth.has(format.width)) {
      byWidth.set(format.width, url);
    }
  }
  if (byWidth.size < 2) return undefined;

  return [...byWidth]
    .sort(([a], [b]) => a - b)
    .map(([width, url]) => `${url} ${width}w`)
    .join(', ');
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

/** Images already reported, so a re-render doesn't repeat the warning. */
const warnedMissingAlt = new Set();

/**
 * Development only: a console warning when a content image (never a
 * background) has no Alternative text in the Media Library. It then renders
 * as alt="", which screen readers skip, so the gap can't be seen on the page;
 * this surfaces it during content entry. Once per image and place.
 *
 * A no-op in production, and it only logs, so the markup and hydration are
 * untouched.
 *
 * @param {(StrapiImage & {name?: string}) | null | undefined} media
 * @param {string} where - the module and slot, e.g. "Text & Media image"
 */
export function warnMissingAlt(media, where) {
  if (!import.meta.env.DEV) return;
  if (!media?.url || media.alternativeText?.trim()) return;
  const key = `${where}|${media.url}`;
  if (warnedMissingAlt.has(key)) return;
  warnedMissingAlt.add(key);
  console.warn(
    `[CMS] ${where} "${media.name || media.url}" has no Alternative text in the Strapi Media Library, so screen readers skip it. Add one there.`,
  );
}
