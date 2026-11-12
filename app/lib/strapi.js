import qs from 'qs';
import {CacheShort, CacheLong, CacheNone} from '@shopify/hydrogen';
import {MODULE_REGISTRY} from '~/components/cms/registry';
import {LINK_POPULATE} from '~/lib/cms-links';

/**
 * @typedef {Object} StrapiMedia
 * @property {string} url
 * @property {string} [alternativeText]
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * @typedef {Object} StrapiSeo
 * @property {string} [metaTitle]
 * @property {string} [metaDescription]
 * @property {string} [keywords]
 * @property {StrapiMedia} [metaImage]
 * @property {boolean} [preventIndexing]
 * @property {object} [structuredData]
 */

/**
 * A dynamic-zone module. Shape varies per __component; always has __component.
 * @typedef {{__component: string} & Record<string, any>} StrapiModule
 */

/**
 * @typedef {Object} StrapiPage
 * @property {number} id
 * @property {string} path
 * @property {StrapiModule[]} [modules]
 * @property {StrapiSeo} [seo]
 */

/** Where use pages live. See getPage. */
const USES_PREFIX = '/uses/';

/** Where blog posts live. See getPage. */
const BLOGS_PREFIX = '/blogs/';

/** The blog hub — a Page; its Page Hero's breadcrumbs lead the posts' trail. */
const BLOG_HUB_PATH = '/blogs';

/**
 * Fields beyond `modules` and `seo` that an entry of a collection type needs
 * populated. Blog posts render an automatic hero from their own fields
 * (components/cms/blog/BlogHero.jsx), so its media come along, and their
 * Author (Authors collection type) for the byline and the author card —
 * with the photo and the social links' pages, or a link resolves to '#' —
 * and the Jump Links for "On this page" (BlogBody).
 */
/** What the byline and the author card read from an Author. */
const AUTHOR_POPULATE = {photo: true, socialLinks: {populate: LINK_POPULATE}};

/**
 * The `seo` component with its media. `seo: true` returns only the scalar
 * fields in Strapi 5, so the share image (metaImage) and the per-network
 * overrides' images never reached the page's meta tags.
 */
const SEO_POPULATE = {
  populate: {metaImage: true, metaSocial: {populate: {image: true}}},
};

const ENTRY_POPULATE = {
  blogs: {
    heroImage: true,
    cardImage: true,
    author: {populate: AUTHOR_POPULATE},
    jumpLinks: true,
  },
};

/**
 * Creates a Strapi REST client bound to the current request's cache.
 *
 * Ports the nextjs-sample fetch layer (api/fetchApi.js + api/fetchModules.js +
 * utils/apiUrl.js) into Hydrogen: `qs`-serialized REST calls, a Bearer token,
 * and Hydrogen's `createWithCache` for edge/subrequest caching. Unlike the Next
 * sample (which hardcodes the host and sends no auth), the base URL and token
 * come from env, and the token is server-side only.
 *
 * @param {{
 *   env: Env,
 *   withCache: import('@shopify/hydrogen').WithCache,
 * }} options
 */
export function createStrapiClient({env, withCache}) {
  const baseUrl = (env.STRAPI_API_URL ?? '').replace(/\/$/, '');

  /*
   * Caching is disabled in development.
   *
   * With CacheLong on the single types, a CMS edit sits behind an hour-long
   * freshness window: you save in Strapi, reload, and still see the old
   * content. That reads as "my changes aren't rendering" and the only way out
   * is restarting the dev server after every edit — which cost us real time
   * while building the header nav.
   *
   * Production keeps the full strategy; this only changes local development,
   * where the extra round trip to a Strapi on localhost is free.
   */
  const isDev = import.meta.env?.DEV === true;
  const singleTypeCache = () => (isDev ? CacheNone() : CacheLong());
  const defaultCache = () => (isDev ? CacheNone() : CacheShort());

  /**
   * Low-level cached REST GET against Strapi. Params are `qs`-serialized into
   * Strapi's `filters[...]` / `populate[...]` bracket syntax.
   *
   * @param {string} path - collection path, e.g. 'pages'
   * @param {Record<string, any>} [params]
   * @param {{cacheStrategy?: import('@shopify/hydrogen').CachingStrategy}} [opts]
   * @returns {Promise<any>} the parsed Strapi payload ({data, meta})
   */
  async function strapiFetch(path, params = {}, opts = {}) {
    if (!baseUrl) {
      throw new Error('STRAPI_API_URL is not set');
    }

    const query = qs.stringify(params);
    const url = `${baseUrl}/api/${path}${query ? `?${query}` : ''}`;

    const {data, response} = await withCache.fetch(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(env.STRAPI_API_TOKEN
            ? {Authorization: `Bearer ${env.STRAPI_API_TOKEN}`}
            : {}),
        },
      },
      {
        displayName: `Strapi ${path}`,
        cacheStrategy: opts.cacheStrategy ?? defaultCache(),
        cacheKey: ['strapi', path, params],
        // withCache only reaches this for an ok response; never cache errors.
        shouldCacheResponse: (_body, res) => res.ok,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Strapi request failed (${response.status}) for "${path}"`,
      );
    }

    return data;
  }

  /**
   * Fetch one entry of a module-bearing collection type and deeply populate
   * only the dynamic-zone modules actually on it.
   *
   * Two-pass, mirroring the Next app: pass 1 discovers which `__component`s
   * exist, pass 2 re-fetches with a per-module `populate` object assembled from
   * MODULE_REGISTRY. The second pass is not an optimisation — populating a
   * module type that is NOT in this content type's dynamic zone makes Strapi
   * answer `400 Invalid key`, so the populate has to be built from what the
   * entry actually contains.
   *
   * @param {string} collection - plural API id, e.g. 'pages' or 'collections'
   * @param {object} filters - Strapi filters object identifying the entry
   * @param {'published' | 'draft'} status
   * @returns {Promise<{page: StrapiPage | null, modules: StrapiModule[]}>}
   */
  async function getEntryWithModules(collection, filters, status) {
    // Pass 1 — shallow: learn which module __components exist on this entry.
    const extra = ENTRY_POPULATE[collection] ?? {};
    const shallow = await strapiFetch(collection, {
      filters,
      populate: {modules: true, seo: SEO_POPULATE, ...extra},
      status,
    });

    const found = shallow?.data?.[0];
    if (!found) return {page: null, modules: []};

    const on = {};
    for (const dz of found.modules ?? []) {
      const entry = MODULE_REGISTRY[dz.__component];
      if (entry) on[dz.__component] = entry.options;
    }

    // No registered modules to deep-populate — return the shallow result.
    if (Object.keys(on).length === 0) {
      return {page: found, modules: found.modules ?? []};
    }

    // Pass 2 — deep: re-fetch with the per-module populate options.
    const deep = await strapiFetch(collection, {
      filters,
      populate: {modules: {on}, seo: SEO_POPULATE, ...extra},
      status,
    });

    const page = deep?.data?.[0] ?? found;
    return {page, modules: page.modules ?? []};
  }

  /**
   * Fetch a CMS page by its Strapi `path` field.
   *
   * Pages first, then — for a path under /uses/ — the Uses collection type,
   * which holds the individual use pages. The hub itself (/uses) is an ordinary
   * Page. A use page's `path` is kept as /uses/{slug} by a Strapi lifecycle, so
   * it's looked up the same way. A Page given a /uses/… path would win, which
   * keeps an editor's override possible.
   *
   * Blog posts follow the same pattern under /blogs/: the Blogs collection
   * type, its `path` kept as /blogs/{slug}, with the hub (/blogs) a Page. A
   * post comes back with `type: 'blog'`, which is what tells the route to put
   * the automatic post hero above its modules.
   *
   * @param {string} path - leading-slash path, e.g. '/about'
   * @param {'published' | 'draft'} [status]
   * @returns {Promise<{page: StrapiPage | null, modules: StrapiModule[], type?: 'blog'}>}
   */
  async function getPage(path, status = 'published') {
    try {
      const filters = {path: {$eq: path}};
      const result = await getEntryWithModules('pages', filters, status);
      if (!result.page && path.startsWith(USES_PREFIX)) {
        return await getEntryWithModules('uses', filters, status);
      }
      if (!result.page && path.startsWith(BLOGS_PREFIX)) {
        const post = await getEntryWithModules('blogs', filters, status);
        return post.page ? {...post, type: 'blog'} : post;
      }
      return result;
    } catch (error) {
      console.error('Strapi getPage failed:', error);
      return {page: null, modules: []};
    }
  }

  /**
   * Fetch the CMS content for a Shopify collection page, keyed by the Shopify
   * collection handle.
   *
   * Separate from getPage because these are not Strapi-routed pages: the URL is
   * owned by Hydrogen's `collections.$handle` route, and the entry exists only
   * to hang CMS modules around the product grid. `shopifyCollectionHandle` is
   * the contract with Shopify — it must equal the handle there exactly, and a
   * mismatch yields no entry rather than an error, so the caller decides
   * whether that is fatal.
   *
   * @param {string} handle - Shopify collection handle, e.g. 'smart-monster'
   * @param {'published' | 'draft'} [status]
   * @returns {Promise<{page: StrapiPage | null, modules: StrapiModule[]}>}
   */
  async function getCollectionPage(handle, status = 'published') {
    try {
      return await getEntryWithModules(
        'collections',
        {shopifyCollectionHandle: {$eq: handle}},
        status,
      );
    } catch (error) {
      console.error('Strapi getCollectionPage failed:', error);
      return {page: null, modules: []};
    }
  }

  /**
   * Fetch a Strapi single type (e.g. `header`, `footer`, or any global config).
   * Single types return `{data: {...}}` — an object, not an array — so this
   * returns the entry object or null. Companion to the Next app's
   * `fetchHeader`/`fetchFooter`.
   *
   * Not yet wired into rendering — the `header`/`footer` single types have no
   * fields defined yet. When they do: fetch in app/root.jsx's loader (header in
   * loadCriticalData, footer deferred), pass through PageLayout, and render with
   * CMS-driven Header/Footer components (keeping the commerce controls).
   *
   * @param {string} name - single-type API id, e.g. 'header'
   * @param {{
   *   populate?: any,
   *   status?: 'published' | 'draft',
   *   cacheStrategy?: import('@shopify/hydrogen').CachingStrategy,
   * }} [opts]
   * @returns {Promise<Record<string, any> | null>}
   */
  async function getSingle(name, opts = {}) {
    const {populate = '*', status = 'published', cacheStrategy} = opts;
    try {
      const payload = await strapiFetch(
        name,
        {populate, status},
        {cacheStrategy: cacheStrategy ?? singleTypeCache()},
      );
      return payload?.data ?? null;
    } catch (error) {
      console.error(`Strapi getSingle("${name}") failed:`, error);
      return null;
    }
  }

  /**
   * Fetch a single DRAFT entry by its Strapi v5 documentId, for preview. Deeply
   * populates every registered module type in one by-id request (no two-pass
   * needed since we fetch one known entry), and always bypasses the cache so
   * editors see the latest draft. The caller (the preview route) is responsible
   * for the secret check before calling this.
   *
   * @param {string} collection - resolved API id, e.g. 'pages'
   * @param {string} documentId - Strapi v5 documentId from the preview URL
   * @returns {Promise<{page: StrapiPage | null, modules: StrapiModule[]}>}
   */
  async function getPreview(collection, documentId) {
    try {
      // Pass 1 — shallow: discover which module __components are on this draft.
      // (Populating registry modules that aren't in this content type's dynamic
      // zone makes Strapi 400 with "Invalid key" — so only populate what's here.)
      const extra = ENTRY_POPULATE[collection] ?? {};
      const shallow = await strapiFetch(
        `${collection}/${documentId}`,
        {status: 'draft', populate: {modules: true, seo: SEO_POPULATE, ...extra}},
        {cacheStrategy: CacheNone()},
      );

      const found = shallow?.data ?? null;
      if (!found) return {page: null, modules: []};

      const on = {};
      for (const dz of found.modules ?? []) {
        const entry = MODULE_REGISTRY[dz.__component];
        if (entry) on[dz.__component] = entry.options;
      }

      if (Object.keys(on).length === 0) {
        return {page: found, modules: found.modules ?? []};
      }

      // Pass 2 — deep: populate only the present, registered modules.
      const deep = await strapiFetch(
        `${collection}/${documentId}`,
        {status: 'draft', populate: {modules: {on}, seo: SEO_POPULATE, ...extra}},
        {cacheStrategy: CacheNone()},
      );

      const page = deep?.data ?? found;
      return {page, modules: page.modules ?? []};
    } catch (error) {
      console.error('Strapi getPreview failed:', error);
      return {page: null, modules: []};
    }
  }

  /**
   * An Author's draft, for its preview, and the post to show it on.
   *
   * Authors have no page of their own: they appear on blog posts, so an
   * author previews on one — its own newest post (by Publish Date), or, while
   * it has none, the site's newest post. Drafts throughout, cache bypassed;
   * the caller (page-preview) checks the secret first.
   *
   * Never throws: null when the author can't be read. `postDocumentId` is null
   * when the site has no posts at all.
   *
   * @param {string} documentId
   * @returns {Promise<{author: object, postDocumentId: string | null} | null>}
   */
  async function getAuthorPreview(documentId) {
    try {
      const payload = await strapiFetch(
        `authors/${documentId}`,
        {
          status: 'draft',
          populate: {
            ...AUTHOR_POPULATE,
            // Every tagged post (populate can't be limited), newest first.
            blogs: {fields: ['documentId'], sort: ['publishDate:desc']},
          },
        },
        {cacheStrategy: CacheNone()},
      );
      const author = payload?.data;
      if (!author) return null;

      let postDocumentId = author.blogs?.[0]?.documentId ?? null;
      if (!postDocumentId) {
        const newest = await strapiFetch(
          'blogs',
          {
            status: 'draft',
            fields: ['documentId'],
            sort: ['publishDate:desc'],
            pagination: {pageSize: 1},
          },
          {cacheStrategy: CacheNone()},
        );
        postDocumentId = newest?.data?.[0]?.documentId ?? null;
      }

      delete author.blogs;
      return {author, postDocumentId};
    } catch (error) {
      console.error('Strapi getAuthorPreview failed:', error);
      return null;
    }
  }

  /**
   * The breadcrumb trail above a blog post: the blog hub's own crumbs, then the
   * hub itself. Read from the hub Page's Page Hero (its Breadcrumbs
   * component's links and label), so the posts follow whatever an editor
   * sets there —
   * "Home / Resources / Blogs" today — instead of a second copy in code.
   *
   * Never throws: with no hub page, or no Page Hero on it, the trail falls
   * back to Home and the hub, which is enough to get back up a level.
   *
   * @param {'published' | 'draft'} [status]
   * @returns {Promise<{crumbs: Array<object>, hub: {label: string, path: string}}>}
   */
  async function getBlogTrail(status = 'published') {
    const fallback = {
      crumbs: [{id: 'home', linkText: 'Home', linkUrl: '/'}],
      hub: {label: 'Blog', path: BLOG_HUB_PATH},
    };
    try {
      const pageHero = MODULE_REGISTRY['module.page-hero'];
      const payload = await strapiFetch('pages', {
        filters: {path: {$eq: BLOG_HUB_PATH}},
        fields: ['path'],
        populate: {modules: {on: {'module.page-hero': pageHero.options}}},
        status,
      });
      const hero = (payload?.data?.[0]?.modules ?? []).find(
        (m) => m.__component === 'module.page-hero',
      );
      if (!hero) return fallback;
      return {
        crumbs: (hero.breadcrumbs?.breadcrumbLinks ?? []).filter(
          (c) => c?.linkText,
        ),
        hub: {
          label: hero.breadcrumbs?.breadcrumbLabel?.trim() || 'Blog',
          path: BLOG_HUB_PATH,
        },
      };
    } catch (error) {
      console.error('Strapi getBlogTrail failed:', error);
      return fallback;
    }
  }

  /**
   * CMS pages matching a search term, for the quick-search panel and /search.
   *
   * Shopify's search only knows Shopify content, and on this site the pages
   * people look for by name — Fire Flow, About — live in Strapi. Leaving them
   * out would make "fire flow software" return a list of hoses.
   *
   * Every word has to match SOMEWHERE (name, path or SEO keywords), so
   * "fire software" finds /fire-flow-testing-software but "fire hose" does not
   * find every page with "fire" in it. Words under three characters are dropped
   * — "a", "of", "2" match nearly everything.
   *
   * Not searched: the description, which is prose where one common word
   * surfaces unrelated pages; and the SEO title, which on this site ends in
   * "| Hose Monster" on every page — searching it made "hose" or "monster"
   * return the whole site's pages.
   *
   * Use pages (the Uses collection type) are searched alongside Pages and
   * listed after them.
   *
   * Left out: the home page, the search page itself (every search would
   * otherwise "find" it), and anything marked preventIndexing. Never throws;
   * search still works if Strapi is down, just without pages.
   *
   * @param {string} term
   * @returns {Promise<Array<{name: string, path: string}>>}
   */
  async function searchPages(term) {
    const words = String(term ?? '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 5);

    if (words.length === 0) return [];

    const query = {
      fields: ['name', 'path'],
      populate: {seo: {fields: ['preventIndexing']}},
      filters: {
        $and: words.map((w) => ({
          $or: [
            {name: {$containsi: w}},
            {path: {$containsi: w}},
            {seo: {keywords: {$containsi: w}}},
          ],
        })),
      },
      pagination: {pageSize: 10},
    };

    try {
      // Either collection failing shouldn't cost the other's results.
      const payloads = await Promise.all(
        ['pages', 'uses', 'blogs'].map((collection) =>
          strapiFetch(collection, query).catch((error) => {
            console.error(`Strapi searchPages (${collection}) failed:`, error);
            return null;
          }),
        ),
      );

      return payloads
        .flatMap((payload) => payload?.data ?? [])
        .filter(
          (p) =>
            p.path &&
            p.path !== '/' &&
            p.path !== '/search' &&
            !p.seo?.preventIndexing,
        )
        .map(({name, path}) => ({name, path}));
    } catch (error) {
      console.error('Strapi searchPages failed:', error);
      return [];
    }
  }

  /**
   * Shopify collection handles that have a Strapi entry.
   *
   * A collection page is built entirely from CMS modules — the product grid is
   * one of them — so a Shopify collection with no Strapi entry renders an empty
   * page. Search uses this list to link only to collections that work.
   *
   * @returns {Promise<Set<string>>}
   */
  async function getCollectionHandles() {
    try {
      const payload = await strapiFetch('collections', {
        fields: ['shopifyCollectionHandle'],
        pagination: {pageSize: 100},
      });
      return new Set(
        (payload?.data ?? [])
          .map((c) => c.shopifyCollectionHandle)
          .filter(Boolean),
      );
    } catch (error) {
      console.error('Strapi getCollectionHandles failed:', error);
      return new Set();
    }
  }

  return {
    fetch: strapiFetch,
    getPage,
    getCollectionPage,
    getSingle,
    getPreview,
    getAuthorPreview,
    getBlogTrail,
    searchPages,
    getCollectionHandles,
  };
}
