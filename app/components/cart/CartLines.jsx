import {useEffect, useId, useRef, useState} from 'react';
import {Link, useFetcher, useFetchers} from 'react-router';
import {CartForm, Image, Money} from '@shopify/hydrogen';
import QuantityStepper from '~/components/QuantityStepper';
import UiIcon from '~/components/icons/UiIcon';
import {cartActivity} from '~/lib/cart-activity';
import {isPendingLine} from '~/lib/cart-lines';
import {
  cartFormData,
  getLineItemChildrenMap,
  groupBundles,
  rootLines,
  visibleAttributes,
  visibleOptions,
} from '~/lib/cart';
import {sharpImageProps} from '~/lib/image';
import {CONTACT_PATH} from '~/lib/search';
import {useVariantUrl} from '~/lib/variants';
import styles from './CartLines.module.css';

/**
 * The cart's line items, for the drawer and the /cart page.
 *
 * Loose lines first, then each bundle the bundle builder added as a group
 * with its own "Remove bundle". Lines a merchant has attached to another
 * (warranties, gift wrap) render nested under their parent.
 *
 * Two things happen here rather than in a line: where focus goes after a
 * Remove (the next line's Remove, or the empty state's heading), and the
 * brief highlight on a line that has just been added in the drawer.
 *
 * @param {{
 *   cart: object,
 *   layout: 'drawer' | 'page',
 *   onNavigate?: () => void,
 * }} props
 */
export function CartLines({cart, layout, onNavigate}) {
  const lines = rootLines(cart);
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);
  const {loose, bundles} = groupBundles(lines);
  const listId = useId();

  const removeRefs = useRef(new Map());
  const focusAfterRemove = useRef(null);
  const [status, setStatus] = useState('');

  /*
   * Focus after a Remove. The button that had focus is about to unmount;
   * once the line is gone, focus the Remove at the same position (or the last
   * one), else — the cart is empty now — the empty state's heading.
   */
  const ids = lines.map((l) => l.id).join('|');
  useEffect(() => {
    const target = focusAfterRemove.current;
    if (!target) return;
    if (lines.some((l) => l.id === target.id)) return; // still there
    focusAfterRemove.current = null;
    // The last line: this list unmounts and CartEmpty takes focus instead.
    const next = lines[Math.min(target.index, lines.length - 1)];
    const button = next ? removeRefs.current.get(next.id) : null;
    button?.focus();
    // `ids` is the dependency that matters: it changes when a line leaves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const addedId = useAddedLine(lines, layout === 'drawer');

  const lineProps = {
    layout,
    childrenMap,
    onNavigate,
    registerRemove: (id, el) => {
      if (el) removeRefs.current.set(id, el);
      else removeRefs.current.delete(id);
    },
    onRemove: (line) => {
      focusAfterRemove.current = {id: line.id, index: lines.findIndex((l) => l.id === line.id)};
      setStatus(`Removed ${line.merchandise?.product?.title ?? 'item'}`);
    },
  };

  return (
    <div className={styles.lines} data-layout={layout}>
      <p id={listId} className="sr-only">
        Items in your cart
      </p>
      <ul className={styles.list} aria-labelledby={listId}>
        {loose.map((line) => (
          <CartLineItem key={line.id} line={line} added={line.id === addedId} {...lineProps} />
        ))}
        {bundles.map((bundle) => (
          <BundleGroup key={bundle.label} bundle={bundle} lineProps={lineProps} addedId={addedId} />
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

/**
 * The id of a line that appeared in the last moment, for ~1.2s — the drawer
 * flashes it so the visitor sees what their click did. Drawer only, and not
 * on the first render, which would flash every line.
 */
function useAddedLine(lines, enabled) {
  const prevIds = useRef(null);
  const [addedId, setAddedId] = useState(null);
  const ids = lines.map((l) => l.id).join('|');

  useEffect(() => {
    if (!enabled) return undefined;
    const current = lines.map((l) => l.id);
    const previous = prevIds.current;
    prevIds.current = current;
    if (!previous) return undefined;
    const fresh = current.find((id) => !previous.includes(id));
    if (!fresh) return undefined;
    setAddedId(fresh);
    const el = document.querySelector(`[data-line-id="${CSS.escape(fresh)}"]`);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({block: 'nearest', behavior: reduced ? 'auto' : 'smooth'});
    const timer = setTimeout(() => setAddedId(null), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, enabled]);

  return addedId;
}

/**
 * A bundle from the bundle builder: its lines, under a header that names it
 * and can remove the whole set.
 */
function BundleGroup({bundle, lineProps, addedId}) {
  const headingId = useId();
  const removable = bundle.lines.filter((l) => !isPendingLine(l)).map((l) => l.id);

  return (
    <li className={styles.bundle} aria-labelledby={headingId}>
      <div className={styles.bundleHead}>
        <p className={styles.bundleTitle} id={headingId}>
          <span className={styles.bundleEyebrow}>Bundle</span>
          {bundle.label}
        </p>
        <CartForm
          route="/cart"
          action={CartForm.ACTIONS.LinesRemove}
          inputs={{lineIds: removable}}
          fetcherKey={`cart-bundle-remove-${bundle.label}`}
        >
          {(fetcher) => (
            <button
              type="submit"
              className={styles.textButton}
              disabled={removable.length === 0 || fetcher.state !== 'idle'}
              // Starts with the visible words, so "Remove bundle" spoken
              // aloud activates it (WCAG 2.5.3).
              aria-label={`Remove bundle: ${bundle.label}`}
            >
              <UiIcon name="trash" />
              Remove bundle
            </button>
          )}
        </CartForm>
      </div>
      <ul className={styles.bundleList}>
        {bundle.lines.map((line) => (
          <CartLineItem key={line.id} line={line} added={line.id === addedId} {...lineProps} />
        ))}
      </ul>
    </li>
  );
}

/**
 * One line: image, title, options, price, quantity, remove.
 *
 * @param {{
 *   line: object,
 *   layout: 'drawer' | 'page',
 *   childrenMap: Record<string, Array<object>>,
 *   nested?: boolean,
 *   added?: boolean,
 *   onNavigate?: () => void,
 *   registerRemove: (id: string, el: HTMLButtonElement | null) => void,
 *   onRemove: (line: object) => void,
 * }} props
 */
function CartLineItem({
  line,
  layout,
  childrenMap,
  nested = false,
  added = false,
  onNavigate,
  registerRemove,
  onRemove,
}) {
  const {id, quantity, merchandise} = line;
  const product = merchandise?.product;
  const title = product?.title ?? merchandise?.title ?? 'Item';
  const image = merchandise?.image;
  const url = useVariantUrl(product?.handle ?? '', merchandise?.selectedOptions ?? []);
  const fetcher = useFetcher({key: `cart-line-${id}`});

  const pending = fetcher.state !== 'idle' || Boolean(line.isOptimistic);
  const placeholder = isPendingLine(line);
  const unavailable = merchandise?.availableForSale === false;
  const options = visibleOptions(merchandise?.selectedOptions);
  const attributes = visibleAttributes(line.attributes);
  const children = childrenMap[id];
  const childrenId = useId();

  // A pending line has no cost yet: price × quantity stands in.
  const unit = line.cost?.amountPerQuantity ?? merchandise?.price ?? null;
  const total =
    line.cost?.totalAmount ??
    (unit ? {amount: (Number(unit.amount) * quantity).toFixed(2), currencyCode: unit.currencyCode} : null);
  const compareAt = line.cost?.compareAtAmountPerQuantity ?? merchandise?.compareAtPrice ?? null;
  const onSale = unit && compareAt && Number(compareAt.amount) > Number(unit.amount);
  // Only this line's problems (stock caps). A mutation also returns the
  // cart's standing warnings — an unrecognised discount code, say — and the
  // discount form is where those belong.
  const lineWarnings =
    fetcher.state === 'idle'
      ? (fetcher.data?.warnings ?? []).filter((w) => !String(w.code).startsWith('DISCOUNT'))
      : [];
  const lineErrors = fetcher.state === 'idle' ? (fetcher.data?.errors ?? []) : [];

  /*
   * Counted in at the moment of the submit, so Check out can hold for it
   * (lib/cart-activity.js); counted out once the fetcher has been seen busy
   * and gone idle again. The safety timer covers a submit the router never
   * picked up.
   */
  const activityRef = useRef(null);
  const submit = (action, inputs) => {
    activityRef.current?.end();
    const end = cartActivity.begin();
    activityRef.current = {end, seenBusy: false, timer: setTimeout(end, 8000)};
    fetcher.submit(cartFormData(action, inputs), {method: 'post', action: '/cart'});
  };
  useEffect(() => {
    const activity = activityRef.current;
    if (!activity) return;
    if (fetcher.state !== 'idle') {
      activity.seenBusy = true;
    } else if (activity.seenBusy) {
      clearTimeout(activity.timer);
      activity.end();
      activityRef.current = null;
    }
  }, [fetcher.state]);
  useEffect(
    () => () => {
      clearTimeout(activityRef.current?.timer);
      activityRef.current?.end();
    },
    [],
  );

  return (
    <li
      className={styles.line}
      data-line-id={id}
      data-nested={nested ? '' : undefined}
      data-pending={pending ? '' : undefined}
      data-unavailable={unavailable ? '' : undefined}
      data-added={added ? '' : undefined}
      aria-busy={pending || undefined}
    >
      <div className={styles.media}>
        {image ? (
          <Image
            data={image}
            /* A style, not the aspectRatio prop — the prop makes the CDN
               crop, and a product shot must keep its edges. */
            style={{aspectRatio: '1 / 1'}}
            sizes="96px"
            alt={image.altText || title}
            className={styles.image}
            loading="lazy"
            {...sharpImageProps(image)}
          />
        ) : null}
      </div>

      <div className={styles.copy}>
        {product?.handle ? (
          <Link to={url} prefetch="intent" className={styles.title} onClick={onNavigate}>
            {title}
          </Link>
        ) : (
          <span className={styles.title}>{title}</span>
        )}
        {options.length || merchandise?.sku ? (
          <p className={styles.meta}>
            {options.map((o) => `${o.name}: ${o.value}`).join(' · ')}
            {options.length && merchandise?.sku ? ' · ' : ''}
            {merchandise?.sku ? `SKU ${merchandise.sku}` : ''}
          </p>
        ) : null}
        {attributes.length ? (
          <p className={styles.tags}>
            {attributes.map((a) => (
              <span key={a.key} className={styles.tag}>
                {a.key}: {a.value}
              </span>
            ))}
          </p>
        ) : null}
        {unavailable ? (
          <p className={styles.notice}>
            <UiIcon name="alert" />
            <span>
              Not available to order online. Remove it, or{' '}
              <Link to={CONTACT_PATH} className={styles.noticeLink} onClick={onNavigate}>
                contact us
              </Link>{' '}
              to order.
            </span>
          </p>
        ) : null}
      </div>

      <div className={styles.price}>
        {total ? <Money data={total} as="span" className={styles.total} /> : null}
        {unit && (quantity > 1 || onSale) ? (
          <span className={styles.each}>
            {onSale ? (
              <s className={styles.compareAt}>
                <Money data={compareAt} as="span" />
              </s>
            ) : null}
            <Money data={unit} as="span" /> each
          </span>
        ) : null}
      </div>

      <div className={styles.controls}>
        <LineQuantity
          line={line}
          title={title}
          disabled={placeholder || unavailable}
          onCommit={(q) => submit(CartForm.ACTIONS.LinesUpdate, {lines: [{id, quantity: q}]})}
        />
        <button
          type="button"
          className={styles.textButton}
          disabled={placeholder}
          aria-label={`Remove ${title} from cart`}
          ref={(el) => registerRemove(id, el)}
          onClick={() => {
            onRemove(line);
            submit(CartForm.ACTIONS.LinesRemove, {lineIds: [id]});
          }}
        >
          <UiIcon name="trash" />
          Remove
        </button>
      </div>

      {lineErrors.length || lineWarnings.length ? (
        <p className={styles.lineAlert} role={lineErrors.length ? 'alert' : 'status'}>
          {[...lineErrors, ...lineWarnings].map((m) => m.message).filter(Boolean).join(' ')}
        </p>
      ) : null}

      {children?.length ? (
        <div className={styles.children}>
          <p id={childrenId} className="sr-only">
            Included with {title}
          </p>
          <ul className={styles.childList} aria-labelledby={childrenId}>
            {children.map((child) => (
              <CartLineItem
                key={child.id}
                line={child}
                layout={layout}
                childrenMap={childrenMap}
                nested
                onNavigate={onNavigate}
                registerRemove={registerRemove}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * The stepper, holding a typed draft so a value in progress never snaps
 * back while a request is in flight; it resyncs from the line once the
 * request settles and the field isn't being edited. Nothing is sent for a
 * value that equals what the line already has.
 */
function LineQuantity({line, title, disabled, onCommit}) {
  const [draft, setDraft] = useState(line.quantity);
  const lastSent = useRef(line.quantity);
  const fetcher = useFetcher({key: `cart-line-${line.id}`});

  useEffect(() => {
    if (fetcher.state !== 'idle') return;
    // Not while the visitor is typing in this line's field.
    const active = document.activeElement;
    if (
      active?.tagName === 'INPUT' &&
      active.closest(`[data-line-id="${CSS.escape(line.id)}"]`)
    ) {
      return;
    }
    setDraft(line.quantity);
    lastSent.current = line.quantity;
  }, [line.quantity, line.id, fetcher.state]);

  return (
    <QuantityStepper
      size="compact"
      value={draft}
      label={`Quantity of ${title}`}
      disabled={disabled}
      onChange={setDraft}
      onCommit={(q) => {
        if (q === lastSent.current) return;
        lastSent.current = q;
        onCommit(q);
      }}
    />
  );
}

/* ---- skeleton and notices ---- */

/** Placeholder lines while the cart is still loading. */
export function CartLinesSkeleton({rows = 2}) {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <p className="sr-only">Loading your cart</p>
      {Array.from({length: rows}, (_, i) => (
        <div key={i} className={styles.skeletonLine} aria-hidden="true">
          <span className={styles.skeletonMedia} />
          <span className={styles.skeletonText}>
            <span className={styles.skeletonBar} style={{width: '70%'}} />
            <span className={styles.skeletonBar} style={{width: '45%'}} />
            <span className={styles.skeletonBar} style={{width: '30%'}} />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Problems from adds made elsewhere on the page — the product page's Add to
 * cart, a featured product — which have no room of their own to say so. The
 * bundle builder shows its own.
 */
export function CartNotices() {
  const fetchers = useFetchers();
  const [dismissed, setDismissed] = useState(() => new Set());
  const problems = fetchers
    .filter(
      (f) =>
        f.state === 'idle' &&
        typeof f.key === 'string' &&
        f.key.startsWith('cart-add-') &&
        !dismissed.has(f.key) &&
        (f.data?.errors?.length || f.data?.warnings?.length),
    )
    .flatMap((f) =>
      [...(f.data.errors ?? []), ...(f.data.warnings ?? [])].map((m) => ({
        key: f.key,
        message: m.message,
        error: (f.data.errors ?? []).includes(m),
      })),
    );

  if (problems.length === 0) return null;
  const hasError = problems.some((p) => p.error);

  return (
    <div className={styles.notices} role={hasError ? 'alert' : 'status'}>
      <UiIcon name="alert" />
      <p className={styles.noticesText}>
        {hasError ? 'Something couldn’t be added: ' : ''}
        {problems.map((p) => p.message).filter(Boolean).join(' ')}
      </p>
      <button
        type="button"
        className={styles.noticesClose}
        aria-label="Dismiss"
        onClick={() => setDismissed((s) => new Set([...s, ...problems.map((p) => p.key)]))}
      >
        <UiIcon name="close" />
      </button>
    </div>
  );
}
