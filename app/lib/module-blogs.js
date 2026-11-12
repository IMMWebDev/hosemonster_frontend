import {CacheNone} from '@shopify/hydrogen';

/**
 * Blog posts for the modules that list them.
 *
 * Featured Blog picks one post (a relation, populated through the registry);
 * Post Grid lists them all, which a module can't fetch itself — BlockManager
 * renders straight from the CMS payload — so the route loader fetches the
 * page of posts here, the way getModuleProducts fetches Shopify data, and
 * hands it down as `blogPosts`.
 */

/** What a post card shows: the photos, the excerpt and its SEO stand-in, the
 * date, and the WYSIWYG text the read time is counted from. */
export const BLOG_CARD_QUERY = {
  fields: ['name', 'path', 'excerpt', 'publishDate'],
  populate: {
    cardImage: true,
    heroImage: true,
    seo: {fields: ['metaDescription']},
    modules: {on: {'module.wysiwyg': {fields: ['wysiwyg']}}},
  },
};

/** Posts per Post Grid page. */
export const POSTS_PER_PAGE = 9;

/** The query parameter for the Post Grid's page — /blogs?page=2. */
export const POSTS_PAGE_PARAM = 'page';

/**
 * One page of posts, newest first, when the modules include a Post Grid;
 * null otherwise (no request made).
 *
 * The page comes from ?page= and is clamped, never trusted: a bookmarked
 * ?page=4 after posts were removed, or a hand-typed ?page=99, lands on the
 * last real page rather than an empty grid.
 *
 * Never throws: a Strapi failure renders the grid empty (hidden) rather than
 * failing the page.
 *
 * @param {{
 *   strapi: ReturnType<typeof import('~/lib/strapi').createStrapiClient>,
 *   modules?: Array<{__component: string}>,
 *   request: Request,
 *   status?: 'published' | 'draft',
 * }} args
 * @returns {Promise<{
 *   posts: Array<object>,
 *   pagination: {page: number, pageCount: number, total: number, from: number, to: number},
 * } | null>}
 */
export async function getModuleBlogs({
  strapi,
  modules,
  request,
  status = 'published',
}) {
  if (!modules?.some((m) => m.__component === 'module.post-grid')) {
    return null;
  }

  const requested = Number.parseInt(
    new URL(request.url).searchParams.get(POSTS_PAGE_PARAM) ?? '1',
    10,
  );
  const wanted = Number.isFinite(requested) && requested > 1 ? requested : 1;
  const opts = status === 'draft' ? {cacheStrategy: CacheNone()} : {};

  const fetchPage = (page) =>
    strapi.fetch(
      'blogs',
      {
        ...BLOG_CARD_QUERY,
        status,
        // Same-day posts keep a stable order: the newer entry first.
        sort: ['publishDate:desc', 'createdAt:desc'],
        pagination: {page, pageSize: POSTS_PER_PAGE},
      },
      opts,
    );

  try {
    let payload = await fetchPage(wanted);
    let meta = payload?.meta?.pagination;
    // Past the end: the last real page instead.
    if (meta && meta.pageCount > 0 && wanted > meta.pageCount) {
      payload = await fetchPage(meta.pageCount);
      meta = payload?.meta?.pagination;
    }

    const posts = payload?.data ?? [];
    const total = meta?.total ?? posts.length;
    const page = meta?.page ?? 1;
    const from = total === 0 ? 0 : (page - 1) * POSTS_PER_PAGE + 1;
    return {
      posts,
      pagination: {
        page,
        pageCount: Math.max(1, meta?.pageCount ?? 1),
        total,
        from,
        to: from === 0 ? 0 : from + posts.length - 1,
      },
    };
  } catch (error) {
    console.error('Strapi getModuleBlogs failed:', error);
    return null;
  }
}
