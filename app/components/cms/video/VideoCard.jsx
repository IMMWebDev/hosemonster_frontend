import {useId} from 'react';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {useTrackId} from '~/lib/tracking';
import {videoThumbnail} from '~/lib/videos';
import {youTubeId} from '~/lib/youtube';
import styles from './VideoCard.module.css';

/**
 * A video card — thumbnail with a play button, then the video's name.
 * Featured Videos and Video Library share it (sprint-05 hifi_hmuhub.html,
 * "Three places to start"; hifi_hmuvideos.html, the groups).
 *
 * The card is a real link to the video on YouTube, so it works before the
 * page's JavaScript has loaded (and opens in a new tab with a modifier key
 * held). A plain click plays it in the page's pop-up player instead —
 * `onPlay`, from useVideoPlayer.
 *
 * The hover is the house card hover: border to orange, the card lifts, the
 * thumbnail scales. The card is the one target, so nothing inside it has a
 * hover of its own.
 *
 * @param {{
 *   video: {
 *     name: string,
 *     youtubeUrl: string,
 *     duration?: string | null,
 *     thumbnail?: object | null,
 *     tag?: {name?: string} | null,
 *   },
 *   onPlay?: (video: object, opener: HTMLElement) => void,
 *   trackRole: string,
 *   baseUrl?: string,
 *   showTag?: boolean,
 *   showDuration?: boolean,
 *   titleStyle?: 'display' | 'body',
 * }} props
 */
export default function VideoCard({
  video,
  onPlay,
  trackRole,
  baseUrl,
  showTag = false,
  showDuration = false,
  titleStyle = 'body',
}) {
  const trackId = useTrackId();
  const labelId = useId();
  const id = youTubeId(video.youtubeUrl);
  if (!id) return null;
  const thumb = videoThumbnail(video, baseUrl);
  const duration = showDuration ? video.duration?.trim() : '';
  const tag = showTag ? video.tag?.name : '';
  // Left to reading order the link's name starts "Length 1:13 …", so every
  // card in a screen reader's links list sounds alike. The video's name goes
  // first, then the tag and the length; "Play video" becomes the description.
  const labelledBy = [
    `${labelId}-title`,
    tag ? `${labelId}-tag` : '',
    duration ? `${labelId}-duration` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      href={`https://www.youtube.com/watch?v=${id}`}
      className={styles.card}
      data-track-id={trackId(trackRole)}
      aria-haspopup="dialog"
      aria-labelledby={labelledBy}
      aria-describedby={`${labelId}-action`}
      onClick={(event) => {
        // Let a modified click (new tab, new window) through to YouTube.
        if (
          !onPlay ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        onPlay(video, event.currentTarget);
      }}
    >
      <span className={styles.media}>
        {thumb ? (
          <img
            src={thumb.src}
            srcSet={thumb.srcSet}
            sizes="(max-width: 699px) 100vw, (max-width: 1099px) 50vw, 460px"
            // Decorative: the card's name says what the video is.
            alt=""
            className={styles.image}
            width={thumb.width}
            height={thumb.height}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <span className={styles.play} aria-hidden="true">
          <svg width="18" height="20" viewBox="0 0 18 20" focusable="false">
            <path d="M2 1.5v17L16.5 10z" fill="currentColor" />
          </svg>
        </span>
        {duration ? (
          <span id={`${labelId}-duration`} className={styles.duration}>
            <span className="sr-only">Length </span>
            {duration}
          </span>
        ) : null}
      </span>

      <span className={styles.body}>
        {tag ? (
          <span id={`${labelId}-tag`} className={styles.tag}>
            <RaisedMarks text={tag} />
          </span>
        ) : null}
        <span
          className={
            titleStyle === 'display'
              ? `${styles.title} ${styles.titleDisplay}`
              : styles.title
          }
        >
          <span id={`${labelId}-action`} className="sr-only">
            Play video:{' '}
          </span>
          <span id={`${labelId}-title`}>
            <RaisedMarks text={video.name} />
          </span>
        </span>
      </span>
    </a>
  );
}
