import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';

/**
 * ImageContent module — a text lockup beside an image.
 *
 * Ported from nextjs-sample/components/modules/imageContent (+ its TextLockup),
 * converted from styled-components to plain CSS classes (see app/styles/app.css).
 * This is a representative starter module — adapt the fields to your real Strapi
 * `module.image-content` schema.
 *
 * @param {{
 *   data: {
 *     colorMode?: string,
 *     imageSide?: string,
 *     image?: {url?: string, alternativeText?: string},
 *     content?: {
 *       eyebrow?: string, title?: string, copy?: string,
 *       primaryCTA?: object, secondaryCTA?: object
 *     }
 *   },
 *   baseUrl?: string
 * }} props
 */
export default function ImageContent({data, baseUrl}) {
  const {colorMode = '', imageSide = 'Left', image, content = {}} = data ?? {};
  const {eyebrow, title, copy, primaryCTA, secondaryCTA} = content;
  const imageUrl = strapiMedia(image?.url, baseUrl);

  return (
    <section
      className={`cms-image-content ${colorMode} side-${(imageSide || 'Left').toLowerCase()}`}
    >
      <div className="cms-image-content__inner">
        <div className="cms-image-content__text">
          {eyebrow ? <p className="cms-eyebrow">{eyebrow}</p> : null}
          {title ? <h2>{title}</h2> : null}
          {copy ? <p>{copy}</p> : null}
          {primaryCTA || secondaryCTA ? (
            <div className="cms-button-wrapper">
              {primaryCTA ? (
                <CmsLink link={primaryCTA} className="cms-button cms-button--primary" />
              ) : null}
              {secondaryCTA ? (
                <CmsLink
                  link={secondaryCTA}
                  className="cms-button cms-button--secondary"
                />
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="cms-image-content__media">
          {imageUrl ? (
            <img src={imageUrl} alt={image?.alternativeText ?? ''} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
