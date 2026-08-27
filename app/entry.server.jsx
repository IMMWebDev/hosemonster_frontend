import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {EntryContext} reactRouterContext
 * @param {HydrogenRouterContextProvider} context
 */
export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
  context,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    // Adobe Fonts (Typekit) serves the brand families, nimbus-sans-extended and
    // gopher. The kit stylesheet is fetched from use.typekit.net and the font
    // files it references are served from the same host, so both styleSrc and
    // fontSrc are required — without them the CSP blocks the fonts silently.
    // p.typekit.net is Adobe's usage-tracking pixel, which the kit also loads.
    // See app/styles/typography.css for how to wire up the kit itself.
    // ── IMPORTANT: how Hydrogen merges these ──────────────────────────────
    // Hydrogen only merges a custom directive with its defaults when that key
    // already exists in its defaults. Those keys are exactly:
    //   baseUri, defaultSrc, frameAncestors, styleSrc, connectSrc
    // For any OTHER key (imgSrc, fontSrc, …) there is nothing to merge with,
    // so the value below becomes the whole directive — and because a specific
    // directive overrides defaultSrc for that resource type, anything omitted
    // here gets BLOCKED. Listing only the new host silently broke every
    // Shopify product image. So imgSrc and fontSrc must restate the defaults.

    // Merged with defaults — safe to list only what is new.
    // p.typekit.net belongs here as well as in connectSrc: the kit stylesheet
    // opens with `@import url("https://p.typekit.net/p.css?…")`, and an @import
    // is fetched under style-src, not connect-src.
    styleSrc: [
      'https://use.typekit.net',
      'https://p.typekit.net',
      // BugHerd styles its injected sidebar.
      'https://*.bugherd.com',
      'https://www.bugherd.com',
    ],
    connectSrc: [
      'https://use.typekit.net',
      'https://p.typekit.net',
      // HubSpot form submission and field validation.
      'https://forms.hsforms.com',
      'https://forms-na1.hsforms.com',
      'https://api.hsforms.com',
      // BugHerd posts feedback and polls for tasks.
      'https://*.bugherd.com',
      'https://www.bugherd.com',
      'wss://*.bugherd.com',
      /*
       * BugHerd's sidebar bundles Bugsnag for its OWN crash reporting. Blocking
       * it does not break BugHerd, but it logs two CSP errors on every page
       * load — noise that would bury real errors during exactly the QA sessions
       * BugHerd is here to support. Remove these two if you would rather not
       * let a vendor's telemetry out.
       */
      'https://sessions.bugsnag.com',
      'https://notify.bugsnag.com',
    ],

    // NOT merged — must be complete.
    // Shopify CDN serves product and store imagery; Strapi media is uploaded
    // to Cloudinary behind the custom domain media.impactmit.com (the header
    // logo comes from there); localhost:1337 covers a local Strapi using the
    // default on-disk upload provider.
    imgSrc: [
      "'self'",
      'data:',
      'blob:', // BugHerd renders screenshot captures from blob URLs.
      'https://cdn.shopify.com',
      'https://shopify.com',
      'https://media.impactmit.com',
      'https://res.cloudinary.com',
      'http://localhost:1337',
      'https://*.bugherd.com',
      'https://www.bugherd.com',
    ],

    // NOT merged — must be complete. Adobe Fonts serves the brand families.
    fontSrc: [
      "'self'",
      'data:',
      'https://cdn.shopify.com',
      'https://use.typekit.net',
      'https://*.bugherd.com',
    ],

    /*
     * HubSpot forms are added to DEFAULT-SRC rather than a dedicated scriptSrc.
     * Two reasons, both about the merge rule above:
     *   1. defaultSrc IS one of Hydrogen's defaults, so these hosts are ADDED to
     *      what is already there instead of replacing it.
     *   2. Declaring scriptSrc would create it from scratch — and Hydrogen only
     *      appends the CSP nonce to scriptSrc when it exists, while its
     *      dev-only "http://localhost:*" allowance is added to defaultSrc only.
     *      A hand-rolled scriptSrc would therefore block Vite's own dev scripts
     *      and break HMR.
     * js.hsforms.net serves the embed loader; forms.hsforms.com receives the
     * submission and serves the form when HubSpot falls back to an iframe.
     */
    defaultSrc: [
      'https://js.hsforms.net',
      'https://forms.hsforms.com',
      'https://forms-na1.hsforms.com',
      /*
       * BugHerd (QA feedback sidebar). Goes in defaultSrc for the same reason
       * as HubSpot above — declaring scriptSrc would break Vite's dev scripts.
       * sidebarv2.js injects further scripts, iframes and workers of its own,
       * so the host has to be allowed rather than relying on the nonce, which
       * only covers the one tag we render.
       */
      'https://www.bugherd.com',
      'https://bugherd.com',
      'https://*.bugherd.com',
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

/** @typedef {import('@shopify/hydrogen').HydrogenRouterContextProvider} HydrogenRouterContextProvider */
/** @typedef {import('react-router').EntryContext} EntryContext */
