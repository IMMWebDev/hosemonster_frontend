import CmsLink from '~/components/cms/CmsLink';
import RaisedMarks from '~/components/cms/RaisedMarks';
import VideoCard from '~/components/cms/video/VideoCard';
import {useVideoPlayer} from '~/components/cms/video/VideoPlayer';
import {linkDestination} from '~/lib/cms-links';
import {useTrackingRoot} from '~/lib/tracking';
import {JsonLd} from '~/components/JsonLd';
import {isPlayable, videoCardsJsonLd} from '~/lib/videos';
import styles from './FeaturedVideos.module.css';

/**
 * Featured Videos module — sprint-05 hifi_hmuhub.html, "Three places to
 * start".
 *
 * A heading over a row of hand-picked video cards (the Videos collection
 * type), in the order they were picked, and an optional arrow link under the
 * row. A card plays its video in the pop-up player. A video that isn't
 * published doesn't come back from Strapi on the live page, so it simply
 * isn't there; with none left, the module hides.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     videos?: Array<object>,
 *     link?: object | null,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function FeaturedVideos({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const player = useVideoPlayer();
  const {eyebrow, heading, body, link} = data ?? {};
  const videos = (data?.videos ?? []).filter(isPlayable);
  if (!heading || videos.length === 0) return null;

  const hasLink = Boolean(link?.linkText && linkDestination(link));

  return (
    <section {...trackingRoot} className={styles.section}>
      <JsonLd data={videoCardsJsonLd(videos, baseUrl)} />
      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          <RaisedMarks text={heading} />
        </h2>
        {body ? (
          <p className={styles.body} data-reveal style={{'--reveal-i': 2}}>
            {body}
          </p>
        ) : null}

        <ul className={styles.grid}>
          {videos.map((video, i) => (
            <li
              key={video.documentId ?? video.id ?? i}
              className={styles.item}
              data-reveal
              style={{'--reveal-i': i + 3}}
            >
              <VideoCard
                video={video}
                onPlay={player.open}
                trackRole={`video-${i + 1}`}
                baseUrl={baseUrl}
                showDuration
                titleStyle="display"
              />
            </li>
          ))}
        </ul>

        {hasLink ? (
          <CmsLink
            link={link}
            className={styles.link}
            trackRole="link"
            dataReveal
          >
            {link.linkText}
            <svg
              className={styles.chevron}
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
          </CmsLink>
        ) : null}
      </div>
      {player.dialog}
    </section>
  );
}
