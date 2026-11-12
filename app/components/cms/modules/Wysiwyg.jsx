import {useTrackingRoot} from '~/lib/tracking';

/**
 * WYSIWYG module — renders a rich-text HTML field from Strapi.
 *
 * Ported from nextjs-sample/components/modules/wysiwyg. The Next version runs
 * the HTML through `sanitize-html`; we intentionally omit that here for v1
 * because (a) Strapi content is authored by trusted internal editors and
 * (b) the app already renders trusted HTML this way (see
 * app/routes/pages.$handle.jsx and policies.$handle.jsx). If untrusted HTML
 * ever reaches this module, add a Workers-compatible sanitizer.
 *
 * Links inside the HTML are typed by editors and can't carry a data-track-id;
 * a tag can still target them through the root's data-track-module.
 *
 * The tracking root (which carries the module's #anchor id) wraps the revealed
 * element rather than sitting on it: the reveal animates a transform, and an
 * anchor target that moves while useHashScroll aims at it makes the jump
 * stutter and land off by the transform's distance.
 *
 * @param {{data: {wysiwyg?: string}}} props
 */
export default function Wysiwyg({data}) {
  const trackingRoot = useTrackingRoot();
  if (!data?.wysiwyg) return null;
  /*
   * Any Heading 1 becomes a Heading 2: the page's hero holds its one h1. The
   * editor no longer offers Heading 1, but pasted HTML or Source mode can
   * still bring one in. Blog posts get the same guard in BlogBody.jsx.
   */
  const html = data.wysiwyg
    .replace(/<h1(\s[^>]*)?>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>');
  return (
    <div {...trackingRoot}>
      <div
        data-reveal
        className="cms-wysiwyg"
        dangerouslySetInnerHTML={{__html: html}}
      />
    </div>
  );
}
