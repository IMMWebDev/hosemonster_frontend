import {Await, Link, useMatches} from 'react-router';
import {Suspense, useId} from 'react';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import Newsletter from '~/components/Newsletter';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';

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
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <SearchAside />
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
      <main>{children}</main>
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

function SearchAside() {
  const queriesDatalistId = useId();
  return (
    <Aside type="search" heading="SEARCH">
      <div className="predictive-search">
        <br />
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
              />
              &nbsp;
              <button onClick={goToSearch}>Search</button>
            </>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (state === 'loading' && term.current) {
              return <div>Loading...</div>;
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={term} />;
            }

            return (
              <>
                <SearchResultsPredictive.Queries
                  queries={queries}
                  queriesDatalistId={queriesDatalistId}
                />
                <SearchResultsPredictive.Products
                  products={products}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Collections
                  collections={collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={articles}
                  closeSearch={closeSearch}
                  term={term}
                />
                {term.current && total ? (
                  <Link
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                  >
                    <p>
                      View all results for <q>{term.current}</q>
                      &nbsp; →
                    </p>
                  </Link>
                ) : null}
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
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
