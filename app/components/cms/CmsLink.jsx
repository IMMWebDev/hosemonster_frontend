import {Link, NavLink, useLocation} from 'react-router';
import {linkDestination} from '~/lib/cms-links';
import {useTrackId} from '~/lib/tracking';

/**
 * Resolves a Strapi "link" component to an anchor.
 *
 * Ported from nextjs-sample/components/utilities/link. A link has one of four
 * destinations, resolved in this order (linkDestination in app/lib/cms-links.js):
 *
 *   linkUrl         typed in — external addresses, and anything with no CMS
 *                   entry to point at
 *   pageLink        relation to a CMS page
 *   collectionLink  relation to a Shopify collection page, resolved through its
 *                   `path`, which a Strapi lifecycle keeps derived from the
 *                   Shopify handle
 *   useLink         relation to a page under the Uses hub — `path` is kept as
 *                   /uses/{slug} the same way
 *
 * The relations are preferred over a typed URL because they survive a path
 * change. Internal links use React Router's <NavLink> for client-side
 * navigation; external / new-tab links use a plain <a>.
 *
 * NavLink rather than Link so the link to the page you are on gets
 * `aria-current="page"`. Exact match only: a screen reader announces it as
 * "current page", so /uses must not claim it on /uses/hydrant-flow-testing.
 * The nav's "you are in this section" styling is `markSection`, below.
 *
 * @param {{
 *   link: {linkUrl?: string, openNewTab?: boolean, pageLink?: {path?: string}, collectionLink?: {path?: string}, useLink?: {path?: string}, linkText?: string},
 *   className?: string,
 *   children?: import('react').ReactNode,
 *   onClick?: (event: import('react').MouseEvent) => void,
 *   style?: import('react').CSSProperties,
 *   dataReveal?: string | boolean,
 *   trackRole?: string,
 *   markCurrent?: boolean,
 *   markSection?: boolean,
 * }} props
 *
 * `trackRole` names the link for analytics: inside a module it becomes
 * data-track-id="{page}__{module}__{role}" — see app/lib/tracking.js. Use a
 * fixed role ("primary-cta", "card-3"), never the link's text.
 *
 * `markSection` is for the site nav: it adds `data-active` while the visitor
 * is on the link's page or anywhere beneath it, which is what the header and
 * mobile menu style as "you are here". Styling only — nothing is announced.
 */
export default function CmsLink({
  link,
  className = '',
  children,
  onClick,
  style,
  // Scroll-reveal passthrough — see app/styles/motion.css. Card components
  // render through this link, so without it they cannot opt into the reveal.
  dataReveal,
  trackRole,
  // false: never set aria-current (breadcrumbs). See the plain-Link branch.
  markCurrent = true,
  markSection = false,
}) {
  const trackId = useTrackId();
  const {pathname, search} = useLocation();
  if (!link) return null;
  const dataTrackId = trackId(trackRole);
  const {openNewTab, linkText} = link;
  const to = linkDestination(link) || '#';
  const label = children ?? linkText;
  // Any scheme — https:, tel:, mailto: — leaves the app, so it gets a plain
  // <a>. A router link would try to resolve "tel:888…" as a path.
  const isExternal = /^[a-z][a-z\d+.-]*:/i.test(to) || to.startsWith('//');

  /*
   * A '#' placeholder — typed by an editor while the real page is being built,
   * or the fallback for a link with no destination — gets a plain <a href="#">
   * so hovering shows the '#' and it's obvious the link was set. A router
   * <Link to="#"> would resolve to the current page and drop the bare '#' from
   * the href. The click is cancelled: a placeholder shouldn't throw the visitor
   * back to the top of the page. The caller's onClick (closing a menu) and
   * click tracking still run.
   *
   * Checked before the new-tab branch, so a placeholder with "open in new
   * tab" ticked doesn't open a second copy of the current page.
   */
  if (to === '#') {
    return (
      // A deliberate placeholder, not a button in disguise: it becomes a real
      // link as soon as the CMS entry gets a destination.
      // eslint-disable-next-line jsx-a11y/anchor-is-valid
      <a
        href="#"
        className={className}
        onClick={(event) => {
          event.preventDefault();
          onClick?.(event);
        }}
        style={style}
        data-reveal={dataReveal}
        data-track-id={dataTrackId}
      >
        {label}
      </a>
    );
  }

  if (isExternal || openNewTab) {
    return (
      <a
        href={to}
        className={className}
        onClick={onClick}
        style={style}
        data-reveal={dataReveal}
        data-track-id={dataTrackId}
        target={openNewTab ? '_blank' : undefined}
        rel={openNewTab ? 'noopener noreferrer' : undefined}
      >
        {label}
        {/* Warns screen-reader users before the tab switch, which also
            leaves them without a working Back button. */}
        {openNewTab ? (
          <span className="sr-only"> (opens in a new tab)</span>
        ) : null}
      </a>
    );
  }

  /*
   * Same-page jumps like '#request-a-virtual-tour' resolve against the CURRENT
   * url, so NavLink would consider every one a match and mark it as the current
   * page. They get a plain Link, which never sets aria-current.
   *
   * A jump keeps the current query string. A hash-only `to` resolves against
   * the pathname alone, so on ?page=2 or ?utm_source=… it would drop the query
   * and become a full navigation that reruns every loader (and resets a
   * filtered listing).
   *
   * The fragment passes through as typed — useHashScroll matches it as typed,
   * then slugged, so '#request_a_virtual_tour' still finds the module whose id
   * is 'request-a-virtual-tour' without breaking hand-written ids elsewhere.
   */
  if (to.startsWith('#')) {
    return (
      <Link
        to={{search, hash: to}}
        className={className}
        onClick={onClick}
        style={style}
        data-reveal={dataReveal}
        data-track-id={dataTrackId}
      >
        {label}
      </Link>
    );
  }

  // A breadcrumb is an ancestor of the page by definition, so prefix matching
  // would mark it current; the trail's last item carries aria-current instead.
  if (!markCurrent) {
    return (
      <Link
        to={to}
        className={className}
        onClick={onClick}
        style={style}
        data-reveal={dataReveal}
        data-track-id={dataTrackId}
      >
        {label}
      </Link>
    );
  }

  return (
    <NavLink
      to={to}
      // Exact match: aria-current="page" means THIS page, never an ancestor.
      end
      className={className}
      onClick={onClick}
      style={style}
      data-reveal={dataReveal}
      data-track-id={dataTrackId}
      // Empty string, not a boolean — React would render data-active="false",
      // and CSS attribute selectors match on presence.
      data-active={markSection && isInSection(pathname, to) ? '' : undefined}
    >
      {label}
    </NavLink>
  );
}

/**
 * True when `pathname` is the link's page or anywhere beneath it: /uses on
 * /uses/hydrant-flow-testing. Home only matches itself, or it would match
 * every page. Case-insensitive and trailing-slash tolerant, like NavLink.
 *
 * @param {string} pathname
 * @param {string} to
 */
function isInSection(pathname, to) {
  const target = trimSlash(to.split(/[?#]/)[0].toLowerCase());
  if (!target.startsWith('/')) return false;
  const current = trimSlash(pathname.toLowerCase());
  if (target === '/') return current === '/';
  return current === target || current.startsWith(`${target}/`);
}

/** @param {string} path */
function trimSlash(path) {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

