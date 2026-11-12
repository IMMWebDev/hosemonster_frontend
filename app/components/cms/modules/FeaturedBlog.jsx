import CmsLink from '~/components/cms/CmsLink';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {postCard} from '~/lib/blog-meta';
import {strapiMedia, strapiSrcSet} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './FeaturedBlog.module.css';

/**
 * Featured Blog module — sprint-05 hifi_blog.html, "Featured".
 *
 * One blog post in a wide bordered card: its photo on the left; title,
 * excerpt, date · read time and "Read the post" on the right. The whole card
 * is the link.
 *
 * Strapi holds only the pick (`blog`, a relation to the Blogs collection
 * type) and the module's own copy. Everything on the card comes from the post
 * (lib/blog-meta's postCard, shared with Post Grid):
 * - photo: its Card Image, else its Hero Image;
 * - excerpt: its Excerpt, else its SEO meta description;
 * - date: its Publish Date ("Jan 26, 2026"); read time: counted from its
 *   WYSIWYG text, the same count as the post's own hero.
 *
 * A published page links to the post's published version, so a post that
 * isn't published (or was deleted) hides the module rather than leaving an
 * empty card.
 *
 * The card is one <a> holding block content (valid in HTML5), so the whole
 * card is the target, as the comp draws it.
 *
 * Desktop: photo and copy side by side. ≤699px: the photo stacks over the
 * copy.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     ctaLabel?: string,
 *     blog?: {
 *       name?: string,
 *       path?: string,
 *       excerpt?: string,
 *       publishDate?: string,
 *       cardImage?: object | null,
 *       heroImage?: object | null,
 *       seo?: {metaDescription?: string} | null,
 *       modules?: Array<{__component: string, wysiwyg?: string}>,
 *     } | null,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function FeaturedBlog({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const {eyebrow, ctaLabel, blog} = data ?? {};
  if (!blog?.name || !blog.path) return null;

  const {image, excerpt, date, minutes} = postCard(blog);
  const imageUrl = strapiMedia(image?.url, baseUrl);

  return (
    <section {...trackingRoot} className={styles.section}>
      <div className={styles.inner}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}

        <CmsLink
          link={{linkUrl: blog.path}}
          className={styles.card}
          trackRole="post"
          markCurrent={false}
          dataReveal
        >
          <div className={styles.media}>
            {imageUrl ? (
              <img
                src={imageUrl}
                srcSet={strapiSrcSet(image, baseUrl)}
                sizes="(max-width: 699px) 100vw, (max-width: 1099px) 50vw, 700px"
                // Decorative: the title beside it names the post.
                alt=""
                className={styles.image}
                width={image.width}
                height={image.height}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>

          <div className={styles.copy}>
            <h2 className={styles.title}>
              <RaisedMarks text={blog.name} />
            </h2>
            {excerpt ? <p className={styles.excerpt}>{excerpt}</p> : null}
            {date || minutes ? (
              <p className={styles.meta}>
                {date ? <time dateTime={blog.publishDate}>{date}</time> : null}
                {date && minutes ? ' · ' : null}
                {minutes ? `${minutes} min read` : null}
              </p>
            ) : null}
            <span className={styles.cta}>
              {ctaLabel || 'Read the post'}
              <svg
                className={styles.chevron}
                width="6"
                height="11"
                viewBox="-12 -12 682 1229"
                aria-hidden="true"
                focusable="false"
              >
                <polygon
                  points="0,0 225,0 658,602 225,1205 0,1205 423,602"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="24"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </CmsLink>
      </div>
    </section>
  );
}
