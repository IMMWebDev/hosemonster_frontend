import {useMatches} from 'react-router';
import {Aside} from '~/components/Aside';
import CartDrawer from '~/components/cart/CartDrawer';
import {useReveal} from '~/lib/use-reveal';
import PageWatermark from '~/components/cms/PageWatermark';
import {strapiMedia} from '~/lib/strapi-media';
import {Footer} from '~/components/Footer';
import Newsletter from '~/components/Newsletter';
import {Header} from '~/components/Header';
import MobileMenu from '~/components/MobileMenu';
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
      <CartDrawer />
      <QuickSearch />
      <MobileMenu cmsHeader={cmsHeader} strapiBaseUrl={strapiBaseUrl} />
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
