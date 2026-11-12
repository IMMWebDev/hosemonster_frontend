import CmsLink from '~/components/cms/CmsLink';
import VideoEmbed from '~/components/cms/VideoEmbed';
import {useTrackingRoot} from '~/lib/tracking';
import {youTubeId} from '~/lib/youtube';
import {strapiMedia, warnMissingAlt} from '~/lib/strapi-media';
import styles from './TextMedia.module.css';

/**
 * Text & Media module — Figma "Homepage" → Hifi → Main → Section (7:1581).
 *
 * A text lockup (eyebrow, heading, body, bullets, up to two CTAs, a footnote)
 * beside an image or video. Page-agnostic: `mediaSide` flips which side the
 * media sits on, and with it on the left the eyebrow and heading move up to
 * span both columns (sprint-04 hifi_smartmonsterfeature.html, "Watch it work").
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     bullets?: Array<{id: number, label: string}>,
 *     primaryCTA?: object,
 *     secondaryCTA?: object,
 *     footnote?: string,
 *     image?: {url?: string, alternativeText?: string},
 *     videoUrl?: string,
 *     mediaSide?: 'left' | 'right',
 *     background?: 'white' | 'grey' | 'navy',
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function TextMedia({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const {
    eyebrow,
    heading,
    body,
    bullets = [],
    primaryCTA,
    secondaryCTA,
    footnote,
    videoUrl,
    imageStyle,
    mediaSide = 'right',
    background,
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
  // A video's poster sits behind a labelled Play button; a plain image is
  // content and needs its own alt text.
  if (imageUrl && !videoId) warnMissingAlt(data.image, 'Text & Media image');

  /*
   * Only "grey" and "navy" get a class. Strapi applies an enum default on
   * CREATE only, so a Text & Media authored before this field existed returns
   * null rather than "white" — treating anything else as white covers both.
   */
  const backgroundClass =
    {grey: styles.grey, navy: styles.navy}[background] ?? '';

  /*
   * mediaSide="left" is the Smart Monster layout: the eyebrow and heading run
   * across the top, then the media and the rest of the copy sit side by side
   * under them. "right" keeps the original lockup, heading inside the copy
   * column. Either way the DOM follows the visual order, so the tablet stack
   * and screen readers read it the way it looks: heading, then media first
   * when it's on the left.
   */
  const mediaLeft = mediaSide === 'left';

  const lockup = (
    <>
      {eyebrow ? (
        <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
        {heading}
      </h2>
    </>
  );

  const copy = (
    <div className={styles.copy}>
      {mediaLeft ? null : lockup}
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
            <CmsLink
              link={primaryCTA}
              className="btn btn--primary"
              trackRole="primary-cta"
            />
          ) : null}
          {secondaryCTA?.linkText ? (
            <CmsLink
              link={secondaryCTA}
              className="btn btn--secondary"
              trackRole="secondary-cta"
            />
          ) : null}
        </div>
      )}

      {footnote ? <p className={styles.footnote}>{footnote}</p> : null}
    </div>
  );

  /*
   * "fit" (images only): the whole image at its own proportions in a
   * bordered white frame — a chart can't lose its axes to a 16:9 crop, and a
   * parallax drift would slide its labels around. Null is "photo".
   */
  const isFit = imageStyle === 'fit' && !videoId;

  const media = hasMedia ? (
    <div
      className={isFit ? `${styles.media} ${styles.fit}` : styles.media}
      data-reveal={mediaLeft ? 'left' : 'right'}
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
          data-parallax={isFit ? undefined : 'slow'}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  ) : null;

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
      {mediaLeft ? <div className={styles.header}>{lockup}</div> : null}
      <div className={styles.inner}>
        {mediaLeft ? media : copy}
        {mediaLeft ? copy : media}
      </div>
    </section>
  );
}
