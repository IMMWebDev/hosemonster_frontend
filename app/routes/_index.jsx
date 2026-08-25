import {useLoaderData} from 'react-router';
import {MockShopNotice} from '~/components/MockShopNotice';
import BlockManager from '~/components/cms/BlockManager';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Hydrogen | Home'}];
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
  const {modules} = await context.strapi.getPage('/');

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    modules,
    strapiBaseUrl: context.env.STRAPI_API_URL,
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
