import {useLocation} from 'react-router';
import {MODULE_REGISTRY} from '~/components/cms/registry';
import {
  moduleTrackingIds,
  pageKeyFromPath,
  TrackingScope,
} from '~/lib/tracking';

/**
 * Renders a Strapi dynamic zone — ported from nextjs-sample/utils/blockManager.js.
 *
 * Maps each block's `__component` to its registered component and renders it
 * with the rest of the module object as `data`. Unknown modules are logged and
 * skipped rather than crashing the page.
 *
 * Each module is wrapped in a <TrackingScope> that names it for analytics —
 * data-track-module on its root, data-track-id on its buttons. The page part
 * comes from the URL, the module part from its Tracking ID field or its type
 * and position. See app/lib/tracking.js.
 *
 * @param {{
 *   blocks?: Array<{__component: string} & Record<string, any>>,
 *   baseUrl?: string,
 *   siteEnv?: Record<string, string | undefined>,
 *   products?: Record<string, object>,
 *   collection?: object,
 *   activeSort?: string,
 *   pagination?: object,
 *   search?: object,
 *   blogPosts?: object | null,
 *   videoLibrary?: object | null,
 * }} props
 */
export default function BlockManager({
  blocks,
  baseUrl,
  siteEnv,
  products,
  collection,
  activeSort,
  pagination,
  search,
  blogPosts,
  videoLibrary,
}) {
  const {pathname} = useLocation();
  if (!blocks || blocks.length === 0) return null;

  const trackingIds = moduleTrackingIds(blocks, pageKeyFromPath(pathname));

  return (
    <>
      {blocks.map(({__component, ...rest}, index) => {
        const entry = MODULE_REGISTRY[__component];
        if (!entry) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[CMS] Unknown module "${__component}" — skipped.`);
          }
          return null;
        }
        const {Component} = entry;
        const {moduleId, anchor} = trackingIds[index];
        return (
          <TrackingScope
            key={`block-${__component}-${index}`}
            id={moduleId}
            anchor={anchor}
          >
            <Component
              data={rest}
              baseUrl={baseUrl}
              siteEnv={siteEnv}
              /* Shopify products keyed by handle, resolved in the route loader —
               see app/lib/module-products.js. Only module.product-cards reads
               it; every other module ignores the prop. */
              products={products}
              /* Shopify collection for module.product-feed, queried by the
               collection route. Every other module ignores these. */
              collection={collection}
              activeSort={activeSort}
              pagination={pagination}
              /* The /search route's results, for module.search. */
              search={search}
              /* A page of blog posts, for module.post-grid — fetched by the
               route loader (app/lib/module-blogs.js). */
              blogPosts={blogPosts}
              /* Every video, grouped, for module.video-library — fetched by
               the route loader (app/lib/videos.js). */
              videoLibrary={videoLibrary}
            />
          </TrackingScope>
        );
      })}
    </>
  );
}
