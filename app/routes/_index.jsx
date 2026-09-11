import {useLoaderData} from 'react-router';
import {MockShopNotice} from '~/components/MockShopNotice';
import BlockManager from '~/components/cms/BlockManager';

const HOME_TITLE = 'Home Page | Hose Monster';
/*
 * Social share card. 5000x2625 (1.90:1), which sits inside the 1.91:1 that
 * Facebook, LinkedIn and X all expect, so it crops cleanly on every platform.
 *
 * Absolute URL, not a path — scrapers fetch it without a page context, so a
 * relative one resolves against nothing and the card renders blank.
 */
const HOME_OG_IMAGE =
  'https://media.impactmit.com/image/upload/v1789141092/HM_OGI_Home_c1f4da3fb2.png';

const HOME_DESCRIPTION =
  'Hose Monster makes the safest, most accurate and efficient flow testing ' +
  'equipment in the industry. Contact a sales rep to upgrade your fire ' +
  'protection today!';

/**
 * Homepage metadata.
 *
 * ⚠ Hardcoded, unlike every other CMS page. `app/routes/$.jsx` builds its tags
 * from the page's `seo` component in Strapi; this route ignores that entirely.
 *
 * The homepage entry in Strapi still HAS an `seo` component — it is required on
 * the Pages type — so anything typed into it there has no effect on what
 * renders. Edit the constants above instead, or port the meta function from
 * `$.jsx` to make this CMS-driven.
 *
 * Values carried over from the live WordPress site so search results and shared
 * links do not change wording at launch.
 *
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [
    {title: HOME_TITLE},
    {name: 'description', content: HOME_DESCRIPTION},
    {property: 'og:title', content: HOME_TITLE},
    {property: 'og:description', content: HOME_DESCRIPTION},
    {property: 'og:type', content: 'website'},
    {property: 'og:site_name', content: 'HoseMonster'},
    {property: 'og:image', content: HOME_OG_IMAGE},
    // Dimensions let a scraper reserve the right space before the image loads,
    // and stop some platforms falling back to a smaller card layout.
    {property: 'og:image:width', content: '5000'},
    {property: 'og:image:height', content: '2625'},
    {property: 'og:image:alt', content: HOME_TITLE},
    {name: 'twitter:card', content: 'summary_large_image'},
    // X reads its own namespace first and does not fall back to og:image in
    // every case, so it is stated explicitly rather than assumed.
    {name: 'twitter:image', content: HOME_OG_IMAGE},
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
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
async function loadCriticalData({context}) {
  const {page, modules} = await context.strapi.getPage('/');

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
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
      <BlockManager blocks={data.modules} baseUrl={data.strapiBaseUrl} />
    </div>
  );
}

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
