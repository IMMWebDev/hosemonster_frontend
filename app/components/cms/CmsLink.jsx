import {Link, NavLink} from 'react-router';

/**
 * Resolves a Strapi "link" component to an anchor.
 *
 * Ported from nextjs-sample/components/utilities/link. A link may be external
 * (`linkUrl`) or an internal page relation (`pageLink.path`). Internal links
 * use React Router's <NavLink> for client-side navigation; external / new-tab
 * links use a plain <a>.
 *
 * NavLink rather than Link so the browser gets `aria-current="page"` on the
 * link matching the current URL. That is what the current-page underline in the
 * header hangs off — with a plain <Link> the attribute is never set and the
 * active state simply never appears.
 *
 * @param {{
 *   link: {linkUrl?: string, openNewTab?: boolean, pageLink?: {path?: string}, linkText?: string},
 *   className?: string,
 *   children?: import('react').ReactNode,
 *   onClick?: (event: import('react').MouseEvent) => void,
 *   style?: import('react').CSSProperties,
 *   dataReveal?: string | boolean
 * }} props
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
}) {
  if (!link) return null;
  const {linkUrl, openNewTab, pageLink, linkText} = link;
  const to = linkUrl || pageLink?.path || '#';
  const label = children ?? linkText;
  const isExternal = /^https?:\/\//i.test(to) || to.startsWith('//');

  if (isExternal || openNewTab) {
    return (
      <a
        href={to}
        className={className}
        onClick={onClick}
        style={style}
        data-reveal={dataReveal}
        target={openNewTab ? '_blank' : undefined}
        rel={openNewTab ? 'noopener noreferrer' : undefined}
      >
        {label}
      </a>
    );
  }

  /*
   * A link with no destination yet comes back from the CMS as '#'. React Router
   * resolves '#' against the CURRENT url, so NavLink would consider every such
   * link a match and mark the whole nav as the current page. Placeholders get a
   * plain Link, which never sets aria-current.
   */
  if (to === '#') {
    return (
      <Link
        to={to}
        className={className}
        onClick={onClick}
        style={style}
        data-reveal={dataReveal}
      >
        {label}
      </Link>
    );
  }

  return (
    <NavLink
      to={to}
      // Prefix matching is what a nav wants — /uses should read as current on
      // /uses/hydrant-flow-testing. The root is the exception: without `end`,
      // "/" matches every path and every link would look current.
      end={to === '/'}
      className={className}
      onClick={onClick}
      style={style}
      data-reveal={dataReveal}
    >
      {label}
    </NavLink>
  );
}
