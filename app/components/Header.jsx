import {Suspense, useCallback, useEffect, useId, useRef, useState} from 'react';
import {Await, NavLink, useAsyncValue, useLocation} from 'react-router';
import {useIsomorphicLayoutEffect} from '~/lib/use-isomorphic-layout-effect';
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
          {mainNav.map((item, i) =>
            item?.isDropdown ? (
              <NavDropdown key={item.id ?? i} item={item} />
            ) : (
              <CmsLink
                key={item.id ?? i}
                link={item?.link}
                className={styles.navLink}
              />
            ),
          )}
        </nav>

          <HeaderMenuMobileToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * True when a CMS link actually points somewhere. Unset links come back from
 * Strapi as '#' placeholders or empty, and a parent that only opens a menu is a
 * legitimate configuration — "Resources" is a grouping label, not a page.
 *
 * @param {{linkUrl?: string, pageLink?: {path?: string}}} [link]
 */
function hasDestination(link) {
  const to = link?.linkUrl || link?.pageLink?.path;
  return Boolean(to) && to !== '#';
}

/**
 * A top-level nav entry that opens a menu.
 *
 * The parent element is a LINK when the CMS gives it a destination and a BUTTON
 * when it does not — the markup follows the content rather than forcing one
 * shape. That distinction matters on touch, where there is no hover: a link
 * that also toggles has to either navigate or open, and whichever it picks, the
 * other action becomes unreachable. So when the parent is a link it gets a
 * separate caret button beside it, giving both actions their own target on
 * every input type. When it is a button, the whole control toggles.
 *
 * Nothing here is auto-generated — no synthesised "Shop All" entry. The menu
 * contains exactly what `dropdownLinks` contains, so what the CMS shows is what
 * renders. If a landing page should be reachable from inside the menu, it is
 * added in Strapi like any other link.
 *
 * @param {{item: {id?: number, link?: object, dropdownLinks?: Array<object>}}}
 */
function NavDropdown({item}) {
  const {link, dropdownLinks = []} = item;
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);
  const menuId = useId();
  const {pathname} = useLocation();
  const linked = hasDestination(link);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // A short grace period on mouseleave. Without it, the diagonal path from the
  // parent across to an item lower in the panel crosses dead space and the menu
  // shuts under the cursor.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // Close when navigating — clicking an item inside the panel would otherwise
  // leave it hanging open over the new page.
  useEffect(() => setOpen(false), [pathname]);

  /*
   * The nav sits at the right of the header, so a left-anchored panel on one of
   * the last items runs straight off the viewport — Shop overflowed by 134px
   * and gave the whole page a horizontal scrollbar. Measured rather than
   * hard-coded to the last item, because which items are dropdowns is CMS-driven
   * and the nav width changes with the labels.
   *
   * offsetWidth is readable while the panel is visually hidden: it is
   * opacity/visibility-hidden, never display:none, so it still has layout.
   */
  useIsomorphicLayoutEffect(() => {
    if (!open) return undefined;

    const measure = () => {
      const wrap = wrapRef.current;
      const panel = panelRef.current;
      if (!wrap || !panel) return;
      const EDGE_MARGIN = 16;
      const left = wrap.getBoundingClientRect().left;
      setAlignEnd(left + panel.offsetWidth > window.innerWidth - EDGE_MARGIN);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      // Return focus to the control that opened the menu, or Escape strands
      // keyboard users at the top of the document.
      wrapRef.current?.querySelector('[aria-expanded]')?.focus();
    };
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (dropdownLinks.length === 0) {
    // Flagged as a dropdown but empty. Fall back to a plain link rather than
    // rendering a control that opens nothing.
    return <CmsLink link={link} className={styles.navLink} />;
  }

  const label = link?.linkText ?? '';
  const caret = (
    <svg
      className={styles.navCaret}
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div
      className={styles.navItem}
      ref={wrapRef}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {linked ? (
        <>
          <CmsLink link={link} className={styles.navLink} />
          <button
            type="button"
            className={styles.navCaretButton}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={`${open ? 'Close' : 'Open'} ${label} menu`}
            onClick={() => setOpen((v) => !v)}
          >
            {caret}
          </button>
        </>
      ) : (
        <button
          type="button"
          className={`${styles.navLink} ${styles.navTrigger}`}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          {label}
          {caret}
        </button>
      )}

      <div
        id={menuId}
        ref={panelRef}
        className={styles.dropdown}
        data-open={open ? 'true' : undefined}
        data-align={alignEnd ? 'end' : undefined}
        // Hidden from assistive tech and taken out of the tab order while
        // closed. `hidden` alone would kill the open/close transition.
        aria-hidden={open ? undefined : 'true'}
        inert={open ? undefined : ''}
      >
        <ul className={styles.dropdownList}>
          {dropdownLinks.map((child, i) => (
            <li key={child.id ?? i}>
              <CmsLink link={child} className={styles.dropdownLink} />
            </li>
          ))}
        </ul>
      </div>
    </div>
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
      {mainNav.map((item, i) =>
        item?.isDropdown && (item.dropdownLinks?.length ?? 0) > 0 ? (
          <MobileNavGroup key={item.id ?? i} item={item} onNavigate={close} />
        ) : (
          <CmsLink
            key={item.id ?? i}
            link={item?.link}
            className={styles.navLink}
          />
        ),
      )}
    </nav>
  );
}

/**
 * One collapsible group in the mobile drawer.
 *
 * The desktop hover menu has no equivalent on touch, so dropdown children would
 * otherwise be unreachable on a phone entirely. An accordion is used rather
 * than showing everything expanded because the drawer would otherwise run to
 * several screens once all three menus are populated.
 *
 * When the parent has its own destination it is a link in the row, with the
 * chevron as a separate toggle — same reasoning as the desktop version.
 *
 * @param {{item: {link?: object, dropdownLinks?: Array<object>}, onNavigate: () => void}}
 */
function MobileNavGroup({item, onNavigate}) {
  const {link, dropdownLinks = []} = item;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const linked = hasDestination(link);
  const label = link?.linkText ?? '';

  return (
    <div className={styles.mobileGroup}>
      <div className={styles.mobileGroupHeader}>
        {linked ? (
          <CmsLink
            link={link}
            className={styles.navLink}
            onClick={onNavigate}
          />
        ) : (
          <span className={styles.navLink}>{label}</span>
        )}
        <button
          type="button"
          className={styles.mobileToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            className={styles.navCaret}
            viewBox="0 0 10 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M1 1l4 4 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open ? (
        <ul id={panelId} className={styles.mobileSubList}>
          {dropdownLinks.map((child, i) => (
            <li key={child.id ?? i}>
              <CmsLink
                link={child}
                className={styles.mobileSubLink}
                onClick={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
