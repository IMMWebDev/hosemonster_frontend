import {useLoaderData} from 'react-router';
import BlockManager from '~/components/cms/BlockManager';

/**
 * Maps the friendly `type` in the preview URL to a Strapi collection API id.
 * Acts as an allowlist so `type` can't be used to hit arbitrary endpoints.
 * Extend as you add preview-able content types.
 */
const TYPE_MAP = {
  page: 'pages',
};

/**
 * Strapi draft preview. Editors hit `/page-preview?type=page&id=<documentId>&secret=…`
 * (this is the preview URL configured in Strapi). Fetches the DRAFT by documentId
 * with the cache bypassed, gated by a shared secret. Ported from the Next app's
 * `page-preview` route.
 *
 * @param {Route.LoaderArgs} args
 */
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
  if (!collection || !id) {
    throw new Response('Invalid preview request', {status: 400});
  }

  const {page, modules} = await context.strapi.getPreview(collection, id);
  if (!page) {
    throw new Response('Preview not found', {status: 404});
  }

  return {
    page,
    modules,
    strapiBaseUrl: context.env.STRAPI_API_URL,
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

/** @typedef {import('./+types/page-preview').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
