/**
 * Props for Hydrogen's <Image> that keep small Shopify uploads sharp.
 *
 * Two things went wrong with a small file (the BigBoy's 365px gauge close-up):
 *
 *  1. Hydrogen builds its srcset as 200, 400, 600… px and drops every width
 *     larger than the source — so a 365px file was offered ONLY at 200px, and
 *     the browser stretched that to fill the frame. For a file this small the
 *     one candidate is its own width, so the browser gets the real thing.
 *
 *  2. Shopify's CDN re-encodes every image to WebP. A second lossy pass over a
 *     file that's already small and compressed shows as blotches; the same
 *     file looks clean on the WordPress site, which serves it untouched.
 *     `format=pjpg` makes the CDN send it as JPEG. Only for JPEGs — a PNG
 *     would lose its transparency — and only small ones: large photos are
 *     scaled down, where WebP's re-encode doesn't show and keeps them light.
 */

/** At or under this width a file is served at its own size, as itself. */
const SMALL = 1200;

/**
 * @param {{url?: string, width?: number | null}} image - Shopify Image
 * @returns {{srcSetOptions?: object, loader: Function}}
 */
export function sharpImageProps(image) {
  const width = image?.width ?? null;
  const small = width != null && width <= SMALL;
  const jpeg = /\.jpe?g(\?|$)/i.test(image?.url ?? '');

  return {
    ...(small
      ? {
          srcSetOptions: {
            intervals: 1,
            startingWidth: width,
            incrementSize: 1,
            placeholderWidth: width,
          },
        }
      : {}),
    loader: ({src, width: w, height: h, crop}) => {
      const url = new URL(src);
      if (w) url.searchParams.set('width', String(Math.round(w)));
      if (h) url.searchParams.set('height', String(Math.round(h)));
      if (crop && (w || h)) url.searchParams.set('crop', crop);
      if (small && jpeg) url.searchParams.set('format', 'pjpg');
      return url.toString();
    },
  };
}
