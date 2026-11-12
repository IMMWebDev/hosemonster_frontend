import {useLocation, useRouteLoaderData} from 'react-router';
import CmsLink from '~/components/cms/CmsLink';
import {JsonLd} from '~/components/JsonLd';
import {linkDestination} from '~/lib/cms-links';
import {breadcrumbJsonLd} from '~/lib/seo';
import styles from '~/components/cms/modules/PageHero.module.css';

/**
 * The breadcrumb trail above a hero — the Breadcrumbs component
 * (utilities.breadcrumbs) that Page Hero and Feature Hero share.
 *
 * Its Breadcrumb Links are the linked crumbs in order, top level first; its
 * Breadcrumb Label is the current page, always last, as plain text rather
 * than a link to itself. A real <nav> with an ordered list, because the
 * crumbs are navigation and their order carries meaning. The slashes are
 * CSS, so they're never read aloud.
 *
 * The styles are Page Hero's (.breadcrumb, .crumbs…), which the blog post's
 * hero also borrows for its own trail (blog/BlogHero.jsx).
 *
 * Also emits the trail as BreadcrumbList structured data, so search results
 * can show it in place of the URL.
 *
 * Renders nothing when the trail is empty.
 *
 * @param {{
 *   breadcrumbs?: {
 *     breadcrumbLabel?: string | null,
 *     breadcrumbLinks?: Array<object> | null,
 *   } | null,
 * }} props
 */
export default function Breadcrumbs({breadcrumbs}) {
  const origin = useRouteLoaderData('root')?.siteOrigin;
  const {pathname} = useLocation();
  // A crumb with no text has nothing to show; skip it rather than leave an
  // empty slot between two slashes.
  const links = (breadcrumbs?.breadcrumbLinks ?? []).filter(
    (crumb) => crumb?.linkText,
  );
  const label = breadcrumbs?.breadcrumbLabel?.trim();
  if (links.length === 0 && !label) return null;

  const jsonLd = origin
    ? breadcrumbJsonLd({
        origin,
        crumbs: links.map((crumb) => ({
          name: crumb.linkText,
          href: linkDestination(crumb),
        })),
        current: label ? {name: label, url: `${origin}${pathname}`} : null,
      })
    : null;

  return (
    <>
    <JsonLd data={jsonLd} />
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.crumbs}>
        {links.map((crumb, i) => (
          <li key={crumb.id ?? i}>
            {/* A crumb with no page behind it (none set, or a '#'
                placeholder) is plain text in the crumb style, not a dead link
                that does nothing when clicked. */}
            {isLinked(crumb) ? (
              <CmsLink
                link={crumb}
                className={styles.crumbLink}
                trackRole={`breadcrumb-${i + 1}`}
                markCurrent={false}
              />
            ) : (
              <span className={styles.crumbLink}>{crumb.linkText}</span>
            )}
          </li>
        ))}
        {label ? (
          <li>
            <span className={styles.crumbCurrent} aria-current="page">
              {label}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
    </>
  );
}

/** Whether a crumb goes somewhere real — not empty, not a '#' placeholder. */
function isLinked(crumb) {
  const to = linkDestination(crumb);
  return Boolean(to) && to !== '#';
}
