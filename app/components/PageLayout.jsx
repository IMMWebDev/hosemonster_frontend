import {Await, useMatches} from 'react-router';
import {Suspense} from 'react';
import {Aside} from '~/components/Aside';
import {useReveal} from '~/lib/use-reveal';
import PageWatermark from '~/components/cms/PageWatermark';
import {strapiMedia} from '~/lib/strapi-media';
import {Footer} from '~/components/Footer';
import Newsletter from '~/components/Newsletter';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import QuickSearch from '~/components/search/QuickSearch';

/**
 * @param {PageLayoutProps}
 */
export function PageLayout({
  cart,
  children = null,
  header,
  isLoggedIn,
  publicStoreDomain,
  cmsHeader,
  cmsFooter,
  cmsOptions,
  siteEnv,
  strapiBaseUrl,
}) {
  const includeNewsletter = useIncludeNewsletter();
  // Drives every module's scroll-reveal. See app/styles/motion.css.
  useReveal();
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <QuickSearch />
      <MobileMenuAside cmsHeader={cmsHeader} />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
          cmsHeader={cmsHeader}
          strapiBaseUrl={strapiBaseUrl}
        />
      )}
      {/*
        Site-wide brand watermark, from the Options single type. Wraps <main>
        rather than living inside a module so it repeats behind the whole page
        — and so every page gets it, not only ones built from a dynamic zone.
      */}
      <PageWatermark
        imageUrl={strapiMedia(cmsOptions?.watermark?.url, strapiBaseUrl)}
      >
        <main>{children}</main>
      </PageWatermark>
      {includeNewsletter && cmsOptions?.newsletter ? (
        <Newsletter
          newsletter={cmsOptions.newsletter}
          baseUrl={strapiBaseUrl}
          siteEnv={siteEnv}
        />
      ) : null}
      <Footer
        header={header}
        cmsFooter={cmsFooter}
        strapiBaseUrl={strapiBaseUrl}
      />
    </Aside.Provider>
  );
}

/**
 * Reads the current page's `includeNewsletter` switch.
 *
 * The newsletter band is site chrome rendered here in the layout, but the
 * switch belongs to the PAGE, whose data is loaded by the route nested below
 * this component. `useMatches` is how a layout reaches a child route's loader
 * data without fetching the page a second time. The deepest match that
 * actually carries the field wins.
 *
 * Anything other than an explicit `false` counts as on. Strapi only applies a
 * field's default to NEWLY created entries, so every page authored before the
 * switch existed reports `null` — treating null as off would silently hide the
 * band across the whole site.
 *
 * @returns {boolean}
 */
function useIncludeNewsletter() {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const data = matches[i]?.data;
    if (data && typeof data === 'object' && 'includeNewsletter' in data) {
      return data.includeNewsletter !== false;
    }
  }
  return true;
}

/**
 * @param {{cart: PageLayoutProps['cart']}}
 */
function CartAside({cart}) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

/**
 * @param {{
 *   header: PageLayoutProps['header'];
 *   publicStoreDomain: PageLayoutProps['publicStoreDomain'];
 * }}
 */
/**
 * Mobile nav drawer. Driven by the same CMS nav as the desktop header, so the
 * two cannot drift apart.
 *
 * @param {{cmsHeader?: Record<string, any>}}
 */
function MobileMenuAside({cmsHeader}) {
  const mainNav = cmsHeader?.mainNav ?? [];
  if (mainNav.length === 0) return null;

  return (
    <Aside type="mobile" heading="MENU">
      <HeaderMenu mainNav={mainNav} />
    </Aside>
  );
}

/**
 * @typedef {Object} PageLayoutProps
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<FooterQuery|null>} footer
 * @property {HeaderQuery} header
 * @property {Promise<boolean>} isLoggedIn
 * @property {string} publicStoreDomain
 * @property {React.ReactNode} [children]
 */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
