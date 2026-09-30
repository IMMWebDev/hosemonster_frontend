import {useEffect, useId, useState} from 'react';
import {Link, useFetcher, useRouteLoaderData} from 'react-router';
import {CartForm, Money} from '@shopify/hydrogen';
import PhoneLink from '~/components/PhoneLink';
import UiIcon from '~/components/icons/UiIcon';
import {hasUnavailableLine, savedAmount} from '~/lib/cart';
import {cartActivity, useCartBusy} from '~/lib/cart-activity';
import {CONTACT_PATH} from '~/lib/search';
import styles from './CartSummary.module.css';

/*
 * The cart's summary: the totals (with Check out) and the order note, as two
 * exports so the drawer can pin the totals to its foot and keep the note in
 * its scrolling body. No discount or gift-card fields — the client's store
 * doesn't offer them; Shopify's checkout has its own if that changes.
 */

/**
 * Totals and the way out: subtotal, what discounts and gift cards took off,
 * the estimated total, Check out, and the help line. Plus the order note.
 *
 * `checkoutUrl` must come from the loader's cart (it does — the optimistic
 * cart is built from it): a mutation's result carries the URL without the
 * `logged_in` flag a signed-in customer needs.
 *
 * @param {{
 *   cart: object,
 *   layout: 'drawer' | 'page',
 *   onContinue?: () => void,
 * }} props
 */
export function CartTotals({cart, layout, onContinue}) {
  const headingId = useId();
  const phone = useRouteLoaderData('root')?.cmsFooter?.phone ?? null;
  const subtotal = cart?.cost?.subtotalAmount;
  const total = cart?.cost?.totalAmount;
  // Automatic discounts still land here; there's no code entry.
  const saved = savedAmount(cart);
  const unavailable = hasUnavailableLine(cart);
  const mutating = useCartBusy();
  const busy = Boolean(cart?.isOptimistic) || mutating;

  /*
   * Check out waits for a cart update in flight. A typed quantity is sent
   * when its field loses focus, and on a phone the tap that does that is
   * often the tap on Check out itself — so the checkout would load with the
   * old quantity. Held here until the cart is quiet, then on its way. The
   * click reads the activity count directly: the submit from that same tap's
   * blur may not have rendered yet.
   */
  const [checkoutWanted, setCheckoutWanted] = useState(false);
  useEffect(() => {
    if (!checkoutWanted || busy || !cart?.checkoutUrl) return;
    window.location.assign(cart.checkoutUrl);
  }, [checkoutWanted, busy, cart?.checkoutUrl]);

  return (
    <div
      className={styles.totals}
      role="group"
      aria-labelledby={headingId}
      data-layout={layout}
    >
      <h2 className="sr-only" id={headingId}>
        Totals
      </h2>

      {/* Receipt shape, as on the current site: what's still to come has
          its own line between the subtotal and the total, rather than a
          footnote under it. */}
      <div className={styles.rows} aria-busy={busy || undefined}>
        <dl className={styles.group}>
          <div className={styles.row}>
            <dt>Subtotal</dt>
            <dd>{subtotal ? <Money data={subtotal} as="span" /> : '—'}</dd>
          </div>
          {saved ? (
            <div className={styles.row}>
              <dt>Discounts</dt>
              <dd>
                −<Money data={saved} as="span" />
              </dd>
            </div>
          ) : null}
        </dl>
        <p className={styles.fine}>Shipping &amp; taxes calculated at checkout</p>
        <dl className={styles.group}>
          <div className={`${styles.row} ${styles.rowTotal}`}>
            <dt>Estimated total</dt>
            <dd>{total ? <Money data={total} as="span" /> : '—'}</dd>
          </div>
        </dl>
      </div>

      {unavailable ? (
        <p className={styles.alert} role="status">
          <UiIcon name="alert" />
          <span>Something in your cart isn’t available to order online.</span>
        </p>
      ) : null}

      <div className={styles.actions}>
        {cart?.checkoutUrl ? (
          <a
            href={cart.checkoutUrl}
            target="_self"
            className={`btn btn--primary ${styles.checkout}`}
            aria-busy={checkoutWanted || undefined}
            data-waiting={checkoutWanted || undefined}
            onClick={(event) => {
              if (!busy && cartActivity.get() === 0) return;
              event.preventDefault();
              setCheckoutWanted(true);
            }}
          >
            <UiIcon name="lock" />
            {checkoutWanted ? 'Updating cart…' : 'Check out'}
          </a>
        ) : null}
        {/* Close is how you keep shopping; the page is the other way out. */}
        {layout === 'drawer' ? (
          <div className={styles.textActions}>
            <Link to="/cart" className={styles.textLink} onClick={onContinue}>
              View cart
            </Link>
          </div>
        ) : null}
      </div>

      <p className={styles.help}>
        Questions?{' '}
        {phone ? (
          <>
            Call <PhoneLink phone={phone} className={styles.link} /> or{' '}
          </>
        ) : null}
        <Link to={CONTACT_PATH} className={styles.link} onClick={onContinue}>
          talk to our team
        </Link>
        .
      </p>
    </div>
  );
}

/* ---- order note ---- */

/**
 * A note for the order — a PO number, a delivery instruction — saved to the
 * Shopify cart so it reaches the order. Under the lines on the page, and in
 * the drawer's scrolling body, so the pinned foot stays short on a phone.
 *
 * @param {{cart: object}} props
 */
export function CartNote({cart}) {
  const textareaId = useId();
  const panelId = useId();
  const fetcher = useFetcher({key: 'cart-note'});
  const [savedAt, setSavedAt] = useState(0);
  const note = cart?.note ?? '';
  // Open from the start when there's already a note to see. A disclosure
  // button and a panel rather than <details>, which can't animate: the panel
  // eases open and shut (CSS grid rows, see .notePanel).
  const [open, setOpen] = useState(Boolean(note));

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data &&
      !fetcher.data.errors?.length
    ) {
      setSavedAt(Date.now());
      const timer = setTimeout(() => setSavedAt(0), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [fetcher.state, fetcher.data]);

  return (
    <div className={styles.note} data-open={open || undefined}>
      <button
        type="button"
        className={styles.noteSummary}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>Order notes (optional)</span>
        <UiIcon name="chevron" className={styles.disclosureIcon} />
      </button>
      <div id={panelId} className={styles.notePanel}>
        <div className={styles.noteInner}>
          <CartForm
            route="/cart"
            action={CartForm.ACTIONS.NoteUpdate}
            fetcherKey="cart-note"
          >
            <label htmlFor={textareaId} className="sr-only">
              Order notes (optional)
            </label>
            <textarea
              id={textareaId}
              name="note"
              className={styles.noteField}
              rows={3}
              maxLength={500}
              defaultValue={note}
              placeholder="Notes about your order, e.g. special notes for delivery."
            />
            <div className={styles.noteActions}>
              <button
                type="submit"
                className={`btn btn--secondary ${styles.noteSave}`}
                disabled={fetcher.state !== 'idle'}
              >
                {fetcher.state !== 'idle'
                  ? 'Saving…'
                  : savedAt
                    ? 'Saved'
                    : 'Save note'}
              </button>
            </div>
          </CartForm>
        </div>
      </div>
    </div>
  );
}
