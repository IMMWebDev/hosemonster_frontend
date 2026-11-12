import {CacheNone} from '@shopify/hydrogen';
import {strapiMedia, strapiSrcSet} from '~/lib/strapi-media';
import {youTubeId} from '~/lib/youtube';
import {videosJsonLd} from '~/lib/seo';

/**
 * Training videos (the Videos collection type) for the Featured Videos and
 * Video Library modules.
 *
 * A video is a YouTube link plus what the card needs: its Name, an optional
 * Duration, its Tag (the label over the name, and the library's Equipment
 * filter) and its Section (the library's groups). The thumbnail is YouTube's
 * own unless an editor uploads one.
 */

/** What a video card reads — the module relation and the library share it. */
export const VIDEO_CARD_QUERY = {
  // uploadDate and publishedAt are for the VideoObject structured data.
  fields: [
    'name',
    'slug',
    'youtubeUrl',
    'duration',
    'sortOrder',
    'uploadDate',
    'publishedAt',
  ],
  populate: {
    thumbnail: true,
    tag: {fields: ['name', 'slug']},
    section: {fields: ['name', 'slug']},
  },
};

/** Upper bound for the library. The whole set is one request; this is
 * headroom, not a page size — 12 videos today. */
const MAX_VIDEOS = 250;

/**
 * The card's thumbnail: the uploaded one, else YouTube's. hqdefault (480px,
 * 4:3 with bars the 16:9 crop hides) is the largest size YouTube serves for
 * every video; maxresdefault is missing on older uploads.
 *
 * @param {{thumbnail?: object | null, youtubeUrl?: string}} video
 * @param {string} [baseUrl]
 * @returns {{src: string, srcSet?: string, width?: number, height?: number} | null}
 */
export function videoThumbnail(video, baseUrl) {
  const upload = video?.thumbnail;
  const uploadUrl = strapiMedia(upload?.url, baseUrl);
  if (uploadUrl) {
    return {
      src: uploadUrl,
      srcSet: strapiSrcSet(upload, baseUrl),
      width: upload.width,
      height: upload.height,
    };
  }
  const id = youTubeId(video?.youtubeUrl);
  return id
    ? {
        src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        width: 480,
        height: 360,
      }
    : null;
}

/**
 * VideoObject structured data for a set of video cards — the thumbnail the
 * card shows, the duration as ISO 8601, the Upload Date (else the day it was
 * published here).
 *
 * @param {Array<object>} videos
 * @param {string} [baseUrl]
 */
export function videoCardsJsonLd(videos, baseUrl) {
  return videosJsonLd(
    (videos ?? []).map((video) => ({
      name: video?.name,
      youtubeId: youTubeId(video?.youtubeUrl),
      thumbnailUrl: videoThumbnail(video, baseUrl)?.src,
      duration: video?.duration,
      uploadDate: video?.uploadDate || video?.publishedAt,
    })),
  );
}

/** A video worth a card: it has a name and a link YouTube will play. */
export function isPlayable(video) {
  return Boolean(video?.name && youTubeId(video.youtubeUrl));
}

/**
 * Videos in their running order: Sort Order (lowest first, empty last), then
 * name.
 */
function byOrder(a, b) {
  const x = a.sortOrder ?? Number.POSITIVE_INFINITY;
  const y = b.sortOrder ?? Number.POSITIVE_INFINITY;
  return x - y || a.name.localeCompare(b.name);
}

/**
 * The whole library, grouped, when the modules include a Video Library; null
 * otherwise (no request made).
 *
 * Sections come in their Sort Order and keep only the ones with videos; a
 * video with no section lands in a trailing "More videos" group rather than
 * disappearing. Tags are the ones in use, A–Z, for the Equipment filter.
 *
 * Never throws: a Strapi failure hides the library rather than failing the
 * page.
 *
 * @param {{
 *   strapi: ReturnType<typeof import('~/lib/strapi').createStrapiClient>,
 *   modules?: Array<{__component: string}>,
 *   status?: 'published' | 'draft',
 * }} args
 * @returns {Promise<{
 *   sections: Array<{key: string, name: string, slug: string, description?: string, videos: Array<object>}>,
 *   tags: Array<{name: string, slug: string}>,
 *   total: number,
 * } | null>}
 */
export async function getModuleVideos({strapi, modules, status = 'published'}) {
  if (!modules?.some((m) => m.__component === 'module.video-library')) {
    return null;
  }
  const opts = status === 'draft' ? {cacheStrategy: CacheNone()} : {};

  try {
    const [videoPayload, sectionPayload] = await Promise.all([
      strapi.fetch(
        'videos',
        {
          ...VIDEO_CARD_QUERY,
          status,
          sort: ['sortOrder:asc', 'name:asc'],
          pagination: {page: 1, pageSize: MAX_VIDEOS},
        },
        opts,
      ),
      strapi.fetch(
        'video-sections',
        {
          fields: ['name', 'slug', 'description', 'sortOrder'],
          sort: ['sortOrder:asc', 'name:asc'],
          pagination: {page: 1, pageSize: 100},
        },
        opts,
      ),
    ]);

    const videos = (videoPayload?.data ?? []).filter(isPlayable).sort(byOrder);
    const allSections = [...(sectionPayload?.data ?? [])].sort(byOrder);

    const sections = allSections
      .map((section) => ({
        key: section.slug || section.documentId,
        name: section.name,
        slug: section.slug,
        description: section.description,
        videos: videos.filter(
          (video) => video.section?.slug && video.section.slug === section.slug,
        ),
      }))
      .filter((section) => section.videos.length > 0);

    const known = new Set(sections.map((s) => s.slug));
    const loose = videos.filter((video) => !known.has(video.section?.slug));
    if (loose.length > 0) {
      sections.push({
        key: '__more',
        name: 'More videos',
        slug: '__more',
        description: '',
        videos: loose,
      });
    }

    const tagMap = new Map();
    for (const video of videos) {
      if (video.tag?.slug) tagMap.set(video.tag.slug, video.tag.name);
    }
    const tags = [...tagMap]
      .map(([slug, name]) => ({slug, name}))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {sections, tags, total: videos.length};
  } catch (error) {
    console.error('Strapi getModuleVideos failed:', error);
    return null;
  }
}

/** The Video Library's filters in the URL: /videos?section=…&equipment=… */
export const VIDEO_SECTION_PARAM = 'section';
export const VIDEO_EQUIPMENT_PARAM = 'equipment';

/**
 * Videos a section shows on the library's "All" view before its "View all"
 * link — two rows at four across. Picking the section shows every one.
 */
export const VIDEOS_PER_SECTION = 8;

/**
 * True when the only thing that changed between two URLs is the Video
 * Library's filters. The routes that can hold a library return false from
 * shouldRevalidate then, so filtering stays in the browser — instant, with
 * the whole library already on the page — instead of re-running the page's
 * loader against Strapi on every change.
 *
 * @param {URL} currentUrl
 * @param {URL} nextUrl
 */
export function onlyVideoFiltersChanged(currentUrl, nextUrl) {
  if (currentUrl.pathname !== nextUrl.pathname) return false;
  if (currentUrl.search === nextUrl.search) return false;
  const rest = (url) => {
    const params = new URLSearchParams(url.search);
    params.delete(VIDEO_SECTION_PARAM);
    params.delete(VIDEO_EQUIPMENT_PARAM);
    params.sort();
    return params.toString();
  };
  return rest(currentUrl) === rest(nextUrl);
}
