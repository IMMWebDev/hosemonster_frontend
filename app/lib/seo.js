import {strapiMedia} from '~/lib/strapi-media';

/**
 * Shared SEO helpers: canonical URLs, titles, descriptions, the Open Graph /
 * Twitter set, and JSON-LD.
 *
 * Every route's meta export builds its tags from these, so a page type can't
 * quietly drift from the rest (a <meta> canonical instead of a <link>, a
 * relative og:url, a placeholder description).
 */

export const SITE_NAME = 'Hose Monster';

/**
 * The share card used when a page has no image of its own. The homepage card:
 * 5000×2625 (1.90:1), inside the 1.91:1 every platform expects. Absolute —
 * scrapers fetch it with no page to resolve a path against.
 */
export const DEFAULT_SHARE_IMAGE = {
  url: 'https://media.impactmit.com/image/upload/v1789141092/HM_OGI_Home_c1f4da3fb2.png',
  width: 5000,
  height: 2625,
  alt: SITE_NAME,
};

/**
 * The site's origin for absolute URLs (canonicals, og:url, JSON-LD), taken
 * from the request so each environment points at itself.
 *
 * @param {Request} request
 */
export function siteOrigin(request) {
  return new URL(request.url).origin;
}

/**
 * An absolute URL, or null when there's nothing usable — a '#' placeholder,
 * an empty field, something URL can't parse.
 *
 * @param {string | null | undefined} pathOrUrl
 * @param {string} origin
 */
export function absoluteUrl(pathOrUrl, origin) {
  const value = String(pathOrUrl ?? '').trim();
  if (!value || value.startsWith('#')) return null;
  try {
    return new URL(value, origin).href;
  } catch {
    return null;
  }
}

/**
 * A canonical as a real <link>. React Router renders a descriptor without
 * `tagName` as <meta rel="canonical">, which search engines ignore.
 *
 * @param {string | null | undefined} href - absolute
 */
export function canonicalLink(href) {
  return href ? {tagName: 'link', rel: 'canonical', href} : null;
}

/**
 * "Title | Hose Monster", trimmed, without doubling the brand when an editor
 * already typed it.
 *
 * @param {string | null | undefined} title
 */
export function withBrand(title) {
  const clean = String(title ?? '').trim();
  if (!clean) return SITE_NAME;
  return /hose\s?monster/i.test(clean) ? clean : `${clean} | ${SITE_NAME}`;
}

/**
 * A meta description, or null. Placeholder copy ("Lorem ipsum…") counts as
 * none: a missing description lets the search engine write a snippet from the
 * page, a Latin one gets shown as is.
 *
 * @param {string | null | undefined} text
 */
export function metaDescription(text) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean || /^lorem[\s,]/i.test(clean)) return null;
  return clean;
}

/**
 * A Strapi media object as a share image ({url, width, height, alt}), or null.
 * Only images — the seo component also accepts files and videos.
 *
 * @param {object | null | undefined} media
 * @param {string} [baseUrl] - env.STRAPI_API_URL
 */
export function shareImage(media, baseUrl) {
  if (!media?.url) return null;
  if (media.mime && !media.mime.startsWith('image/')) return null;
  return {
    url: strapiMedia(media.url, baseUrl),
    width: media.width ?? null,
    height: media.height ?? null,
    alt: media.alternativeText?.trim() || null,
  };
}

/**
 * The Open Graph and Twitter tags for a page.
 *
 * @param {{
 *   title: string,
 *   description?: string | null,
 *   url?: string | null,
 *   type?: string,
 *   image?: {url: string, width?: number | null, height?: number | null, alt?: string | null} | null,
 * }} options
 */
export function socialTags({
  title,
  description,
  url,
  type = 'website',
  image,
}) {
  const shareImg = image ?? DEFAULT_SHARE_IMAGE;
  const tags = [
    {property: 'og:site_name', content: SITE_NAME},
    {property: 'og:type', content: type},
    {property: 'og:title', content: title},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
  ];
  if (url) tags.push({property: 'og:url', content: url});
  if (description) {
    tags.push({property: 'og:description', content: description});
    tags.push({name: 'twitter:description', content: description});
  }
  tags.push({property: 'og:image', content: shareImg.url});
  tags.push({name: 'twitter:image', content: shareImg.url});
  if (shareImg.width && shareImg.height) {
    tags.push({property: 'og:image:width', content: String(shareImg.width)});
    tags.push({property: 'og:image:height', content: String(shareImg.height)});
  }
  const alt = shareImg.alt || title;
  tags.push({property: 'og:image:alt', content: alt});
  tags.push({name: 'twitter:image:alt', content: alt});
  return tags;
}

/**
 * JSON-LD as a string that's safe inside a <script>: "<" is escaped so a
 * value containing "</script>" can't end the tag early.
 *
 * @param {unknown} data
 */
export function jsonLdHtml(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** The Organization's @id, so other entities can point at it. */
export function organizationId(origin) {
  return `${origin}/#organization`;
}

/**
 * The site-wide entities: the Organization (name, logo, social profiles,
 * contact) and the WebSite. Built from the CMS header and footer.
 *
 * @param {{origin: string, cmsHeader?: object | null, cmsFooter?: object | null, strapiBaseUrl?: string}} options
 */
export function siteJsonLd({origin, cmsHeader, cmsFooter, strapiBaseUrl}) {
  const header = cmsHeader?.data ?? cmsHeader;
  const footer = cmsFooter?.data ?? cmsFooter;
  const logo = header?.logo?.url ?? footer?.logo?.url;
  const sameAs = (footer?.socialLinks ?? [])
    .map((s) => absoluteUrl(s?.url, origin))
    .filter((url) => url && !url.startsWith(origin));
  const phone = footer?.phone?.trim();
  const email = footer?.email?.trim();
  const address = footer?.address?.replace(/\s+/g, ' ').trim();

  const organization = {
    '@type': 'Organization',
    '@id': organizationId(origin),
    name: SITE_NAME,
    url: `${origin}/`,
    ...(logo ? {logo: strapiMedia(logo, strapiBaseUrl)} : {}),
    ...(sameAs.length ? {sameAs} : {}),
    ...(address ? {address} : {}),
    ...(phone || email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(phone ? {telephone: phone} : {}),
            ...(email ? {email} : {}),
          },
        }
      : {}),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: SITE_NAME,
        url: `${origin}/`,
        publisher: {'@id': organizationId(origin)},
      },
    ],
  };
}

/**
 * A BreadcrumbList. Crumbs with no real destination ('#' placeholders) are
 * left out; the current page goes last, with its own URL when known.
 *
 * @param {{
 *   origin: string,
 *   crumbs: Array<{name: string, href?: string | null}>,
 *   current?: {name: string, url?: string | null} | null,
 * }} options
 */
export function breadcrumbJsonLd({origin, crumbs, current}) {
  const items = crumbs
    .map((c) => ({name: c.name?.trim(), url: absoluteUrl(c.href, origin)}))
    .filter((c) => c.name && c.url);
  if (current?.name?.trim()) {
    items.push({name: current.name.trim(), url: current.url ?? null});
  }
  if (items.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? {item: item.url} : {}),
    })),
  };
}

/**
 * "1:13" → "PT1M13S", "1:02:03" → "PT1H2M3S" (ISO 8601, what VideoObject
 * wants). null for anything that isn't m:ss or h:mm:ss.
 *
 * @param {string | null | undefined} value
 */
export function isoDuration(value) {
  const parts = String(value ?? '')
    .trim()
    .split(':')
    .map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d+$/.test(p))) return null;
  const [h, m, s] = (parts.length === 3 ? parts : ['0', ...parts]).map(Number);
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`;
}

/**
 * Plain text from CMS rich text: tags become spaces, the common entities are
 * decoded, whitespace collapses.
 *
 * @param {string | null | undefined} html
 */
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * FAQPage from question/answer pairs. Questions without an answer are left
 * out; null when none are left.
 *
 * @param {Array<{question?: string, answer?: string}>} items
 */
export function faqJsonLd(items) {
  const entities = (items ?? [])
    .map((item) => ({
      question: item?.question?.trim(),
      answer: htmlToText(item?.answer),
    }))
    .filter((item) => item.question && item.answer)
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {'@type': 'Answer', text: item.answer},
    }));
  if (entities.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entities,
  };
}

/**
 * VideoObjects for YouTube videos. Each needs a name, a thumbnail and an
 * upload date (the Video's Upload Date, else the day it was published here);
 * a video missing one is left out.
 *
 * @param {Array<{
 *   name: string,
 *   youtubeId: string,
 *   thumbnailUrl: string,
 *   duration?: string | null,
 *   uploadDate?: string | null,
 *   description?: string | null,
 * }>} videos
 */
export function videosJsonLd(videos) {
  const items = (videos ?? [])
    .filter((v) => v?.name && v.youtubeId && v.thumbnailUrl && v.uploadDate)
    .map((v) => {
      const duration = isoDuration(v.duration);
      return {
        '@type': 'VideoObject',
        name: v.name,
        description: v.description?.trim() || v.name,
        thumbnailUrl: v.thumbnailUrl,
        uploadDate: v.uploadDate,
        ...(duration ? {duration} : {}),
        embedUrl: `https://www.youtube.com/embed/${v.youtubeId}`,
        url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
      };
    });
  if (items.length === 0) return null;
  return {'@context': 'https://schema.org', '@graph': items};
}

/**
 * Events for in-person course sessions: name, dates, the city, the
 * registration link, the Organization as organizer.
 *
 * @param {{
 *   origin: string,
 *   courses: Array<{
 *     name: string,
 *     startDate: string,
 *     endDate?: string | null,
 *     city: string,
 *     url?: string | null,
 *     soldOut?: boolean,
 *   }>,
 * }} options
 */
export function coursesJsonLd({origin, courses}) {
  const items = (courses ?? [])
    .filter((c) => c?.name && c.startDate && c.city)
    .map((c) => ({
      '@type': 'Event',
      name: c.name,
      startDate: c.startDate,
      ...(c.endDate ? {endDate: c.endDate} : {}),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: c.city,
        address: {'@type': 'PostalAddress', addressLocality: c.city},
      },
      organizer: {'@id': organizationId(origin)},
      ...(c.url
        ? {
            url: c.url,
            offers: {
              '@type': 'Offer',
              url: c.url,
              availability: c.soldOut
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
            },
          }
        : {}),
    }));
  if (items.length === 0) return null;
  return {'@context': 'https://schema.org', '@graph': items};
}
