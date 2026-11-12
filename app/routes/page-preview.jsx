import {useLoaderData} from 'react-router';
import BlockManager from '~/components/cms/BlockManager';
import BlogBody from '~/components/cms/blog/BlogBody';
import {BlogPostHero, POST_TITLE_ID} from '~/components/cms/blog/BlogHero';
import {getModuleBlogs} from '~/lib/module-blogs';
import {getModuleVideos, onlyVideoFiltersChanged} from '~/lib/videos';
import {getModuleProducts} from '~/lib/module-products';

/**
 * Maps the friendly `type` in the preview URL to a Strapi collection API id.
 * Acts as an allowlist so `type` can't be used to hit arbitrary endpoints.
 * Extend as you add preview-able content types.
 */
const TYPE_MAP = {
  page: 'pages',
  use: 'uses',
  blog: 'blogs',
  author: 'authors',
};

/** A Strapi v5 documentId: letters and digits, nothing that can reshape the
 * request path. */
const DOCUMENT_ID = /^[a-z0-9]{1,64}$/i;

/** The post an author previews on when the site has no posts yet. */
const STAND_IN_POST = {name: 'Sample post', path: null, author: null};

/**
 * Strapi draft preview. Editors hit `/page-preview?type=page&id=<documentId>&secret=…`
 * (this is the preview URL configured in Strapi). Fetches the DRAFT by documentId
 * with the cache bypassed, gated by a shared secret. Ported from the Next app's
 * `page-preview` route.
 *
 * An Author has no page of its own, so `type=author` previews it where it
 * appears — on a post: its own newest post, or the site's newest while it has
 * none (a stand-in when there are no posts at all), with the draft author in
 * the byline and the card in place of the post's own (getAuthorPreview).
 *
 * @param {Route.LoaderArgs} args
 */
/**
 * A Video Library's filters live in the URL (?section=, ?equipment=) but are
 * applied in the browser, so changing one doesn't re-run this loader.
 * @type {import('react-router').ShouldRevalidateFunction}
 */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}) {
  if (!formMethod && onlyVideoFiltersChanged(currentUrl, nextUrl)) {
    return false;
  }
  return defaultShouldRevalidate;
}

export async function loader({request, context}) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const type = url.searchParams.get('type') ?? 'page';
  const id = url.searchParams.get('id');

  // Gate: a matching secret is required. If PREVIEW_SECRET is unset, preview is
  // disabled entirely (returns 404), which is the safe default.
  const expected = context.env.PREVIEW_SECRET;
  if (!expected || secret !== expected) {
    throw new Response('Not found', {status: 404});
  }

  const collection = TYPE_MAP[type];
  if (!collection || !id || !DOCUMENT_ID.test(id)) {
    throw new Response('Invalid preview request', {status: 400});
  }

  const {page, modules} =
    collection === 'authors'
      ? await previewAuthor(context.strapi, id)
      : await context.strapi.getPreview(collection, id);
  if (!page) {
    throw new Response('Preview not found', {status: 404});
  }

  // Product cards and bundle builders read their Shopify data from here, the
  // same as on the published page — without it they preview as empty.
  const [products, blogPosts, videoLibrary] = await Promise.all([
    getModuleProducts({storefront: context.storefront, modules}),
    // A Post Grid previews with drafts too, so a new post shows before it's
    // published.
    getModuleBlogs({
      strapi: context.strapi,
      modules,
      request,
      status: 'draft',
    }),
    // The Video Library with draft videos too, as the Post Grid.
    getModuleVideos({strapi: context.strapi, modules, status: 'draft'}),
  ]);

  // A blog post's automatic hero, as on the live page ($.jsx).
  const isPost = collection === 'blogs' || collection === 'authors';
  const blogTrail = isPost ? await context.strapi.getBlogTrail('draft') : null;

  return {
    page,
    modules,
    products,
    blogPosts,
    videoLibrary,
    isPost,
    blogTrail,
    shareUrl: isPost && page.path ? new URL(page.path, request.url).href : null,
    strapiBaseUrl: context.env.STRAPI_API_URL,
  };
}

/**
 * The draft author on the post it previews on (see the loader's JSDoc).
 *
 * @param {ReturnType<typeof import('~/lib/strapi').createStrapiClient>} strapi
 * @param {string} documentId
 */
async function previewAuthor(strapi, documentId) {
  const found = await strapi.getAuthorPreview(documentId);
  if (!found) return {page: null, modules: []};

  const post = found.postDocumentId
    ? await strapi.getPreview('blogs', found.postDocumentId)
    : {page: null, modules: []};
  return {
    page: {...(post.page ?? STAND_IN_POST), author: found.author},
    modules: post.modules,
  };
}

/**
 * Preview pages must never be indexed.
 * @type {Route.MetaFunction}
 */
export const meta = () => [
  {title: 'Preview'},
  {name: 'robots', content: 'noindex, nofollow'},
];

export default function PagePreview() {
  /** @type {LoaderReturnData} */
  const {
    page,
    modules,
    products,
    blogPosts,
    videoLibrary,
    strapiBaseUrl,
    isPost,
    blogTrail,
    shareUrl,
  } = useLoaderData();

  return (
    <div className="cms-page">
      {page?.seo?.structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(page.seo.structuredData),
          }}
        />
      ) : null}
      {/* A post: its hero, built from its own fields, then its modules in the
       * post template's sidebar-and-column layout. */}
      {isPost ? (
        <>
          <BlogPostHero
            post={page}
            modules={modules}
            trail={blogTrail}
            shareUrl={shareUrl}
            baseUrl={strapiBaseUrl}
          />
          <BlogBody
            modules={modules}
            baseUrl={strapiBaseUrl}
            products={products}
            titleId={POST_TITLE_ID}
            author={page.author}
            jumpLinks={page.jumpLinks}
          />
        </>
      ) : (
        <BlockManager
          blocks={modules}
          baseUrl={strapiBaseUrl}
          products={products}
          blogPosts={blogPosts}
          videoLibrary={videoLibrary}
        />
      )}
    </div>
  );
}

/** @typedef {import('./+types/page-preview').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
