import {useLoaderData} from 'react-router';
import {MockShopNotice} from '~/components/MockShopNotice';
import BlockManager from '~/components/cms/BlockManager';
import {getModuleBlogs} from '~/lib/module-blogs';
import {getModuleVideos, onlyVideoFiltersChanged} from '~/lib/videos';
import {getModuleProducts} from '~/lib/module-products';
import {
  DEFAULT_SHARE_IMAGE,
  canonicalLink,
  metaDescription,
  shareImage,
  siteOrigin,
  socialTags,
} from '~/lib/seo';

/*
 * Fallbacks only, for when Strapi can't be reached or the homepage's seo
 * fields are empty. The real title and description are the homepage entry's
 * SEO fields in Strapi (Pages → "/").
 */
const HOME_TITLE =
  'Hose Monster® | Fire Hydrant & Fire Pump Flow Testing Equipment';

const HOME_DESCRIPTION =
  'Fire hydrant, fire pump & standpipe flow testing equipment. The gold ' +
  'standard since 1993. Shop Hose Monster® kits, Smart Monster™ gauges & ' +
  'FireFlow.';

/**
 * Homepage metadata, from the homepage entry's `seo` component in Strapi, as
 * every other CMS page does it (app/routes/$.jsx). The share image is the
 * site card (DEFAULT_SHARE_IMAGE, 5000×2625) unless a Meta Image is set.
 *
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const seo = data?.seo ?? {};
  const title = seo.metaTitle?.trim() || HOME_TITLE;
  const description = metaDescription(seo.metaDescription) || HOME_DESCRIPTION;
  const tags = [{title}, {name: 'description', content: description}];
  const canonical = canonicalLink(data?.canonical);
  if (canonical) tags.push(canonical);
  tags.push(
    ...socialTags({
      title,
      description,
      url: data?.canonical,
      image: shareImage(seo.metaImage, data?.strapiBaseUrl) ?? DEFAULT_SHARE_IMAGE,
    }),
  );
  return tags;
};

/**
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

export async function loader(args) {
  return await loadCriticalData(args);
}

/**
 * The homepage is CMS-driven: its content is the dynamic zone on the Strapi
 * `page` entry whose path is "/".
 *
 * `_index` outranks the `$` catch-all in flatRoutes, so without this fetch a
 * page authored at "/" would be published and never rendered — silently, with
 * no 404 and no build error. getPage is null-safe and never throws, so a Strapi
 * outage renders an empty page rather than a 500.
 *
 * The Hydrogen starter's FeaturedCollection and RecommendedProducts sections
 * used to live here. They were removed once the hero landed — along with their
 * two Storefront queries, which were still running on every request with
 * nothing consuming the results. Recover them from git history if a
 * product-driven module is wanted on the homepage later.
 *
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, request}) {
  const {page, modules} = await context.strapi.getPage('/');

  // See the note in app/routes/$.jsx — module.product-cards needs Shopify data
  // the CMS payload does not carry, and only a loader can fetch it.
  const [products, blogPosts, videoLibrary] = await Promise.all([
    getModuleProducts({storefront: context.storefront, modules}),
    // A Post Grid's page of posts (?page=); null without one.
    getModuleBlogs({strapi: context.strapi, modules, request}),
    // A Video Library's videos, grouped; null without one.
    getModuleVideos({strapi: context.strapi, modules}),
  ]);

  return {
    products,
    blogPosts,
    videoLibrary,
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    canonical: `${siteOrigin(request)}/`,
    // The homepage's own seo fields, for the meta tags.
    seo: page?.seo ?? null,
    modules,
    strapiBaseUrl: context.env.STRAPI_API_URL,
    // Read by PageLayout via useMatches to decide whether the newsletter band
    // renders above the footer. Exposed even when null so the layout can tell
    // "this page has an opinion" from "no page loaded".
    includeNewsletter: page?.includeNewsletter ?? null,
  };
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const data = useLoaderData();

  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      <BlockManager
        blocks={data.modules}
        baseUrl={data.strapiBaseUrl}
        products={data.products}
        blogPosts={data.blogPosts}
        videoLibrary={data.videoLibrary}
      />
    </div>
  );
}

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
