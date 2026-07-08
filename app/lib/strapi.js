import qs from 'qs';
import {CacheShort, CacheLong, CacheNone} from '@shopify/hydrogen';
import {MODULE_REGISTRY} from '~/components/cms/registry';

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
        cacheStrategy: opts.cacheStrategy ?? CacheShort(),
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
   * Fetch a page by its Strapi `path` field, deeply populating only the
   * dynamic-zone modules present on that page. Two-pass, mirroring the Next
   * app: pass 1 discovers which `__component`s exist, pass 2 re-fetches with a
   * per-module `populate` object assembled from MODULE_REGISTRY.
   *
   * @param {string} path - leading-slash path, e.g. '/about'
   * @param {'published' | 'draft'} [status]
   * @returns {Promise<{page: StrapiPage | null, modules: StrapiModule[]}>}
   */
  async function getPage(path, status = 'published') {
    try {
      // Pass 1 — shallow: learn which module __components exist on this page.
      const shallow = await strapiFetch('pages', {
        filters: {path: {$eq: path}},
        populate: {modules: true, seo: true},
        status,
      });

      const found = shallow?.data?.[0];
      if (!found) return {page: null, modules: []};

      // Build populate[modules][on][<__component>] from the registry —
      // only the module types actually present on the page get populated.
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
      const deep = await strapiFetch('pages', {
        filters: {path: {$eq: path}},
        populate: {modules: {on}, seo: true},
        status,
      });

      const page = deep?.data?.[0] ?? found;
      return {page, modules: page.modules ?? []};
    } catch (error) {
      console.error('Strapi getPage failed:', error);
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
        {cacheStrategy: cacheStrategy ?? CacheLong()},
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
      const shallow = await strapiFetch(
        `${collection}/${documentId}`,
        {status: 'draft', populate: {modules: true, seo: true}},
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
        {status: 'draft', populate: {modules: {on}, seo: true}},
        {cacheStrategy: CacheNone()},
      );

      const page = deep?.data ?? found;
      return {page, modules: page.modules ?? []};
    } catch (error) {
      console.error('Strapi getPreview failed:', error);
      return {page: null, modules: []};
    }
  }

  return {fetch: strapiFetch, getPage, getSingle, getPreview};
}
