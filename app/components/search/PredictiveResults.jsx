import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import SearchChips from '~/components/search/SearchChips';
import {
  SEARCH_PATH,
  CONTACT_PATH,
  splitSuggestion,
  urlWithTrackingParams,
} from '~/lib/search';
import {useProductPath} from '~/lib/product-urls';
import styles from './PredictiveResults.module.css';

/**
 * The type-ahead results, shared by the header's quick-search panel and the
 * inline dropdown under the /search and shop-hero search boxes
 * (~/components/search/SearchBox). Each container supplies its own chrome;
 * everything inside it lives here, so the two can never drift apart.
 *
 * Every navigable result carries `data-qs-item`, which is what
 * `moveThroughResults` walks with the arrow keys.
 */

/**
 * Products previewed while typing, in every container — the header modal and
 * the page-box dropdown alike. "View all N results" reaches the rest. Four
 * keeps either box short enough to sit over the page without scrolling.
 */
export const PRODUCT_PREVIEW_COUNT = 4;

/**
 * Arrow-key navigation through the results, in reading order, and back up
 * into the box. Links rather than an aria-activedescendant listbox because
 * the results are mixed — suggestions, products, pages — and a real focus
 * move is what every screen reader handles without special casing.
 *
 * @param {KeyboardEvent | React.KeyboardEvent} event
 * @param {HTMLElement | null} container - element holding the results
 * @param {HTMLElement | null} input - the search field
 * @returns {boolean} true when the key was handled
 */
export function moveThroughResults(event, container, input) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return false;

  const items = Array.from(container?.querySelectorAll('[data-qs-item]') ?? []);
  if (items.length === 0) return false;

  const index = items.indexOf(document.activeElement);
  event.preventDefault();

  if (event.key === 'ArrowDown') {
    items[Math.min(index + 1, items.length - 1)].focus();
  } else if (index <= 0) {
    input?.focus();
  } else {
    items[index - 1].focus();
  }
  return true;
}

/**
 * A one-line status in the results area — "Searching…", an outage notice.
 *
 * @param {{children: React.ReactNode}} props
 */
export function PredictiveMessage({children}) {
  return <p className={styles.message}>{children}</p>;
}

/**
 * Result counts for screen readers, which otherwise hear nothing as the
 * results under the box update.
 *
 * The term is part of the message on purpose. A live region only speaks when
 * its text CHANGES, and with products capped and suggestions limited, most
 * queries produced the identical "4 products, 5 suggestions" — refining a
 * search announced nothing at all. Pages and categories are counted too, so a
 * search that only finds a page is not read out as "0 products".
 *
 * Keep it mounted for the life of the box (not inside a conditionally
 * rendered dropdown): a region inserted already holding text is not read.
 *
 * @param {{data?: object, maxProducts?: number}} props - pass the same
 *   `maxProducts` the results were given, so the count matches what is shown
 */
export function ResultsAnnouncer({data, maxProducts = PRODUCT_PREVIEW_COUNT}) {
  let message = '';

  if (data?.error) {
    message = 'Suggestions are unavailable. Press Enter to search.';
  } else if (data) {
    const products = Math.min(data.products?.length ?? 0, maxProducts);
    const suggestions = data.queries?.length ?? 0;
    const links =
      (data.collections?.length ?? 0) +
      (data.pages?.length ?? 0) +
      (data.articles?.length ?? 0);
    const parts = [
      [products, 'product', 'products'],
      [suggestions, 'suggestion', 'suggestions'],
      [links, 'page or category', 'pages and categories'],
    ]
      .filter(([n]) => n > 0)
      .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);

    message = parts.length
      ? `${parts.join(', ')} for “${data.term}”`
      : `No results for “${data.term}”`;
  }

  return (
    <p className="sr-only" aria-live="polite">
      {message}
    </p>
  );
}

/**
 * Before anything is typed.
 *
 * @param {{
 *   categories: Array<{id: string, handle: string, title: string}>,
 *   onNavigate: () => void,
 * }} props
 */
export function PredictiveEmptyState({categories, onNavigate}) {
  if (categories.length === 0) {
    return (
      <p className={styles.message}>
        Search by product name, category, or part number.
      </p>
    );
  }

  return (
    <div className={styles.emptyGrid}>
      <Group title="Shop by category">
        <SearchChips
          label="Categories"
          items={categories.map((c) => ({
            key: c.id,
            label: c.title,
            to: `/collections/${c.handle}`,
          }))}
          onNavigate={onNavigate}
        />
      </Group>
    </div>
  );
}

/**
 * While typing — suggestions, products, categories, pages and articles, or a
 * no-results message that points to the contact page.
 *
 * Lays itself out from its OWN width (container queries in the stylesheet),
 * not the viewport's, because it renders in containers of very different
 * sizes: the full-width header panel and a dropdown under a 560px search box.
 *
 * @param {{
 *   data: object,
 *   term: string,
 *   onNavigate: () => void,
 *   onViewAll: () => void,
 *   maxProducts?: number,
 * }} props
 */
export function PredictiveResults(props) {
  // The size container the layout queries — see .root in the stylesheet.
  return (
    <div className={styles.root}>
      <ResultsBody {...props} />
    </div>
  );
}

/** @param {Parameters<typeof PredictiveResults>[0]} props */
function ResultsBody({
  data,
  term,
  onNavigate,
  onViewAll,
  maxProducts = PRODUCT_PREVIEW_COUNT,
}) {
  const {
    queries = [],
    collections = [],
    pages = [],
    articles = [],
    total = 0,
  } = data;
  const products = (data.products ?? []).slice(0, maxProducts);

  const hasLinks = collections.length + pages.length + articles.length > 0;
  const nothing = queries.length === 0 && products.length === 0 && !hasLinks;

  if (nothing) {
    return (
      <div className={styles.none}>
        <p className={styles.noneTitle}>
          No results for <span className={styles.noneTerm}>“{data.term}”</span>
        </p>
        <p className={styles.message}>
          Check the spelling, try fewer words, or search by part number.
        </p>
        <p className={styles.message}>
          Can’t find what you need?{' '}
          <Link
            to={CONTACT_PATH}
            className={styles.helpLink}
            onClick={onNavigate}
            data-qs-item
          >
            Contact us
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.results}>
      {queries.length > 0 ? (
        <div className={styles.areaSuggest}>
          <Group title="Suggestions">
            <ul className={styles.rows} role="list">
              {queries.map((q) => (
                <li key={q.text}>
                  <Link
                    to={urlWithTrackingParams({
                      baseUrl: SEARCH_PATH,
                      trackingParams: q.trackingParameters,
                      term: q.text,
                    })}
                    className={styles.row}
                    onClick={onNavigate}
                    data-qs-item
                  >
                    <RowIcon kind="search" />
                    <span className={styles.rowText}>
                      {splitSuggestion(q.text, term).map((part) =>
                        part.typed ? (
                          <span key={part.key} className={styles.typed}>
                            {part.text}
                          </span>
                        ) : (
                          <strong key={part.key} className={styles.predicted}>
                            {part.text}
                          </strong>
                        ),
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Group>
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className={styles.areaProducts}>
          <Group title="Products">
            <ul className={styles.products} role="list">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductRow
                    product={product}
                    term={term}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </Group>

          {total > 0 ? (
            <button
              type="button"
              className={`btn btn--secondary ${styles.viewAll}`}
              onClick={onViewAll}
              data-qs-item
            >
              View all {total} {total === 1 ? 'result' : 'results'}
            </button>
          ) : null}
        </div>
      ) : null}

      {hasLinks ? (
        <div className={styles.areaLinks}>
          {collections.length > 0 ? (
            <Group title="Categories">
              <LinkRows
                items={collections.map((c) => ({
                  key: c.id,
                  label: c.title,
                  to: urlWithTrackingParams({
                    baseUrl: `/collections/${c.handle}`,
                    trackingParams: c.trackingParameters,
                    term,
                  }),
                }))}
                onNavigate={onNavigate}
              />
            </Group>
          ) : null}

          {pages.length > 0 ? (
            <Group title="Pages">
              <LinkRows
                items={pages.map((p) => ({key: p.id, label: p.title, to: p.url}))}
                onNavigate={onNavigate}
              />
            </Group>
          ) : null}

          {articles.length > 0 ? (
            <Group title="Articles">
              <LinkRows
                items={articles.map((a) => ({
                  key: a.id,
                  label: a.title,
                  to: a.url,
                }))}
                onNavigate={onNavigate}
              />
            </Group>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{product: object, term: string, onNavigate: () => void}} props
 */
function ProductRow({product, term, onNavigate}) {
  const pathFor = useProductPath();
  const image = product.featuredImage;
  const price = product.priceRange?.minVariantPrice;
  const max = product.priceRange?.maxVariantPrice;
  const hasRange = Boolean(price && max && price.amount !== max.amount);

  return (
    <Link
      to={urlWithTrackingParams({
        baseUrl: pathFor(product.handle),
        trackingParams: product.trackingParameters,
        term,
      })}
      prefetch="intent"
      className={styles.product}
      onClick={onNavigate}
      data-qs-item
    >
      <span className={styles.productMedia}>
        {image ? (
          <Image
            data={image}
            aspectRatio="1/1"
            sizes="72px"
            width={72}
            /* Eager: six 72px thumbnails, all on screen the moment results
               arrive. Lazy loading made each one pop in a beat after its row. */
            loading="eager"
            className={styles.productImage}
            alt=""
          />
        ) : null}
      </span>
      <span className={styles.productText}>
        <span className={styles.productTitle}>{product.title}</span>
        {price ? (
          <span className={styles.productPrice}>
            {hasRange ? <span className={styles.from}>From </span> : null}
            <Money data={price} withoutTrailingZeros as="span" />
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * @param {{
 *   items: Array<{key: string, label: string, to: string}>,
 *   onNavigate: () => void,
 * }} props
 */
function LinkRows({items, onNavigate}) {
  return (
    <ul className={styles.rows} role="list">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            to={item.to}
            prefetch="intent"
            className={styles.row}
            onClick={onNavigate}
            data-qs-item
          >
            <span className={styles.rowText}>{item.label}</span>
            <RowIcon kind="arrow" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{title: string, children: React.ReactNode}} props
 */
export function Group({title, children}) {
  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <h2 className={styles.groupTitle}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** @param {{kind: 'search' | 'arrow'}} props */
function RowIcon({kind}) {
  return (
    <svg
      className={`${styles.rowIcon} ${kind === 'arrow' ? styles.rowArrow : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'search' ? (
        <>
          <circle cx="7" cy="7" r="4.75" />
          <path d="M10.5 10.5 14 14" />
        </>
      ) : (
        <path d="M3 8h10M9 4l4 4-4 4" />
      )}
    </svg>
  );
}
