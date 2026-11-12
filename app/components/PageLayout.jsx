import {useMatches} from 'react-router';
import {Aside} from '~/components/Aside';
import CartDrawer from '~/components/cart/CartDrawer';
import {useReveal} from '~/lib/use-reveal';
import {useHashScroll} from '~/lib/use-hash-scroll';
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
  // Lands /page#module-id URLs on that module once the page has settled.
  useHashScroll();
  return (
    <Aside.Provider>
      {/*
        The first thing Tab reaches on every page (WCAG 2.4.1): without it a
        keyboard user tabs through the utility bar, logo and whole nav before
        reaching the content. Hidden until focused — app/styles/app.css.
      */}
      <a
        href="#main"
        className="skip-link"
        onClick={skipToMain}
        data-track-id="layout__skip-link"
      >
        Skip to main content
      </a>
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
        {/* tabIndex -1 so the skip link can move focus here; the next Tab
            then goes to the page's first control. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
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
 * Moves focus to <main> directly instead of letting the browser follow the
 * #main fragment. That leaves no #main in the address for useHashScroll to aim
 * at, and doesn't scroll the top of the page under the sticky header. Without
 * JavaScript the plain fragment link still works.
 *
 * @param {import('react').MouseEvent<HTMLAnchorElement>} event
 */
function skipToMain(event) {
  const main = document.getElementById('main');
  if (!main) return;
  event.preventDefault();
  // The usual case — the skip link is the first Tab stop, so the content
  // already starts on screen — needs no scroll at all.
  const {top} = main.getBoundingClientRect();
  main.focus({preventScroll: top >= 0 && top < window.innerHeight});
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
