import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './BlogModules.module.css';

/**
 * Blog Modules › CTA Card — a card in a blog post's body that sends the reader
 * on (sprint-05 hifi_blogposttemplate.html, "See the equipment").
 *
 * Heading, Body and the Link's text with the arrow on the left; the product
 * shot on the right, whole (contain), never cropped. The whole card is the
 * link, with the Styleguide §05 card hover: the border turns orange, the card
 * lifts, the shot scales and the arrow steps out.
 *
 * ≤499px the shot moves above the copy, centred.
 *
 * @param {{
 *   data: {
 *     heading?: string,
 *     body?: string,
 *     link?: {linkText?: string} & Record<string, any>,
 *     image?: {url?: string, width?: number, height?: number} | null,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function BlogCtaCard({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const heading = data?.heading?.trim();
  if (!heading || !data.link) return null;

  const body = data.body?.trim();
  const label = data.link.linkText?.trim();
  const imageUrl = strapiMedia(data.image?.url, baseUrl);

  return (
    <div {...trackingRoot} className={styles.block}>
      <CmsLink
        link={data.link}
        className={`${styles.ctaCard} ${imageUrl ? '' : styles.ctaCardText}`}
        trackRole="primary-cta"
        markCurrent={false}
        dataReveal
      >
        <div className={styles.ctaCopy}>
          <p className={styles.ctaHeading}>{heading}</p>
          {body ? <p className={styles.ctaBody}>{body}</p> : null}
          {label ? (
            <span className={styles.ctaLabel}>
              {label}
              <svg
                className={styles.ctaChevron}
                width="6"
                height="11"
                viewBox="-12 -12 682 1229"
                aria-hidden="true"
                focusable="false"
              >
                <polygon
                  points="0,0 225,0 658,602 225,1205 0,1205 423,602"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="24"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : null}
        </div>
        {imageUrl ? (
          <img
            src={imageUrl}
            // Decorative: the heading and the link's text say where it goes.
            alt=""
            className={styles.ctaImage}
            width={data.image.width}
            height={data.image.height}
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </CmsLink>
    </div>
  );
}
