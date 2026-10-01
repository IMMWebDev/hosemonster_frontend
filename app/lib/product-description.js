/**
 * Split a Shopify product description into the sections the product page
 * lays out: an overview, the specifications, and the downloads.
 *
 * The descriptions are written to one pattern: an <h2> repeating the product
 * name, an intro, then <h3> sections — "Key Features", "Specifications" (a
 * table), "Downloads" (PDF links), "What's Included", and so on. Splitting on
 * those <h3>s lets the page put each where shoppers look for it, while the
 * words stay in Shopify where the client already edits them.
 *
 * String work rather than a DOM parser: this runs on the server (Oxygen has no
 * DOMParser), and the markup is Shopify's own editor output. A description
 * that doesn't follow the pattern still renders — all of it lands in the
 * overview.
 */

const SPECS = /spec/i;
const DOWNLOADS = /download|document|manual|user guide|literature/i;

/** @param {string} html */
function text(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @typedef {{title: string, html: string, kind: 'overview' | 'specifications' | 'downloads'}} Section
 */

/**
 * @param {string | null | undefined} html - Shopify's descriptionHtml
 * @returns {{
 *   intro: string,
 *   sections: Array<Section>,
 *   overview: Array<Section>,
 *   specifications: Array<Section>,
 *   downloads: Array<Section>,
 * }}
 *   `sections` is every <h3> section in the order the description has them;
 *   the three buckets are the same sections sorted by kind.
 */
export function splitDescription(html) {
  const empty = {intro: '', sections: [], overview: [], specifications: [], downloads: []};
  if (!html) return empty;

  // The leading <h2> repeats the product name, which the page's <h1> already
  // says; a second copy just above the intro reads as a stutter.
  const body = String(html).trim().replace(/^\s*<h2[^>]*>[\s\S]*?<\/h2>/i, '');

  // [intro, title1, html1, title2, html2, …]
  const parts = body.split(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  const out = {intro: parts[0].trim(), sections: [], overview: [], specifications: [], downloads: []};

  for (let i = 1; i < parts.length; i += 2) {
    const title = text(parts[i]);
    const sectionHtml = (parts[i + 1] ?? '').trim();
    if (!sectionHtml) continue;
    const kind = SPECS.test(title)
      ? 'specifications'
      : DOWNLOADS.test(title)
        ? 'downloads'
        : 'overview';
    const section = {title, html: sectionHtml, kind};
    out.sections.push(section);
    out[kind].push(section);
  }

  return out;
}

/**
 * Plain text for meta descriptions and structured data.
 *
 * @param {string | null | undefined} value
 * @param {number} [max]
 */
export function plainText(value, max = 160) {
  const t = text(value);
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
