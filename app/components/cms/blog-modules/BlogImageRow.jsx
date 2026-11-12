import {useMemo} from 'react';
import {
  WithPhotoViewer,
  usePhotoViewer,
} from '~/components/cms/blog/PhotoViewer';
import {
  strapiLargest,
  strapiMedia,
  strapiSrcSet,
  warnMissingAlt,
} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './BlogModules.module.css';

/** Tiles in the mosaic on a tablet or desktop; the rest wait behind "+N". */
const MAX_TILES = 5;
/** Tiles where the mosaic stacks (a phone; 5+ under 700px), where five would
 * be thumbnails again. */
const MAX_TILES_SM = 3;
/** The post's article column at its widest (BlogBody.module.css). */
const COLUMN_PX = 760;

/**
 * Blog Modules › Image Gallery (Strapi uid blog-modules.image-row — the
 * component was "Image Row", and kept its uid and fields when it was
 * redesigned, so existing posts needed no migration).
 *
 * Photos in a post's body as a mosaic that keeps about the same footprint
 * however many there are. The old row put every photo side by side, so each
 * one added made them all smaller: four across the 760px column were 180px
 * thumbnails. Now the layout changes with the count instead (data-count, all
 * in BlogModules.module.css):
 *
 *   1  one 16:9 photo          3  a feature photo + two stacked, 16:9 overall
 *   2  two 4:3 side by side    4  a 2×2 grid, 16:9 overall
 *   5+ a feature photo + a 2×2 grid, 16:9 overall
 *
 * More than five: the fifth tile shows "+3" (or however many are left) over
 * a navy scrim. The rest aren't drawn as tiles, but they're all in the photo
 * viewer, which every tile opens. On a phone it's a feature photo over two,
 * with the "+N" on the third — and five or more stack that way below 700px
 * too, where the 2×2 beside the feature would be thumbnails again.
 *
 * Every tile is a button that opens the post's photo viewer at that photo
 * (PhotoViewer.jsx), named by its alt text — or "Open photo 3 of 7" when the
 * Media Library has none. The "+N" tile adds ", plus 3 more photos".
 *
 * @param {{
 *   data: {
 *     images?: Array<import('~/lib/strapi-media').StrapiImage & {id?: number}>,
 *     caption?: string,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function BlogImageRow({data, baseUrl}) {
  // As BlockManager had the block, for a viewer of its own when there's no
  // post around it (see WithPhotoViewer).
  const module = useMemo(
    () => ({__component: 'blog-modules.image-row', ...data}),
    [data],
  );

  return (
    <WithPhotoViewer module={module} baseUrl={baseUrl}>
      <Gallery data={data} baseUrl={baseUrl} />
    </WithPhotoViewer>
  );
}

/**
 * @param {{
 *   data: {
 *     images?: Array<import('~/lib/strapi-media').StrapiImage & {id?: number}>,
 *     caption?: string,
 *   },
 *   baseUrl?: string,
 * }} props
 */
function Gallery({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const viewer = usePhotoViewer();
  // The original objects, not copies: the viewer finds a photo by identity.
  const images = (data?.images ?? []).filter((image) =>
    strapiMedia(image?.url, baseUrl),
  );

  if (images.length === 0) return null;
  // Every photo, not just the tiles drawn: the rest open in the viewer.
  images.forEach((image) => warnMissingAlt(image, 'Blog gallery photo'));

  const count = images.length;
  const shown = Math.min(count, MAX_TILES);

  return (
    <div {...trackingRoot} className={styles.block}>
      <figure className={styles.figure} data-reveal>
        {/* "5" means five or more — the layout stops changing there. */}
        <div className={styles.gallery} data-count={shown}>
          {images.slice(0, MAX_TILES).map((image, i) => {
            const at = viewer?.indexOf(image) ?? -1;
            const alt = image.alternativeText ?? '';
            // The last tile at each size stands for the photos it can't show.
            const moreLg = i === MAX_TILES - 1 ? count - MAX_TILES : 0;
            const moreSm = i === MAX_TILES_SM - 1 ? count - MAX_TILES_SM : 0;

            return (
              <button
                // A post can hold the same photo twice (same media id), so
                // the position is the key; the list never reorders.
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                type="button"
                className={styles.tile}
                onClick={(event) =>
                  viewer?.open(Math.max(at, 0), event.currentTarget)
                }
                data-track-id={trackId(`photo-${i + 1}`)}
              >
                <img
                  src={strapiLargest(image, baseUrl)?.url}
                  srcSet={strapiSrcSet(image, baseUrl)}
                  sizes={tileSizes(shown, i)}
                  alt={alt}
                  width={image.width}
                  height={image.height}
                  className={styles.tileImage}
                  loading="lazy"
                  decoding="async"
                />
                {/* No alt text: the button still needs a name. */}
                {alt ? null : (
                  <span className="sr-only">
                    Open photo {at + 1} of {viewer?.count ?? count}
                  </span>
                )}
                {/*
                  "+N" adds to the tile's name rather than replacing it —
                  "Crew testing a hose, plus 2 more photos" — the same way
                  at every size, since the tile still opens the viewer at
                  its own photo. Only the overlay showing at this size is
                  read (the other is display: none).
                */}
                {moreLg > 0 ? (
                  <MoreOverlay className={styles.moreLg} more={moreLg} />
                ) : null}
                {moreSm > 0 ? (
                  <MoreOverlay className={styles.moreSm} more={moreSm} />
                ) : null}
              </button>
            );
          })}
        </div>
        {data.caption ? (
          <figcaption className={styles.caption}>{data.caption}</figcaption>
        ) : null}
      </figure>
    </div>
  );
}

/**
 * The "+3" over the last tile a mosaic shows, and the words a screen reader
 * gets for it instead, appended to the tile's name.
 *
 * @param {{className: string, more: number}} props
 */
function MoreOverlay({className, more}) {
  return (
    <span className={`${styles.more} ${className}`}>
      <span aria-hidden="true">+{more}</span>
      <span className="sr-only">
        , plus {more} more {more === 1 ? 'photo' : 'photos'}
      </span>
    </span>
  );
}

/**
 * The `sizes` for tile `i` of a `shown`-tile mosaic: its share of the 760px
 * column on a tablet or desktop, and of the screen where the mosaic stacks —
 * a phone, or for five or more photos anything under 700px — so the browser
 * picks the 500px format for a half-width phone tile and the 1000px one for
 * a feature photo on a retina laptop. Tiles hidden in the stack are lazy and
 * display: none there, so they never load at all.
 *
 * @param {number} shown 1–5
 * @param {number} i
 */
function tileSizes(shown, i) {
  const feature = i === 0;
  const lg =
    shown === 1
      ? 1
      : shown === 3
        ? feature
          ? 2 / 3
          : 1 / 3
        : shown === 5
          ? feature
            ? 1 / 2
            : 1 / 4
          : 1 / 2;
  const sm = shown === 1 || (shown >= 3 && feature) ? 1 : 1 / 2;
  // The stack's breakpoint — mobile, or mdTablet for 5+ (BlogModules.module.css).
  const stack = shown === 5 ? 699 : 499;
  return `(max-width: ${stack}px) ${sm * 100}vw, ${Math.round(lg * COLUMN_PX)}px`;
}
