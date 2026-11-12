import {useMemo} from 'react';
import {useLocation} from 'react-router';
import BlockManager from '~/components/cms/BlockManager';
import CmsLink from '~/components/cms/CmsLink';
import AuthorCard from '~/components/cms/blog/AuthorCard';
import {PhotoViewerProvider} from '~/components/cms/blog/PhotoViewer';
import {
  TrackingScope,
  moduleTrackingIds,
  pageKeyFromPath,
  slugify,
  useTrackingRoot,
} from '~/lib/tracking';
import styles from './BlogBody.module.css';

/**
 * The body of a blog post — sprint-05 hifi_blogposttemplate.html, "Body".
 *
 * A sidebar beside the article column: "On this page" over the author card.
 * The article column holds the post's modules (WYSIWYG and the Blog Modules),
 * in order; its typography is .cms-post-body in app.css.
 *
 * "On this page" is the post's Jump Links, exactly as the editor lists them —
 * nothing is generated. Each one names a module by its Tracking ID, which is
 * already that module's HTML id (moduleTrackingIds — the same ids BlockManager
 * gives the modules here), so the link is "#" + the id, slugged the same way:
 * "Training the Experts" finds the module whose Tracking ID is "training the
 * experts". A Jump Link whose module isn't on the post is left out rather
 * than linking nowhere; with none left, there's no list.
 *
 * Before they render, the WYSIWYG modules are tidied (prepareBlogBody): empty
 * paragraphs — the blank lines a copy-paste from the old site brings with it —
 * are dropped, since the template spaces paragraphs itself, and a stray
 * Heading 1 is turned into a Heading 2 so the hero's stays the only one.
 *
 * On a tablet or phone the sidebar comes apart: "On this page" above the
 * article, the author card after it. The card is rendered twice for that —
 * in the sidebar and after the article — with CSS showing one per
 * breakpoint, so the tab and reading order always match what's on screen.
 *
 * The author card is the post's Author, from the Authors collection type
 * (AuthorCard.jsx); a post with no author has no card.
 *
 * The whole post sits inside a PhotoViewerProvider: a click on any photo in an
 * Image or Image Gallery module opens every photo in the post in one
 * full-screen swipe carousel, starting at that photo (PhotoViewer.jsx). The
 * provider reads the same tidied blocks BlockManager renders, so the modules
 * find their photos in it.
 *
 * @param {{
 *   modules?: Array<{__component: string} & Record<string, any>>,
 *   baseUrl?: string,
 *   products?: Record<string, object>,
 *   titleId?: string,
 *   author?: Parameters<typeof AuthorCard>[0]['author'],
 *   jumpLinks?: Array<{label?: string, moduleTrackingId?: string}> | null,
 * }} props
 */
export default function BlogBody({
  modules,
  baseUrl,
  products,
  titleId,
  author,
  jumpLinks,
}) {
  const {pathname} = useLocation();
  const pageKey = pageKeyFromPath(pathname);
  const blocks = useMemo(() => prepareBlogBody(modules ?? []), [modules]);
  const toc = useMemo(
    () => resolveJumpLinks(jumpLinks, blocks, pageKey),
    [jumpLinks, blocks, pageKey],
  );

  return (
    <PhotoViewerProvider modules={blocks} baseUrl={baseUrl}>
      <section className={styles.section}>
        <div className={styles.layout}>
          <TrackingScope id={`${pageKey}__post-aside`} anchor="post-aside">
            <PostAside toc={toc} author={author} baseUrl={baseUrl} />
          </TrackingScope>

          <article
            className={`${styles.article} cms-post-body`}
            aria-labelledby={titleId}
          >
            <BlockManager
              blocks={blocks}
              baseUrl={baseUrl}
              products={products}
            />
          </article>

          {/* Tablet and phone: the author card after the post, where it's
              drawn. display: none at the other size takes the copy not in
              use out of the tab order. Same tracking scope as the sidebar's,
              so a click counts the same at any size; no root id, which the
              sidebar already has. */}
          <TrackingScope id={`${pageKey}__post-aside`}>
            <AuthorCard
              author={author}
              baseUrl={baseUrl}
              className={styles.authorEnd}
            />
          </TrackingScope>
        </div>
      </section>
    </PhotoViewerProvider>
  );
}

/**
 * "On this page" and the author card. One sticky column on desktop; below
 * that, the wrappers drop out of the layout (display: contents) so "On this
 * page" sits above the article, and this author card hides in favour of the
 * one after it.
 *
 * @param {{
 *   toc: Array<{key: string | number, id: string, label: string}>,
 *   author?: Parameters<typeof AuthorCard>[0]['author'],
 *   baseUrl?: string,
 * }} props
 */
function PostAside({toc, author, baseUrl}) {
  const trackingRoot = useTrackingRoot();

  return (
    <div {...trackingRoot} className={styles.aside}>
      <div className={styles.sticky}>
        {toc.length > 0 ? (
          <nav className={styles.toc} aria-labelledby="post-toc-label">
            <p id="post-toc-label" className={styles.tocLabel}>
              On this page
            </p>
            <ol className={styles.tocList}>
              {toc.map((item, i) => (
                <li key={item.key}>
                  {/* Through CmsLink, as every same-page jump on the site:
                   * it keeps the query string, and useHashScroll lands it
                   * under the header and moves focus to the heading. */}
                  <CmsLink
                    link={{linkText: item.label, linkUrl: `#${item.id}`}}
                    className={styles.tocLink}
                    trackRole={`toc-${i + 1}`}
                  />
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <AuthorCard
          author={author}
          baseUrl={baseUrl}
          className={styles.author}
        />
      </div>
    </div>
  );
}

/** <p></p>, <p>&nbsp;</p>, <p><br></p> — a blank line, not a paragraph. */
const EMPTY_PARAGRAPH = /<p\b[^>]*>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi;

/** <h1 ...> and </h1>, but not <h10>-style lookalikes. */
const H1_OPEN = /<h1(\s[^>]*)?>/gi;
const H1_CLOSE = /<\/h1>/gi;

/**
 * Tidies the post's WYSIWYG modules for the template: empty paragraphs go,
 * and any Heading 1 becomes a Heading 2 — the hero holds the post's one h1.
 * The editor's menu no longer offers Heading 1, but one can still arrive in
 * pasted Word or Google Docs text, or through Source mode.
 * Other modules pass through untouched.
 *
 * @param {Array<{__component: string, wysiwyg?: string} & Record<string, any>>} modules
 * @returns {typeof modules}
 */
export function prepareBlogBody(modules) {
  return modules.map((module) =>
    module.__component === 'module.wysiwyg' && module.wysiwyg
      ? {
          ...module,
          wysiwyg: module.wysiwyg
            .replace(EMPTY_PARAGRAPH, '')
            .replace(H1_OPEN, '<h2$1>')
            .replace(H1_CLOSE, '</h2>'),
        }
      : module,
  );
}

/**
 * The editor's Jump Links as "On this page" entries, in their order — each
 * pointed at the module whose Tracking ID it names, and dropped when no module
 * on the post has it (or it has no label).
 *
 * @param {Array<{label?: string, moduleTrackingId?: string}> | null | undefined} jumpLinks
 * @param {Array<{__component: string, trackingId?: string}>} blocks - as BlockManager gets them
 * @param {string} pageKey
 * @returns {Array<{key: string | number, id: string, label: string}>}
 */
export function resolveJumpLinks(jumpLinks, blocks, pageKey) {
  const anchors = new Set(
    moduleTrackingIds(blocks, pageKey).map(({anchor}) => anchor),
  );
  return (jumpLinks ?? [])
    .map((link, i) => ({
      key: link?.id ?? i,
      id: slugify(link?.moduleTrackingId),
      label: link?.label?.trim() ?? '',
    }))
    .filter(({id, label}) => id && label && anchors.has(id));
}
