import {useLoaderData} from 'react-router';
import BlockManager from '~/components/cms/BlockManager';
import {strapiMedia} from '~/lib/strapi-media';

/**
 * Root catch-all. Serves Strapi CMS pages by `path`, mirroring the Next app's
 * `[[...slug]]` route. Shopify routes (products, collections, blogs, /pages…)
 * are more specific and win; this splat is the fallback for otherwise-unmatched
 * top-level slugs. If no CMS page exists we throw 404, which server.js turns
 * into a Shopify `storefrontRedirect` lookup (preserving prior behavior). Until
 * STRAPI_API_URL is configured, getPage returns null and this behaves exactly
 * like the original 404-only catch-all.
 *
 * @param {Route.LoaderArgs} args
 */
export async function loader({context, params}) {
  const path = '/' + (params['*'] ?? '');

  const {page, modules} = await context.strapi.getPage(path);

  if (!page) {
    throw new Response(`${path} not found`, {status: 404});
  }

  return {
    page,
    modules,
    strapiBaseUrl: context.env.STRAPI_API_URL,
  };
}

/**
 * SEO from the Strapi `seo` component (ported from nextjs-sample/utils/seo.js).
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const page = data?.page;
  const seo = page?.seo;
  if (!seo) return [{title: page?.path ?? 'Page'}];

  const tags = [{title: seo.metaTitle ?? page.path}];
  if (seo.metaTitle) {
    tags.push({property: 'og:title', content: seo.metaTitle});
  }
  if (seo.metaDescription) {
    tags.push({name: 'description', content: seo.metaDescription});
    tags.push({property: 'og:description', content: seo.metaDescription});
  }
  if (seo.keywords) {
    tags.push({name: 'keywords', content: seo.keywords});
  }
  if (seo.metaImage?.url) {
    tags.push({
      property: 'og:image',
      content: strapiMedia(seo.metaImage.url, data?.strapiBaseUrl),
    });
  }
  if (seo.preventIndexing) {
    tags.push({name: 'robots', content: 'noindex, nofollow'});
  }
  return tags;
};

export default function CmsPage() {
  /** @type {LoaderReturnData} */
  const {page, modules, strapiBaseUrl} = useLoaderData();

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
      <BlockManager blocks={modules} baseUrl={strapiBaseUrl} />
    </div>
  );
}

/** @typedef {import('./+types/$').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
