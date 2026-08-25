import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './Header.module.css';

/**
 * Site header — Figma "Web Styleguide" → Nav + Footer → Navbar (21:263).
 *
 * Content is CMS-driven (Strapi `header` single type): logo, main nav, and the
 * utility bar links. The commerce controls (search, account, cart) are rendered
 * by Hydrogen because they depend on live session and cart state; the CMS only
 * decides whether they appear and what they are labelled.
 *
 * @param {HeaderProps}
 */
export function Header({
  header,
  isLoggedIn,
  cart,
  cmsHeader,
  strapiBaseUrl,
}) {
  const {shop} = header;

  const logoUrl = strapiMedia(cmsHeader?.logo?.url, strapiBaseUrl);
  // The logo links to home, so it needs a real alt. There is no CMS alt field
  // by design — it comes from the Media Library's own alternativeText, set once
  // on the upload, and falls back to the shop name.
  const logoAlt = cmsHeader?.logo?.alternativeText || shop.name;
  const utilityLinks = cmsHeader?.utilityLinks ?? [];
  const mainNav = cmsHeader?.mainNav ?? [];

  // These default to `true` rather than `?? true` on a nullish check alone,
  // because Strapi returns null (not the schema default) for fields added to a
  // pre-existing entry. Only an explicit `false` should hide a control.
  const showSearch = cmsHeader?.showSearch !== false;
  const showAccount = cmsHeader?.showAccount !== false;
  const showCart = cmsHeader?.showCart !== false;

  return (
    <header className={styles.header}>
      <div className={styles.utilityBar}>
        <div className={styles.utilityInner}>
          {showSearch && <SearchToggle />}

          {utilityLinks.map((link, i) => (
            <UtilityItem key={link.id ?? i} showSeparator={showSearch || i > 0}>
              <CmsLink link={link} className={styles.utilityLink} />
            </UtilityItem>
          ))}

          {showAccount && (
            <UtilityItem showSeparator={showSearch || utilityLinks.length > 0}>
              <AccountLink
                isLoggedIn={isLoggedIn}
                label={cmsHeader?.accountLabel || 'My Account'}
              />
            </UtilityItem>
          )}

          {showCart && (
            <UtilityItem
              showSeparator={
                showSearch || showAccount || utilityLinks.length > 0
              }
            >
              <CartToggle cart={cart} label={cmsHeader?.cartLabel || 'Cart'} />
            </UtilityItem>
          )}
        </div>
      </div>

      <div className={styles.mainBar}>
        <div className={styles.mainBarInner}>
        <NavLink prefetch="intent" to="/" className={styles.logo} end>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={logoAlt}
              className={styles.logoImage}
              width={cmsHeader?.logo?.width ?? 185}
              height={cmsHeader?.logo?.height ?? 48}
            />
          ) : (
            <span className={styles.logoFallback}>{shop.name}</span>
          )}
        </NavLink>

        <nav className={styles.nav} role="navigation">
          {mainNav.map((link, i) => (
            <CmsLink
              key={link.id ?? i}
              link={link}
              className={styles.navLink}
            />
          ))}
        </nav>

          <HeaderMenuMobileToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * Wraps a utility-bar item, optionally preceded by the "·" divider from the
 * design. The divider is decorative, so it is hidden from assistive tech.
 *
 * @param {{showSeparator?: boolean, children: import('react').ReactNode}}
 */
function UtilityItem({showSeparator, children}) {
  return (
    <>
      {showSeparator && (
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
      )}
      {children}
    </>
  );
}

/**
 * Mobile drawer nav. Rendered inside the Aside by PageLayout, so it reuses the
 * CMS nav rather than the Shopify menu.
 *
 * @param {{mainNav: Array<object>}}
 */
export function HeaderMenu({mainNav = []}) {
  const {close} = useAside();

  return (
    <nav className="header-menu-mobile" role="navigation">
      <NavLink end onClick={close} prefetch="intent" to="/">
        Home
      </NavLink>
      {mainNav.map((link, i) => (
        <CmsLink
          key={link.id ?? i}
          link={link}
          className={styles.navLink}
        />
      ))}
    </nav>
  );
}

/**
 * @param {{isLoggedIn: Promise<boolean>, label: string}}
 */
function AccountLink({isLoggedIn, label}) {
  return (
    <NavLink prefetch="intent" to="/account" className={styles.utilityLink}>
      <Suspense fallback={label}>
        <Await resolve={isLoggedIn} errorElement={label}>
          {(loggedIn) => (loggedIn ? label : 'Sign In')}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className={styles.menuToggle}
      onClick={() => open('mobile')}
      aria-label="Open menu"
    >
      ☰
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button
      className={`${styles.utilityButton} ${styles.searchButton}`}
      onClick={() => open('search')}
      aria-label="Search"
    >
      {/* Inline rather than an asset: the Figma node is a text layer containing
          an emoji, not an exported icon, so there is no vector to pull. */}
      <svg
        className={styles.searchIcon}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5" />
        <line x1="10.8" y1="10.8" x2="14.5" y2="14.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * @param {{count: number, label: string}}
 */
function CartBadge({count, label}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      className={styles.utilityLink}
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        });
      }}
    >
      {label} <span aria-label={`(items: ${count})`}>({count})</span>
    </a>
  );
}

/**
 * @param {{cart: HeaderProps['cart'], label: string}}
 */
function CartToggle({cart, label}) {
  return (
    <Suspense fallback={<CartBadge count={0} label={label} />}>
      <Await resolve={cart}>
        <CartBanner label={label} />
      </Await>
    </Suspense>
  );
}

/**
 * @param {{label: string}}
 */
function CartBanner({label}) {
  const originalCart = useAsyncValue();
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} label={label} />;
}

/** @typedef {'desktop' | 'mobile'} Viewport */
/**
 * @typedef {Object} HeaderProps
 * @property {HeaderQuery} header
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<boolean>} isLoggedIn
 * @property {string} publicStoreDomain
 * @property {Record<string, any>} [cmsHeader]
 * @property {string} [strapiBaseUrl]
 */

/** @typedef {import('@shopify/hydrogen').CartViewPayload} CartViewPayload */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
