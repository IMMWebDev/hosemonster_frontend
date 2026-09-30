import {useEffect, useId, useRef} from 'react';
import {Link, useFetcher, useRouteLoaderData} from 'react-router';
import CmsLink from '~/components/cms/CmsLink';
import SearchChips from '~/components/search/SearchChips';
import UiIcon from '~/components/icons/UiIcon';
import {CONTACT_PATH, SEARCH_PATH} from '~/lib/search';
import styles from './CartEmpty.module.css';

/**
 * Nothing in the cart yet: somewhere to go. In the drawer it's a short
 * block under the head; on the page it's the whole page, centred, with the
 * categories (fetched the way the search sheet's empty state does) — and
 * its heading is the page's, so there's one heading, not two.
 *
 * The wording and the two buttons come from Options → Empty Cart in Strapi;
 * anything left empty there falls back to the defaults below.
 *
 * `focusHeading` is for the moment the last line is removed: the list (and the
 * Remove that had focus) is gone, so the heading takes it.
 *
 * @param {{variant: 'drawer' | 'page', onNavigate?: () => void, focusHeading?: boolean}} props
 */
export default function CartEmpty({variant, onNavigate, focusHeading = false}) {
  const browse = useFetcher({key: 'quick-search-browse'});
  const browseId = useId();
  const headingRef = useRef(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  useEffect(() => {
    if (!browse.data && browse.state === 'idle') {
      void browse.load(`${SEARCH_PATH}?predictive=1&q=`);
    }
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = browse.data?.browseCollections ?? [];
  const Heading = variant === 'page' ? 'h1' : 'h2';
  const cms = useRouteLoaderData('root')?.cmsOptions?.emptyCart ?? {};
  const heading = cms.heading?.trim() || DEFAULTS.heading;
  const body = cms.body?.trim() || DEFAULTS.body;

  return (
    <div className={styles.empty} data-variant={variant}>
      {variant === 'page' ? (
        <UiIcon name="cart" size={48} className={styles.icon} />
      ) : null}
      {/* Where focus lands after the last line is removed. */}
      <Heading className={styles.heading} tabIndex={-1} ref={headingRef}>
        {heading}
      </Heading>
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>
        {cms.primaryCTA?.linkText ? (
          <CmsLink link={cms.primaryCTA} className="btn btn--primary" onClick={onNavigate} />
        ) : (
          <Link to="/shop" className="btn btn--primary" onClick={onNavigate}>
            {DEFAULTS.primary}
          </Link>
        )}
        {cms.secondaryCTA?.linkText ? (
          <CmsLink link={cms.secondaryCTA} className="btn btn--tertiary" onClick={onNavigate} />
        ) : (
          <Link to={CONTACT_PATH} className="btn btn--tertiary" onClick={onNavigate}>
            {DEFAULTS.secondary}
          </Link>
        )}
      </div>
      {/* The page has room for chips; the drawer's column gets a list, one
          collection per row, which also fills what was empty space. */}
      {variant === 'page' && categories.length ? (
        <div className={styles.categories}>
          <p className={styles.categoriesTitle}>Shop by category</p>
          <SearchChips
            label="Categories"
            items={categories.map((c) => ({
              key: c.id,
              label: c.title,
              to: `/collections/${c.handle}`,
            }))}
            onNavigate={onNavigate}
          />
        </div>
      ) : null}
      {variant === 'drawer' && categories.length ? (
        <nav className={styles.browse} aria-labelledby={browseId}>
          <p className={styles.browseTitle} id={browseId}>
            Shop by category
          </p>
          <ul className={styles.browseList} role="list">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/collections/${c.handle}`} className={styles.browseLink} onClick={onNavigate}>
                  {c.title}
                  <UiIcon name="chevron" className={styles.browseIcon} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

/** What shows until Options → Empty Cart is filled in. */
const DEFAULTS = {
  heading: 'Your cart is empty',
  body:
    'Flow test kits, gauges, hose and the parts that go with them — start with the shop, or ask us what you need.',
  primary: 'Shop equipment',
  secondary: 'Contact our team',
};
