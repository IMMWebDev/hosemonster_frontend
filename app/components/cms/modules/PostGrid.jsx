import {useSearchParams} from 'react-router';
import CmsLink from '~/components/cms/CmsLink';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {Pager} from '~/components/product-listing/ProductListing';
import {postCard} from '~/lib/blog-meta';
import {strapiMedia, strapiSrcSet} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './PostGrid.module.css';

/**
 * Post Grid module — sprint-05 hifi_blog.html, "Latest" (the search box is
 * left out for now).
 *
 * Every published blog post, newest first, in a three-up grid of cards:
 * photo, title, excerpt, date · read time — the same card copy as Featured
 * Blog (lib/blog-meta's postCard). Nothing is picked in Strapi; the route
 * loader fetches the posts (lib/module-blogs.js) and hands them down as
 * `blogPosts`, nine a page.
 *
 * Past nine posts the site's numbered pager appears under the grid — the
 * collection pages' Pager, so ?page=2 links are real, shareable URLs and a
 * page change lands back on this module (its anchor), not the top of the
 * page. With nine or fewer there's no pager at all.
 *
 * The comp draws four across with eight posts; at nine a page, three across
 * keeps every page's rows full.
 *
 * Desktop three across, tablet (≤1099px) two, ≤699px one.
 *
 * @param {{
 *   data: {eyebrow?: string},
 *   baseUrl?: string,
 *   blogPosts?: Awaited<ReturnType<typeof import('~/lib/module-blogs').getModuleBlogs>>,
 * }} props
 */
export default function PostGrid({data, baseUrl, blogPosts}) {
  const trackingRoot = useTrackingRoot();
  const [searchParams] = useSearchParams();
  const posts = (blogPosts?.posts ?? []).filter((p) => p?.name && p.path);
  if (posts.length === 0) return null;

  const {eyebrow} = data ?? {};
  const pagination = blogPosts.pagination;
  const headingId = trackingRoot.id ? `${trackingRoot.id}-heading` : undefined;

  return (
    <section
      {...trackingRoot}
      className={styles.section}
      aria-labelledby={headingId}
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          {/* The eyebrow is optional in Strapi, but the cards' h3s always need
              an h2 above them — without one they read as part of whatever
              section came before (on /blogs, the featured post). */}
          {eyebrow ? (
            <h2 id={headingId} className={styles.eyebrow}>
              {eyebrow}
            </h2>
          ) : (
            <h2 id={headingId} className="sr-only">
              Latest posts
            </h2>
          )}
          <p className={styles.count}>{countText(pagination)}</p>
        </div>

        <ul className={styles.grid}>
          {posts.map((post, i) => (
            <li key={post.documentId ?? post.path}>
              <PostCard post={post} baseUrl={baseUrl} position={i + 1} />
            </li>
          ))}
        </ul>

        {/* The collection pages' pager: only with more than one page. */}
        <Pager
          pagination={pagination}
          searchParams={searchParams}
          anchor={trackingRoot.id}
        />
      </div>
    </section>
  );
}

/**
 * One post: the whole card is the link, as the comp draws it.
 *
 * @param {{post: object, baseUrl?: string, position: number}} props
 */
function PostCard({post, baseUrl, position}) {
  const {image, excerpt, date, minutes} = postCard(post);
  const imageUrl = strapiMedia(image?.url, baseUrl);

  return (
    <CmsLink
      link={{linkUrl: post.path}}
      className={styles.card}
      trackRole={`post-${position}`}
      markCurrent={false}
    >
      <div className={styles.media}>
        {imageUrl ? (
          <img
            src={imageUrl}
            srcSet={strapiSrcSet(image, baseUrl)}
            sizes="(max-width: 699px) 100vw, (max-width: 1099px) 50vw, 460px"
            // Decorative: the title under it names the post.
            alt=""
            className={styles.image}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <RaisedMarks text={post.name} />
        </h3>
        {excerpt ? <p className={styles.excerpt}>{excerpt}</p> : null}
        {date || minutes ? (
          <p className={styles.meta}>
            {date ? <time dateTime={post.publishDate}>{date}</time> : null}
            {date && minutes ? ' · ' : null}
            {minutes ? `${minutes} min read` : null}
          </p>
        ) : null}
      </div>
    </CmsLink>
  );
}

/**
 * "Showing all 8 posts", or with pages "Showing 10–18 of 23 posts".
 *
 * @param {{page: number, pageCount: number, total: number, from: number, to: number}} pagination
 */
function countText({pageCount, total, from, to}) {
  if (pageCount > 1) return `Showing ${from}–${to} of ${total} posts`;
  return total === 1 ? 'Showing 1 post' : `Showing all ${total} posts`;
}
