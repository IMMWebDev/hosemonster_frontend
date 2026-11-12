/**
 * A blog post's date, read time and card copy, as the post hero (BlogHero)
 * and the post cards (Featured Blog, Post Grid) show them.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Splits "2026-01-26" into its parts — read straight from the string rather
 * than through Date, which would shift a bare date into the previous day west
 * of UTC.
 *
 * @param {string | null | undefined} isoDate
 */
function dateParts(isoDate) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(isoDate ?? '');
  const month = match ? MONTHS[Number(match[2]) - 1] : null;
  if (!month) return null;
  return {year: match[1], month, day: match[3] ? Number(match[3]) : null};
}

/**
 * "2026-01-26" → "Jan 2026", the post hero's date.
 *
 * @param {string | null | undefined} isoDate
 * @returns {string | null}
 */
export function formatMonthYear(isoDate) {
  const parts = dateParts(isoDate);
  return parts ? `${parts.month} ${parts.year}` : null;
}

/**
 * "2026-01-26" → "Jan 26, 2026", the post cards' date.
 *
 * @param {string | null | undefined} isoDate
 * @returns {string | null}
 */
export function formatPostDate(isoDate) {
  const parts = dateParts(isoDate);
  if (!parts) return null;
  return parts.day
    ? `${parts.month} ${parts.day}, ${parts.year}`
    : `${parts.month} ${parts.year}`;
}

const WORDS_PER_MINUTE = 225;

/**
 * Minutes to read a post's text — its WYSIWYG modules at 225 words a minute,
 * rounded up; null when there's no text.
 *
 * @param {Array<{__component: string, wysiwyg?: string}> | null | undefined} modules
 * @returns {number | null}
 */
export function readMinutes(modules) {
  const text = (modules ?? [])
    .filter((m) => m.__component === 'module.wysiwyg' && m.wysiwyg)
    .map((m) =>
      m.wysiwyg.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '),
    )
    .join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return words > 0 ? Math.ceil(words / WORDS_PER_MINUTE) : null;
}

/**
 * What a post card shows, from the post's own fields (lib/module-blogs's
 * BLOG_CARD_QUERY): its Card Image, else its Hero Image; its Excerpt, else
 * its SEO meta description; its date ("Jan 26, 2026") and read time.
 *
 * @param {{
 *   excerpt?: string,
 *   publishDate?: string,
 *   cardImage?: {url?: string} | null,
 *   heroImage?: {url?: string} | null,
 *   seo?: {metaDescription?: string} | null,
 *   modules?: Array<{__component: string, wysiwyg?: string}>,
 * }} post
 */
export function postCard(post) {
  return {
    image: post.cardImage?.url ? post.cardImage : (post.heroImage ?? null),
    excerpt: post.excerpt?.trim() || post.seo?.metaDescription?.trim() || null,
    date: formatPostDate(post.publishDate),
    minutes: readMinutes(post.modules),
  };
}
