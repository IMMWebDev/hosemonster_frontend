import CmsLink from '~/components/cms/CmsLink';
import VideoEmbed from '~/components/cms/VideoEmbed';
import {youTubeId} from '~/lib/youtube';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './TextMedia.module.css';

/**
 * Text & Media module — Figma "Homepage" → Hifi → Main → Section (7:1581).
 *
 * A text lockup (eyebrow, heading, body, bullets, up to two CTAs) beside an
 * image or video. Page-agnostic: `mediaSide` flips the visual order so several
 * of these can alternate down a page without a second module.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     bullets?: Array<{id: number, label: string}>,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     image?: {url?: string, alternativeText?: string},
 *     videoUrl?: string,
 *     mediaSide?: 'left' | 'right',
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function TextMedia({data, baseUrl}) {
  const {
    eyebrow,
    heading,
    body,
    bullets = [],
    primaryCTA,
    secondaryCTA,
    videoUrl,
    mediaSide = 'right',
  } = data ?? {};

  if (!heading) return null;

  const imageUrl = strapiMedia(data.image?.url, baseUrl);
  // Alt comes from the Media Library's own alternativeText. Empty string when
  // unset, which marks it decorative rather than announcing a filename.
  const imageAlt = data.image?.alternativeText ?? '';

  /*
   * The media column is an image, a video, or nothing.
   *
   * `videoUrl` wins when both are set: the image then becomes the video's
   * poster rather than a separate thing to render. An unparseable URL falls
   * back to the image, so a typo degrades to the old behaviour instead of
   * blanking the column.
   */
  /*
   * Split the body on blank lines into real paragraphs.
   *
   * It used to render as one <p> with `white-space: pre-line`, which turns a
   * blank line in the CMS into a full empty line box — at 18px on a 1.7 line
   * height that is ~31px of dead space between paragraphs, far more than the
   * design wants. Real <p>s let the gap be set in CSS instead of being dictated
   * by the type scale.
   */
  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const videoId = youTubeId(videoUrl);
  const hasMedia = Boolean(videoId || imageUrl);

  return (
    <section className={styles.section}>
      <div
        className={`${styles.inner} ${mediaSide === 'left' ? styles.mediaLeft : ''}`}
      >
        <div className={styles.copy}>
          {eyebrow ? (
            <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
              {eyebrow}
            </p>
          ) : null}
          <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
            {heading}
          </h2>
          {body ? (
            <div className={styles.body} data-reveal style={{'--reveal-i': 2}}>
              {paragraphs.map((para, i) => (
                <p key={`para-${i}`}>{para}</p>
              ))}
            </div>
          ) : null}

          {bullets.length > 0 && (
            <ul className={styles.bullets}>
              {bullets.map((item, i) => (
                <li className={styles.bullet} key={item.id ?? i}>
                  {item.label}
                </li>
              ))}
            </ul>
          )}

          {(primaryCTA?.linkText || secondaryCTA?.linkText) && (
            <div className={styles.actions}>
              {primaryCTA?.linkText ? (
                <CmsLink link={primaryCTA} className="btn btn--primary" />
              ) : null}
              {secondaryCTA?.linkText ? (
                <CmsLink link={secondaryCTA} className="btn btn--secondary" />
              ) : null}
            </div>
          )}
        </div>

        {hasMedia ? (
          <div
            className={styles.media}
            data-reveal={mediaSide === 'left' ? 'left' : 'right'}
          >
            {videoId ? (
              <VideoEmbed
                videoId={videoId}
                posterUrl={imageUrl}
                posterAlt={imageAlt}
                videoTitle={heading}
                className={styles.videoWrap}
                imageClassName={styles.mediaImage}
                buttonClassName={styles.playButton}
                iconClassName={styles.playIcon}
                frameClassName={styles.videoFrame}
                imageProps={{'data-parallax': 'slow'}}
              />
            ) : (
              <img
                src={imageUrl}
                alt={imageAlt}
                className={styles.mediaImage}
                data-parallax="slow"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
