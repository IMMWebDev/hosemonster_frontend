import {useMemo} from 'react';
import {
  WithPhotoViewer,
  usePhotoViewer,
} from '~/components/cms/blog/PhotoViewer';
import {strapiMedia, strapiSrcSet, warnMissingAlt} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './BlogModules.module.css';

/**
 * Blog Modules › Image — one image in a blog post's body, with an optional
 * caption (sprint-05 hifi_blogposttemplate.html's figure).
 *
 * `imageStyle` "photo" (and null — the enum default applies on create only)
 * fills the text column in a 16:9 crop, as drawn. "fit" shows the whole image
 * at its own size or smaller, for the diagrams and small figures the old
 * WordPress posts carry, which a 16:9 crop would cut apart.
 *
 * Either way the image is a button that opens the post's photo viewer at it
 * (PhotoViewer.jsx) — the full photo, uncropped, among the post's others. A
 * "photo" zooms slightly on hover, as the gallery tiles do; a "fit" image
 * doesn't, because zooming a diagram inside its frame crops off its edges.
 *
 * @param {{
 *   data: {
 *     image?: import('~/lib/strapi-media').StrapiImage,
 *     caption?: string,
 *     imageStyle?: 'photo' | 'fit' | null,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function BlogImage({data, baseUrl}) {
  // As BlockManager had the block, for a viewer of its own when there's no
  // post around it (see WithPhotoViewer).
  const module = useMemo(
    () => ({__component: 'blog-modules.image', ...data}),
    [data],
  );

  return (
    <WithPhotoViewer module={module} baseUrl={baseUrl}>
      <Figure data={data} baseUrl={baseUrl} />
    </WithPhotoViewer>
  );
}

/**
 * @param {{
 *   data: {
 *     image?: import('~/lib/strapi-media').StrapiImage,
 *     caption?: string,
 *     imageStyle?: 'photo' | 'fit' | null,
 *   },
 *   baseUrl?: string,
 * }} props
 */
function Figure({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const viewer = usePhotoViewer();
  const image = data?.image;
  const src = strapiMedia(image?.url, baseUrl);
  if (!image || !src) return null;

  const isFit = data.imageStyle === 'fit';
  const at = viewer?.indexOf(image) ?? -1;
  // From the Media Library's Alternative text; empty when unset, so a screen
  // reader skips it rather than reading out a filename.
  const alt = image.alternativeText ?? '';
  warnMissingAlt(image, 'Blog image');

  return (
    <div {...trackingRoot} className={styles.block}>
      <figure className={styles.figure} data-reveal>
        <button
          type="button"
          className={isFit ? styles.fitButton : styles.photoButton}
          onClick={(event) =>
            viewer?.open(Math.max(at, 0), event.currentTarget)
          }
          data-track-id={trackId('photo')}
        >
          <img
            src={src}
            /*
             * A "photo" always fills the column, so it can take a format
             * sized to it. Not a "fit" image: with a srcset its size on the
             * page becomes the `sizes` width, and a 380px figure would be
             * blown up to the column.
             */
            srcSet={isFit ? undefined : strapiSrcSet(image, baseUrl)}
            sizes={isFit ? undefined : `(max-width: 499px) 100vw, 760px`}
            alt={alt}
            className={isFit ? styles.fit : styles.photo}
            // Natural size, so the browser reserves the space before it loads.
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
          />
          {/* No alt text: the button still needs a name. */}
          {alt ? null : (
            <span className="sr-only">
              Open photo {at + 1} of {viewer?.count ?? 1}
            </span>
          )}
        </button>
        {data.caption ? (
          <figcaption className={styles.caption}>{data.caption}</figcaption>
        ) : null}
      </figure>
    </div>
  );
}
