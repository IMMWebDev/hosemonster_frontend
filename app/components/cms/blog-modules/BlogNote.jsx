import {noteBodyHtml} from '~/lib/cms-note';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './BlogModules.module.css';

/**
 * Blog Modules › Note — a callout in a blog post's body (sprint-05
 * hifi_blogposttemplate.html: "Testing a hydrant or a pump today? See the
 * full procedure for …").
 *
 * The same two fields as the shared Note (utilities.note): Heading, drawn as
 * the box's first line in the body type, as the comp sets it; then Body,
 * whose links sit inside its sentences (lib/cms-note.js — and each link gets
 * a data-track-id, note-link-1, -2 …). Nothing to show, nothing rendered.
 *
 * @param {{data: {heading?: string, body?: string}}} props
 */
export default function BlogNote({data}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const heading = data?.heading?.trim();
  const html = noteBodyHtml(data?.body, {trackId});
  if (!heading && !html) return null;

  return (
    <div {...trackingRoot} className={styles.block}>
      <aside className={styles.note} data-reveal>
        {heading ? <p className={styles.noteHeading}>{heading}</p> : null}
        {html ? (
          <div
            className={`${styles.noteBody} cms-note-body`}
            // Editor HTML from the noteHtml preset — see lib/cms-note.js.
            dangerouslySetInnerHTML={{__html: html}}
          />
        ) : null}
      </aside>
    </div>
  );
}
