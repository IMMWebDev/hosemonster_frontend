/**
 * @param {Route.LoaderArgs}
 */
export async function loader({url}) {
  throw new Response(`${url.pathname} not found`, {
    status: 404,
  });
}

export default function CatchAllPage() {
  return null;
}

/** @typedef {import('./+types/$').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
