import {Link} from 'react-router';

/**
 * Resolves a Strapi "link" component to an anchor.
 *
 * Ported from nextjs-sample/components/utilities/link. A link may be external
 * (`linkUrl`) or an internal page relation (`pageLink.path`). Internal links
 * use React Router's <Link> for client-side navigation; external / new-tab
 * links use a plain <a>.
 *
 * @param {{
 *   link: {linkUrl?: string, openNewTab?: boolean, pageLink?: {path?: string}, linkText?: string},
 *   className?: string,
 *   children?: import('react').ReactNode
 * }} props
 */
export default function CmsLink({link, className = '', children}) {
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
        target={openNewTab ? '_blank' : undefined}
        rel={openNewTab ? 'noopener noreferrer' : undefined}
      >
        {label}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {label}
    </Link>
  );
}
