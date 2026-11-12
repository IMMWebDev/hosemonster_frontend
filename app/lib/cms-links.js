/**
 * The relations a Strapi `utilities.link` can point at, populated wherever a
 * link is fetched — header, footer, every module's CTAs. One constant so a new
 * destination type is added in one place: a relation left out of a populate
 * comes back empty, and the link quietly falls through to '#'.
 *
 * Strapi rejects a populate key the schema doesn't have ("400 Invalid key"),
 * so a relation added here must already be deployed in the backend's
 * src/components/utilities/link.json.
 */
export const LINK_POPULATE = {
  pageLink: true,
  collectionLink: true,
  useLink: true,
};

/**
 * Where a CMS link goes, resolved in the order utilities.link documents: a
 * typed URL, then a Page, a Collection page, a Use page. '' when none is set.
 *
 * @param {{
 *   linkUrl?: string,
 *   pageLink?: {path?: string} | null,
 *   collectionLink?: {path?: string} | null,
 *   useLink?: {path?: string} | null,
 * } | null | undefined} link
 * @returns {string}
 */
export function linkDestination(link) {
  return (
    link?.linkUrl ||
    link?.pageLink?.path ||
    link?.collectionLink?.path ||
    link?.useLink?.path ||
    ''
  );
}
