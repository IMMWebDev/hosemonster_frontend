import {useLoaderData} from 'react-router';
import BlockManager from '~/components/cms/BlockManager';
import BlogBody from '~/components/cms/blog/BlogBody';
import {BlogPostHero, POST_TITLE_ID} from '~/components/cms/blog/BlogHero';
import {JsonLd} from '~/components/JsonLd';
import {strapiMedia} from '~/lib/strapi-media';
import {
  absoluteUrl,
  canonicalLink,
  metaDescription,
  organizationId,
  shareImage,
  siteOrigin,
  socialTags,
  withBrand,
} from '~/lib/seo';
import {getModuleBlogs} from '~/lib/module-blogs';
import {getModuleProducts} from '~/lib/module-products';
import {getModuleVideos, onlyVideoFiltersChanged} from '~/lib/videos';

/**
 * Root catch-all. Serves Strapi CMS pages by `path` — Pages, the Uses
 * collection type's pages under /uses/ and the Blogs collection type's posts
 * under /blogs/ (see getPage) — mirroring the Next app's `[[...slug]]` route.
 * Shopify routes (products, collections, /pages…) are more specific and win; this splat is the fallback for otherwise-unmatched
 * top-level slugs. If no CMS page exists we throw 404, which server.js turns
 * into a Shopify `storefrontRedirect` lookup (preserving prior behavior). Until
 * STRAPI_API_URL is configured, getPage returns null and this behaves exactly
 * like the original 404-only catch-all.
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

export async function loader({context, params, request}) {
  const path = '/' + (params['*'] ?? '');

  const {page, modules, type} = await context.strapi.getPage(path);

  if (!page) {
    throw new Response(`${path} not found`, {status: 404});
  }

  /*
   * Modules cannot fetch — BlockManager renders straight from the CMS payload.
   * module.product-cards stores only handles, so the Storefront lookup happens
   * here and the result is handed down. Awaited rather than deferred: the price
   * is part of the card's layout, and streaming it in would shift the page.
   */
  const [products, blogPosts, videoLibrary] = await Promise.all([
    getModuleProducts({storefront: context.storefront, modules}),
    // A Post Grid's page of posts (?page=); null without one.
    getModuleBlogs({strapi: context.strapi, modules, request}),
    // A Video Library's videos, grouped; null without one.
    getModuleVideos({strapi: context.strapi, modules}),
  ]);

  /*
   * A blog post gets its hero from its own fields, not from a module: the
   * hub's breadcrumb trail to sit under, and its own absolute URL for the
   * share links.
   */
  const isPost = type === 'blog';
  const blogTrail = isPost ? await context.strapi.getBlogTrail() : null;

  /*
   * The canonical: the editor's Canonical URL when one is set, otherwise the
   * page's own path. Query strings are dropped — a Video Library's filters or
   * a tracking tag are the same page — except a Post Grid's page number: page
   * 2 lists different posts, so it canonicalises to itself, not to page 1.
   */
  const origin = siteOrigin(request);
  const postsPage = blogPosts?.pagination?.page ?? 1;
  const canonical =
    absoluteUrl(page.seo?.canonicalURL, origin) ??
    absoluteUrl(
      postsPage > 1 ? `${page.path}?page=${postsPage}` : page.path,
      origin,
    );

  return {
    page,
    modules,
    products,
    blogPosts,
    videoLibrary,
    isPost,
    blogTrail,
    shareUrl: isPost ? new URL(page.path, request.url).href : null,
    canonical,
    origin,
    strapiBaseUrl: context.env.STRAPI_API_URL,
    // Read by PageLayout via useMatches to decide whether the newsletter band
    // renders above the footer.
    includeNewsletter: page?.includeNewsletter ?? null,
  };
}

/**
 * SEO from the Strapi `seo` component (ported from nextjs-sample/utils/seo.js),
 * with the gaps filled from the page itself: the page name when there's no
 * Meta Title, a post's own image when there's no Meta Image, the site card
 * when there's neither.
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const page = data?.page;
  if (!page) return [{title: 'Hose Monster'}];
  const seo = page.seo ?? {};
  const isPost = Boolean(data.isPost);
  const baseUrl = data.strapiBaseUrl;

  const title = withBrand(seo.metaTitle || page.name);
  const description = metaDescription(seo.metaDescription);
  const image =
    shareImage(seo.metaImage, baseUrl) ??
    (isPost
      ? (shareImage(page.cardImage, baseUrl) ??
        shareImage(page.heroImage, baseUrl))
      : null);

  const tags = [{title}];
  if (description) tags.push({name: 'description', content: description});
  const canonical = canonicalLink(data.canonical);
  if (canonical) tags.push(canonical);
  if (seo.keywords) tags.push({name: 'keywords', content: seo.keywords});

  tags.push(
    ...socialTags({
      title,
      description,
      url: data.canonical,
      type: isPost ? 'article' : 'website',
      image,
    }),
  );
  if (isPost) {
    if (page.publishDate) {
      tags.push({property: 'article:published_time', content: page.publishDate});
    }
    if (page.updatedAt) {
      tags.push({property: 'article:modified_time', content: page.updatedAt});
    }
  }

  if (seo.preventIndexing) {
    tags.push({name: 'robots', content: 'noindex, nofollow'});
  } else if (seo.metaRobots?.trim()) {
    tags.push({name: 'robots', content: seo.metaRobots.trim()});
  }
  return tags;
};

/**
 * BlogPosting for a post, from its own fields — headline, image, dates,
 * author, publisher. An editor's Structured Data replaces it.
 *
 * @param {{page: object, canonical: string, origin: string, baseUrl?: string}} options
 */
function blogPostingJsonLd({page, canonical, origin, baseUrl}) {
  const image = page.heroImage?.url ?? page.cardImage?.url;
  const authorName = page.author?.name?.trim();
  const description = metaDescription(page.seo?.metaDescription ?? page.excerpt);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: page.name,
    ...(description ? {description} : {}),
    ...(image ? {image: [strapiMedia(image, baseUrl)]} : {}),
    ...(page.publishDate ? {datePublished: page.publishDate} : {}),
    ...(page.updatedAt ? {dateModified: page.updatedAt} : {}),
    ...(authorName
      ? {
          author: {
            '@type': 'Person',
            name: authorName,
            ...(page.author?.title?.trim() ? {jobTitle: page.author.title.trim()} : {}),
          },
        }
      : {}),
    publisher: {'@id': organizationId(origin)},
    mainEntityOfPage: canonical,
    url: canonical,
  };
}

export default function CmsPage() {
  /** @type {LoaderReturnData} */
  const {
    page,
    modules,
    strapiBaseUrl,
    products,
    blogPosts,
    videoLibrary,
    isPost,
    blogTrail,
    shareUrl,
    canonical,
    origin,
  } = useLoaderData();

  return (
    <div className="cms-page">
      {/* An editor's Structured Data wins; a post without one gets its
          BlogPosting built from its own fields. */}
      {page?.seo?.structuredData ? (
        <JsonLd data={page.seo.structuredData} />
      ) : isPost ? (
        <JsonLd
          data={blogPostingJsonLd({
            page,
            canonical,
            origin,
            baseUrl: strapiBaseUrl,
          })}
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

/** @typedef {import('./+types/$').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
