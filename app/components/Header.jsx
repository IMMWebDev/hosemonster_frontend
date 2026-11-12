import {Suspense, useCallback, useEffect, useId, useRef, useState} from 'react';
import {Await, NavLink, useAsyncValue, useLocation} from 'react-router';
import {useIsomorphicLayoutEffect} from '~/lib/use-isomorphic-layout-effect';
import {useHeaderScroll} from '~/lib/use-header-scroll';
import {useNavHeight} from '~/lib/use-nav-height';
import {useUtilityBarHeight} from '~/lib/use-utility-bar-height';
import {useOptimisticCart} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import {MOBILE_MENU_ID} from '~/components/Drawer';
import {CART_DRAWER_ID} from '~/components/cart/CartDrawer';
import {QUICK_SEARCH_ID} from '~/components/search/QuickSearch';
import CmsLink from '~/components/cms/CmsLink';
import {linkDestination} from '~/lib/cms-links';
import {strapiMedia} from '~/lib/strapi-media';
import {TrackingScope, useTrackId} from '~/lib/tracking';
import styles from './Header.module.css';

/**
 * Site header — Figma "Web Styleguide" → Nav + Footer → Navbar (21:263).
 *
 * Content is CMS-driven (Strapi `header` single type): logo, main nav, and the
 * utility bar links. The commerce controls (search, account, cart) are rendered
 * by Hydrogen because they depend on live session and cart state; the CMS only
 * decides whether they appear and what they are labelled.
 *
 * Tracking scope "header" (app/lib/tracking.js). The scope is set up here, so
 * this component's own controls carry literal ids; CmsLink and the child
 * components read the scope themselves. Nav roles come from the labels — the
 * nav is a fixed list, and its labels are what the items are.
 *
 * @param {HeaderProps}
 */
export function Header({header, isLoggedIn, cart, cmsHeader, strapiBaseUrl}) {
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

  /*
   * The whole header slides away on downward scroll and returns on the first
   * upward one — see use-header-scroll.js.
   *
   * The utility bar is NOT part of that. It scrolls away on its own because the
   * header pins at a negative offset equal to the bar's height (Header.module.css),
   * which is measured here rather than typed: the bar wraps at narrow widths, so
   * a constant would be wrong on mobile.
   */
  const {hidden} = useHeaderScroll();
  const [headerRef, utilityBarRef] = useUtilityBarHeight();
  // The pinned nav's height, for sticky elements that sit below it.
  const navBarRef = useNavHeight();

  return (
    <TrackingScope id="header">
      {/*
       * Empty-string attributes, not booleans. React renders data-hidden="false"
       * for a boolean false, and CSS attribute selectors match on presence — so
       * the collapsed styles would apply permanently. `undefined` omits it.
       */}
      <header
        className={styles.header}
        ref={headerRef}
        data-site-header=""
        data-track-module="header"
        data-hidden={hidden ? '' : undefined}
      >
        <div className={styles.utilityBar} ref={utilityBarRef}>
          <div className={styles.utilityInner}>
            {showSearch && <SearchToggle />}

            {utilityLinks.map((link, i) => (
              <UtilityItem key={link.id ?? i} showSeparator={showSearch || i > 0}>
                <CmsLink
                  link={link}
                  className={styles.utilityLink}
                  trackRole={link?.linkText}
                />
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

        <div className={styles.mainBar} ref={navBarRef}>
          <div className={styles.mainBarInner}>
            <NavLink
              prefetch="intent"
              to="/"
              className={styles.logo}
              end
              data-track-id="header__logo"
            >
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

            {/* Named so it reads as "Main navigation" in a screen reader's
                landmark list, as the mobile menu's nav does. */}
            <nav className={styles.nav} aria-label="Main">
              {mainNav.map((item, i) =>
                item?.isDropdown ? (
                  <NavDropdown key={item.id ?? i} item={item} />
                ) : (
                  <CmsLink
                    key={item.id ?? i}
                    link={item?.link}
                    className={styles.navLink}
                    trackRole={`nav-${item?.link?.linkText ?? ''}`}
                    markSection
                  />
                ),
              )}
            </nav>

            <HeaderMenuMobileToggle />
          </div>
        </div>
      </header>
    </TrackingScope>
  );
}

/**
 * True when a CMS link points somewhere. A parent that only opens a menu is a
 * legitimate configuration — leave its destination empty and it renders as a
 * button. A "#" placeholder counts as a destination, so it renders as a link.
 *
 * @param {object} [link]
 */
function hasDestination(link) {
  return Boolean(linkDestination(link));
}

/** Fired on window by a NavDropdown as it opens, with its menu id. */
const NAV_OPEN_EVENT = 'header:nav-dropdown-open';

/**
 * Whether keyboard focus sits inside an open panel. Closing it then would make
 * the panel inert under the focused link and drop focus to <body>, so the
 * auto-close paths leave it open; focus leaving the item still closes it.
 */
function hasKeyboardFocus(panel) {
  return Boolean(panel?.querySelector(':focus-visible'));
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
 * A disclosure: the mouse opens it by resting on the item, and the toggle opens
 * it on click, Enter or Space. Focus alone never opens it, so Tab walks the top
 * level only and the panel's links stay out of the tab order until asked for.
 * Escape, a click outside, or focus leaving the item closes it.
 *
 * @param {{item: {id?: number, link?: object, dropdownLinks?: Array<object>}}}
 */
function NavDropdown({item}) {
  const {link, dropdownLinks = []} = item;
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const closeTimer = useRef(null);
  // Whether hovering alone opened the menu (so leaving closes it, and a click
  // doesn't flip it shut), and whether the pointer is over the item now.
  const hoverOpened = useRef(false);
  const pointerInside = useRef(false);
  const menuId = useId();
  const {pathname} = useLocation();
  const trackId = useTrackId();
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

    // A menu opened by click or keyboard stays put when the pointer moves on,
    // so opening another closes it. A hover-opened one is left to its own
    // mouseleave grace period, which a diagonal path across a neighbour needs.
    window.dispatchEvent(new CustomEvent(NAV_OPEN_EVENT, {detail: menuId}));
    const onOtherOpen = (e) => {
      if (
        e.detail !== menuId &&
        !hoverOpened.current &&
        !hasKeyboardFocus(panelRef.current)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      hoverOpened.current = false;
      setOpen(false);
      // Return focus to the toggle, or Escape strands keyboard users at the
      // top of the document. Only when focus was in this menu, though: one the
      // mouse opened shouldn't pull focus from wherever it is.
      if (wrapRef.current?.contains(document.activeElement)) {
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };

    window.addEventListener(NAV_OPEN_EVENT, onOtherOpen);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener(NAV_OPEN_EVENT, onOtherOpen);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, menuId]);

  if (dropdownLinks.length === 0) {
    // Flagged as a dropdown but empty. Fall back to a plain link rather than
    // rendering a control that opens nothing.
    return (
      <CmsLink
        link={link}
        className={styles.navLink}
        trackRole={`nav-${link?.linkText ?? ''}`}
        markSection
      />
    );
  }

  const onToggle = (event) => {
    // A mouse resting on the item has already opened it, so its click keeps
    // the menu open (and now it stays when the pointer leaves) rather than
    // flipping it shut. Keyboard clicks (detail 0) always toggle.
    if (open && hoverOpened.current && event.detail > 0) {
      hoverOpened.current = false;
      return;
    }
    hoverOpened.current = false;
    setOpen((v) => !v);
  };

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
        pointerInside.current = true;
        cancelClose();
        if (!open) {
          hoverOpened.current = true;
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        pointerInside.current = false;
        // A menu opened by click or keyboard stays until it's dismissed, and
        // so does one keyboard focus has since moved into. Only the panel
        // counts: focus resting on the parent link or caret survives the close.
        if (hoverOpened.current && !hasKeyboardFocus(panelRef.current)) {
          scheduleClose();
        }
      }}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (next && e.currentTarget.contains(next)) return;
        // Safari doesn't focus a link on click, so clicking a panel link blurs
        // to nothing; closing then would pull the panel out from under it.
        if (!next && pointerInside.current) return;
        setOpen(false);
      }}
    >
      {linked ? (
        <>
          <CmsLink
            link={link}
            className={styles.navLink}
            trackRole={`nav-${label}`}
            markSection
          />
          <button
            ref={toggleRef}
            type="button"
            className={styles.navCaretButton}
            aria-expanded={open}
            aria-controls={menuId}
            // Constant: aria-expanded already says whether it's open.
            aria-label={`${label} submenu`}
            onClick={onToggle}
            data-track-id={trackId(`nav-${label}-toggle`)}
          >
            {caret}
          </button>
        </>
      ) : (
        <button
          ref={toggleRef}
          type="button"
          className={`${styles.navLink} ${styles.navTrigger}`}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={onToggle}
          // Opens the menu only — no destination — so it's the toggle.
          data-track-id={trackId(`nav-${label}-toggle`)}
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
              <CmsLink
                link={child}
                className={styles.dropdownLink}
                trackRole={`nav-${label}-${child?.linkText ?? ''}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Wraps a utility-bar item, optionally preceded by the "|" divider from the
 * design. The divider is decorative, so it is hidden from assistive tech.
 *
 * @param {{showSeparator?: boolean, children: import('react').ReactNode}}
 */
function UtilityItem({showSeparator, children}) {
  return (
    <>
      {showSeparator && (
        <span className={styles.separator} aria-hidden="true">
          |
        </span>
      )}
      {children}
    </>
  );
}

/**
 * @param {{isLoggedIn: Promise<boolean>, label: string}}
 */
function AccountLink({isLoggedIn, label}) {
  const trackId = useTrackId();
  return (
    <NavLink
      prefetch="intent"
      to="/account"
      className={styles.utilityLink}
      data-track-id={trackId('account')}
    >
      <Suspense fallback={label}>
        <Await resolve={isLoggedIn} errorElement={label}>
          {(loggedIn) => (loggedIn ? label : 'Sign In')}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function HeaderMenuMobileToggle() {
  const {type, open, close} = useAside();
  const isOpen = type === 'mobile';
  const trackId = useTrackId();

  return (
    <button
      className={styles.menuToggle}
      /*
       * A toggle, not an opener. This used to call open('mobile') on every
       * click, so tapping the hamburger while the drawer was already open just
       * reopened it — leaving no way to dismiss the menu from the control that
       * summoned it.
       */
      onClick={() => (isOpen ? close() : open('mobile'))}
      aria-expanded={isOpen}
      aria-controls={MOBILE_MENU_ID}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      data-track-id={trackId('menu-toggle')}
    >
      {isOpen ? '\u2715' : '\u2630'}
    </button>
  );
}

function SearchToggle() {
  const {type, open} = useAside();
  const trackId = useTrackId();
  return (
    <button
      type="button"
      className={`${styles.utilityButton} ${styles.searchButton}`}
      onClick={() => open('search')}
      aria-label="Search"
      aria-haspopup="dialog"
      aria-expanded={type === 'search'}
      aria-controls={QUICK_SEARCH_ID}
      data-track-id={trackId('search')}
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
 * The cart link: the label, a count pill, and a live region that announces
 * the count as it changes. Opens the drawer — except on /cart, where the
 * page is the cart and the link is just a link. `cart_viewed` is published
 * by the drawer itself, whoever opened it.
 *
 * @param {{count: number | null, label: string}}
 */
function CartBadge({count, label}) {
  const {type, open} = useAside();
  const onCartPage = useLocation().pathname === '/cart';
  const trackId = useTrackId();
  const n = count ?? 0;

  return (
    <a
      href="/cart"
      className={`${styles.utilityLink} ${styles.cartLink}`}
      aria-haspopup={onCartPage ? undefined : 'dialog'}
      aria-expanded={onCartPage ? undefined : type === 'cart'}
      aria-controls={onCartPage ? undefined : CART_DRAWER_ID}
      data-track-id={trackId('cart')}
      onClick={(e) => {
        if (onCartPage) return;
        e.preventDefault();
        open('cart');
      }}
    >
      {label}
      {n > 0 ? (
        <span className={styles.cartCount} aria-hidden="true">
          {n}
        </span>
      ) : null}
      {/* Always mounted, so a change is announced. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {count === null ? '' : `, ${n} ${n === 1 ? 'item' : 'items'}`}
      </span>
    </a>
  );
}

/**
 * @param {{cart: HeaderProps['cart'], label: string}}
 */
function CartToggle({cart, label}) {
  return (
    // No count until the cart resolves — better than a "0" that then changes.
    <Suspense fallback={<CartBadge count={null} label={label} />}>
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
