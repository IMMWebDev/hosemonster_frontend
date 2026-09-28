import {route} from '@react-router/dev/routes';
import {flatRoutes} from '@react-router/fs-routes';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([
  ...(await flatRoutes()),
  /*
   * A product under its collection: /collections/{collection}/{product}. The
   * same module as /products/{handle}; its loader redirects either URL to
   * the one the product actually lives at (see lib/product-urls.js).
   */
  route('collections/:collection/:product', 'routes/products.$handle.jsx', {
    id: 'routes/collections.$collection.$product',
  }),
]);

/** @typedef {import('@react-router/dev/routes').RouteConfig} RouteConfig */
