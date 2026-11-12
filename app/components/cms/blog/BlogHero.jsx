import {Fragment} from 'react';
import {useLocation, useRouteLoaderData} from 'react-router';
import CmsLink from '~/components/cms/CmsLink';
import {JsonLd} from '~/components/JsonLd';
import {linkDestination} from '~/lib/cms-links';
import {breadcrumbJsonLd} from '~/lib/seo';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {formatMonthYear, readMinutes} from '~/lib/blog-meta';
import {SocialIcon} from '~/components/icons/SocialIcon';
import {strapiMedia} from '~/lib/strapi-media';
import {
  TrackingScope,
  pageKeyFromPath,
  useTrackId,
  useTrackingRoot,
} from '~/lib/tracking';
import hero from '~/components/cms/modules/PageHero.module.css';
import styles from './BlogHero.module.css';

/**
 * The blog post hero — sprint-05 hifi_blogposttemplate.html.
 *
 * Not a module: every post gets it automatically, above its modules, built
 * from the post's own fields — `name` is the title, `heroImage` the photo,
 * `publishDate` the date. The route renders it when getPage reports
 * `type: 'blog'` ($.jsx, page-preview.jsx).
 *
 * The card is Page Hero's Compact card (the same component in the comps), so
 * it borrows those classes for the breadcrumb, the card, the photo and the
 * title, and only adds what's particular to a post: a bottom-up scrim and the
 * byline row with the share links.
 *
 * - Breadcrumb: the blog hub's own trail (its Page Hero's crumbs), then the
 *   hub, then the post — see strapi.getBlogTrail.
 * - Byline: the post's Author (Authors collection type), then the date and the
 *   read time — each left out when there isn't one.
 * - Read time: counted from the post's WYSIWYG text at 225 words a minute,
 *   rounded up (lib/blog-meta).
 *
 * @param {{
 *   post: {
 *     name?: string,
 *     publishDate?: string,
 *     heroImage?: {url?: string},
 *     author?: {name?: string} | null,
 *   },
 *   modules?: Array<{__component: string, wysiwyg?: string}>,
 *   trail?: {crumbs: Array<object>, hub: {label: string, path: string}},
 *   shareUrl?: string,
 *   baseUrl?: string,
 * }} props
 */
export default function BlogHero({
  post,
  modules = [],
  trail,
  shareUrl,
  baseUrl,
}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const origin = useRouteLoaderData('root')?.siteOrigin;
  if (!post?.name) return null;

  const imageUrl = strapiMedia(post.heroImage?.url, baseUrl);
  const date = formatMonthYear(post.publishDate);
  const minutes = readMinutes(modules);
  const crumbs = trail?.crumbs ?? [];
  const hub = trail?.hub;
  // The visible trail as BreadcrumbList structured data.
  const crumbsJsonLd = origin
    ? breadcrumbJsonLd({
        origin,
        crumbs: [
          ...crumbs.map((c) => ({name: c.linkText, href: linkDestination(c)})),
          ...(hub ? [{name: hub.label, href: hub.path}] : []),
        ],
        current: {name: post.name, url: shareUrl},
      })
    : null;
  const shares = shareUrl ? shareLinks(shareUrl, post.name) : [];
  // Author · date · read time, each only when there is one.
  const byline = [
    post.author?.name && {
      key: 'author',
      node: <RaisedMarks text={post.author.name} />,
    },
    date && {
      key: 'date',
      node: <time dateTime={post.publishDate}>{date}</time>,
    },
    minutes && {key: 'read', node: `${minutes} min read`},
  ].filter(Boolean);

  return (
    <section {...trackingRoot} className={`${styles.section} ${hero.compact}`}>
      <div className={hero.inner}>
        <JsonLd data={crumbsJsonLd} />
        <nav className={hero.breadcrumb} aria-label="Breadcrumb">
          <ol className={hero.crumbs}>
            {[
              ...crumbs,
              ...(hub ? [{linkText: hub.label, linkUrl: hub.path}] : []),
            ].map((crumb, i) => {
              /* A crumb with no page behind it (the hub trail's "Resources",
                 or a '#' placeholder) is plain text in the crumb style, not a
                 dead link that does nothing when clicked. */
              const to = linkDestination(crumb);
              return (
                <li key={crumb.id ?? `crumb-${i}`}>
                  {to && to !== '#' ? (
                    <CmsLink
                      link={crumb}
                      className={hero.crumbLink}
                      trackRole={`breadcrumb-${i + 1}`}
                      markCurrent={false}
                    />
                  ) : (
                    <span className={hero.crumbLink}>{crumb.linkText}</span>
                  )}
                </li>
              );
            })}
            <li className={styles.crumbPost}>
              <span
                className={`${hero.crumbCurrent} ${styles.crumbPostText}`}
                aria-current="page"
              >
                {post.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className={`${hero.card} ${styles.card}`}>
          {imageUrl ? (
            /* Parallax on the wrapper, reveal on the <img> — as Page Hero. */
            <div className={hero.background} data-parallax="slow">
              <img
                src={imageUrl}
                // Decorative: the title carries the meaning.
                alt=""
                className={hero.backgroundImage}
                data-reveal="zoom"
                loading="eager"
                // eslint-disable-next-line react/no-unknown-property
                fetchpriority="high"
                decoding="async"
              />
            </div>
          ) : null}

          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.copy}>
            <h1
              id={POST_TITLE_ID}
              className={`${hero.heading} ${styles.title}`}
              data-reveal="focus"
              style={{'--reveal-i': 1}}
            >
              {post.name}
            </h1>

            <div className={styles.meta} data-reveal style={{'--reveal-i': 2}}>
              {byline.length > 0 ? (
                <p className={styles.byline}>
                  {byline.map((part, i) => (
                    <Fragment key={part.key}>
                      {i > 0 ? ' · ' : null}
                      {part.node}
                    </Fragment>
                  ))}
                </p>
              ) : null}

              {shares.length > 0 ? (
                <div className={styles.share}>
                  <span className={styles.shareLabel}>Share</span>
                  <ul className={styles.shareList}>
                    {shares.map((share) => (
                      <li key={share.key}>
                        <a
                          href={share.href}
                          className={styles.shareLink}
                          aria-label={
                            share.external
                              ? `${share.label} (opens in a new tab)`
                              : share.label
                          }
                          data-track-id={trackId(`share-${share.key}`)}
                          {...(share.external
                            ? {target: '_blank', rel: 'noopener noreferrer'}
                            : {})}
                        >
                          {share.icon}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The H1's id — the post body's <article> is labelled by it (BlogBody). */
export const POST_TITLE_ID = 'post-title';

/**
 * BlogHero inside its own tracking scope, as BlockManager gives each module:
 * data-track-module="{page}__post-hero", anchor #post-hero. What the routes
 * render.
 *
 * @param {Parameters<typeof BlogHero>[0]} props
 */
export function BlogPostHero(props) {
  const {pathname} = useLocation();
  return (
    <TrackingScope
      id={`${pageKeyFromPath(pathname)}__post-hero`}
      anchor="post-hero"
    >
      <BlogHero {...props} />
    </TrackingScope>
  );
}

/**
 * The four share destinations, each a plain link — no third-party scripts.
 *
 * @param {string} url - the post's absolute URL
 * @param {string} title
 */
function shareLinks(url, title) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    {
      key: 'facebook',
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      external: true,
      icon: <SocialIcon platform="facebook" size={14} />,
    },
    {
      key: 'x',
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      external: true,
      icon: <SocialIcon platform="x" size={14} />,
    },
    {
      key: 'linkedin',
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      external: true,
      icon: <SocialIcon platform="linkedin" size={14} />,
    },
    {
      key: 'email',
      label: 'Share by email',
      href: `mailto:?subject=${t}&body=${u}`,
      external: false,
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3.5 6l8.5 7 8.5-7" />
        </svg>
      ),
    },
  ];
}
