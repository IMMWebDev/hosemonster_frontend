import {useState} from 'react';
import {youTubeEmbedUrl, youTubeThumbnail} from '~/lib/youtube';

/**
 * Click-to-play YouTube embed.
 *
 * The iframe is NOT rendered until the poster is clicked. YouTube's player
 * pulls roughly half a megabyte of JavaScript on load, and a module that merely
 * *contains* a video would otherwise pay that cost on every page view whether
 * or not anyone watches — usually while the browser is still trying to settle
 * the largest contentful paint.
 *
 * Until then it is an <img> and a <button>: the module's own art direction
 * stays intact, and the poster is whatever the CMS supplies, falling back to
 * YouTube's generated thumbnail.
 *
 * `videoTitle` is used for the accessible label. It is the surrounding
 * heading rather than the video's own title, which we never fetch — an extra
 * network round trip to YouTube's API for a string the page already has.
 *
 * @param {{
 *   videoId: string,
 *   posterUrl?: string,
 *   posterAlt?: string,
 *   videoTitle?: string,
 *   className?: string,
 *   imageClassName?: string,
 *   buttonClassName?: string,
 *   iconClassName?: string,
 *   frameClassName?: string,
 *   imageProps?: object,
 * }} props
 */
export default function VideoEmbed({
  videoId,
  posterUrl,
  posterAlt = '',
  videoTitle,
  className,
  imageClassName,
  buttonClassName,
  iconClassName,
  frameClassName,
  imageProps,
}) {
  const [playing, setPlaying] = useState(false);
  const poster = posterUrl || youTubeThumbnail(videoId);

  if (playing) {
    return (
      <iframe
        className={frameClassName}
        src={youTubeEmbedUrl(videoId)}
        title={videoTitle ? `Video: ${videoTitle}` : 'Video'}
        // `allow` grants the player what it needs; autoplay is in there because
        // the click already happened. No `camera`/`microphone`.
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <div className={className}>
      <img
        src={poster}
        alt={posterAlt}
        className={imageClassName}
        loading="lazy"
        decoding="async"
        {...imageProps}
      />
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setPlaying(true)}
        aria-label={videoTitle ? `Play video: ${videoTitle}` : 'Play video'}
      >
        <span className={iconClassName} aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="currentColor" focusable="false">
            <path d="M3 1.8v12.4a.6.6 0 0 0 .92.5l9.6-6.2a.6.6 0 0 0 0-1L3.92 1.3a.6.6 0 0 0-.92.5Z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
