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
 * @param {{data: {wysiwyg?: string}}} props
 */
export default function Wysiwyg({data}) {
  if (!data?.wysiwyg) return null;
  return (
    <div
      className="cms-wysiwyg"
      dangerouslySetInnerHTML={{__html: data.wysiwyg}}
    />
  );
}
