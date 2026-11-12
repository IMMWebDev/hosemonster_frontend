/**
 * The shared Note component (utilities.note) — helpers for its Body.
 *
 * Body comes from the "noteHtml" CKEditor preset in Strapi: paragraphs with
 * bold, italic and links, as HTML. A note saved before that editor existed is
 * plain text, so it is escaped and split into paragraphs on blank lines.
 *
 * The HTML is authored by trusted internal editors and rendered as-is, the
 * same policy as the WYSIWYG module (see Wysiwyg.jsx). The editor itself only
 * produces <p>, <strong>, <i> and <a>, so nothing else should ever arrive.
 */

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ENTITIES[c]);

/**
 * @param {string | null | undefined} body - the note's Body, HTML or plain text
 * @param {{
 *   leadIn?: string,
 *   trackId?: (role: string) => string | undefined,
 * }} [options]
 *   leadIn: the note's Heading, set in bold at the start of the first
 *   paragraph (Document Cards, Spec Sheet). Leave it out where the heading
 *   gets its own line.
 *   trackId: the module's useTrackId(). Each link gets a data-track-id,
 *   `note-link-1`, `-2` …, since links typed into rich text can't carry one.
 * @returns {string} HTML, or '' when there's nothing to show
 */
export function noteBodyHtml(body, {leadIn, trackId} = {}) {
  let html = (body ?? '').trim();

  if (html && !html.startsWith('<')) {
    html = html
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join('');
  }

  // An editor cleared by hand leaves an empty paragraph behind.
  if (!html.replace(/<[^>]*>|&nbsp;|\s/g, '')) html = '';

  const lead = leadIn?.trim();
  if (lead) {
    const strong = `<strong>${escapeHtml(lead)}</strong>`;
    const firstP = /^<p(\s[^>]*)?>/;
    html = firstP.test(html)
      ? html.replace(firstP, (open) => `${open}${strong} `)
      : `<p>${strong}</p>${html}`;
  }

  if (trackId) {
    let n = 0;
    html = html.replace(/<a\b/g, () => {
      n += 1;
      const id = trackId(`note-link-${n}`);
      return id ? `<a data-track-id="${escapeHtml(id)}"` : '<a';
    });
  }

  return html;
}
