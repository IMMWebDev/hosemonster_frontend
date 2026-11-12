import {useCallback, useEffect, useRef, useState} from 'react';
import RaisedMarks from '~/components/cms/RaisedMarks';
import UiIcon from '~/components/icons/UiIcon';
import {useTrackId} from '~/lib/tracking';
import {youTubeEmbedUrl, youTubeId} from '~/lib/youtube';
import styles from './VideoPlayer.module.css';

/**
 * The pop-up player video cards open in.
 *
 *   const player = useVideoPlayer();
 *   <VideoCard onPlay={player.open} … />
 *   {player.dialog}
 *
 * The house modal: a native <dialog> opened with showModal() (Drawer,
 * QuickSearch, the blog's PhotoViewer). The browser contains focus, makes the
 * page inert, closes it on Escape and draws it above the sticky header; the
 * page behind can't scroll (the CSS :has() rule). Close, Escape or a click on
 * the dark space around the video shuts it, and focus goes back to the card
 * that opened it.
 *
 * The YouTube player is mounted only while it's open, so closing stops the
 * video, and it autoplays — the click that opened it is the visitor's.
 */
export function useVideoPlayer() {
  const [video, setVideo] = useState(/** @type {object | null} */ (null));
  const openerRef = useRef(/** @type {HTMLElement | null} */ (null));

  const open = useCallback((next, opener) => {
    openerRef.current = opener ?? null;
    setVideo(next);
  }, []);

  const dialog = (
    <VideoDialog
      video={video}
      onClosed={() => setVideo(null)}
      openerRef={openerRef}
    />
  );

  return {open, dialog};
}

/**
 * @param {{
 *   video: {name: string, youtubeUrl: string} | null,
 *   onClosed: () => void,
 *   openerRef: import('react').MutableRefObject<HTMLElement | null>,
 * }} props
 */
function VideoDialog({video, onClosed, openerRef}) {
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const closeRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const trackId = useTrackId();
  const id = youTubeId(video?.youtubeUrl);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (video && !dialog.open) {
      dialog.showModal();
      // Explicit: browsers disagree about what showModal() focuses.
      closeRef.current?.focus({preventScroll: true});
    }
  }, [video]);

  /*
   * The site's search shortcut — ⌘K / Ctrl+K — listens on the document
   * (QuickSearch.jsx), so with focus in the player it'd open the search sheet
   * on top of a playing video. A native listener on the dialog stops it
   * first — PhotoViewer's guard; React's onKeyDown can't, because the app
   * hydrates onto the document.
   */
  const isOpen = Boolean(video);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;
    /** @param {KeyboardEvent} event */
    const holdSearchKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.stopPropagation();
      }
    };
    dialog.addEventListener('keydown', holdSearchKey);
    return () => dialog.removeEventListener('keydown', holdSearchKey);
  }, [isOpen]);

  const shut = () => dialogRef.current?.close();

  return (
    // A click on the dark space closes it, as in the Drawer; Escape is the
    // dialog's own keyboard way out, so there's no key handler to add.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={video?.name ?? 'Video'}
      // Every way out — Close, Escape, a click outside — ends here.
      onClose={() => {
        onClosed();
        const opener = openerRef.current;
        if (opener?.isConnected) opener.focus({preventScroll: true});
        openerRef.current = null;
      }}
      onClick={(event) => {
        // The dark space around the player: the dialog itself or the frame.
        if (
          event.target === event.currentTarget ||
          (event.target instanceof HTMLElement &&
            event.target.dataset.backdrop === 'true')
        ) {
          shut();
        }
      }}
    >
      {video && id ? (
        <div className={styles.frame} data-backdrop="true">
          <div className={styles.bar}>
            <p className={styles.title}>
              <RaisedMarks text={video.name} />
            </p>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              onClick={shut}
              data-track-id={trackId('video-close')}
            >
              <span>Close</span>
              <UiIcon name="close" size={18} />
            </button>
          </div>
          <div className={styles.player}>
            <iframe
              src={youTubeEmbedUrl(id)}
              title={video.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
