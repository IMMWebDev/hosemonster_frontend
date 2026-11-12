import {useTrackingRoot} from '~/lib/tracking';
import {youTubeEmbedUrl, youTubeId} from '~/lib/youtube';
import styles from './BlogModules.module.css';

/**
 * Blog Modules › Video — a YouTube video in a blog post's body, 16:9 and the
 * width of the text column.
 *
 * YouTube's own player, as YouTube draws it — its thumbnail, title and play
 * button; nothing of ours over it. `videoUrl` takes any YouTube link shape
 * (see youTubeId). A link that isn't YouTube renders nothing rather than a
 * broken frame.
 *
 * The iframe is lazy: the player (about half a megabyte of YouTube's
 * JavaScript) loads only as the video nears the screen, so a video far down a
 * post doesn't slow the top of it. youtube-nocookie keeps cookies off until
 * someone plays it.
 *
 * `title` is the video's name for screen readers: it names the frame, so a
 * post with several videos doesn't offer a row of identical "video" frames.
 *
 * @param {{data: {videoUrl?: string, title?: string | null}}} props
 */
export default function BlogVideo({data}) {
  const trackingRoot = useTrackingRoot();
  const videoId = youTubeId(data?.videoUrl);
  if (!videoId) return null;
  const title = data?.title?.trim();

  return (
    <div {...trackingRoot} className={styles.block}>
      <div className={styles.videoFrame16x9} data-reveal>
        <iframe
          className={styles.videoPlayer}
          src={youTubeEmbedUrl(videoId, {autoplay: false})}
          // Names the frame for screen readers, who hear it before they're
          // inside the player. Title is required now, but videos saved before
          // that may lack one: at least say it's part of the post rather
          // than a third-party widget.
          title={title ? `Video: ${title}` : 'Video in this post'}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
