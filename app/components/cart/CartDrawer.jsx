import {Suspense, useEffect, useRef} from 'react';
import {Await, useLocation, useRouteLoaderData} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import Drawer from '~/components/Drawer';
import {useAside} from '~/components/Aside';
import {CartLines, CartLinesSkeleton, CartNotices} from './CartLines';
import {CartNote, CartTotals} from './CartSummary';
import CartEmpty from './CartEmpty';
import {countLabel} from '~/lib/cart';
import styles from './CartDrawer.module.css';

export const CART_DRAWER_ID = 'cart-drawer';

/**
 * The cart drawer. Opens from anywhere via `useAside().open('cart')` — the
 * header's cart link and every Add to cart button do.
 *
 * The cart comes from the root loader, deferred, so the drawer shows a
 * skeleton until it resolves. Nothing here on /cart: that page renders the
 * cart itself, and two copies would mean two of every control.
 */
export default function CartDrawer() {
  const root = useRouteLoaderData('root');
  const {type} = useAside();
  const isOpen = type === 'cart';
  const location = useLocation();
  useCartViewed(isOpen);

  if (location.pathname === '/cart') return null;

  return (
    <Drawer type="cart" id={CART_DRAWER_ID} label="Your cart">
      <Suspense fallback={<Shell loading />}>
        <Await resolve={root?.cart} errorElement={<Shell error />}>
          {(cart) => <Shell cart={cart} />}
        </Await>
      </Suspense>
    </Drawer>
  );
}

/**
 * Head, body and foot for one state of the cart. All three live inside the
 * Suspense boundary so the dialog itself never remounts.
 *
 * @param {{cart?: object | null, loading?: boolean, error?: boolean}} props
 */
function Shell({cart: loaderCart = null, loading = false, error = false}) {
  const {close} = useAside();
  // Pending adds, updates and removes show before the server replies.
  const cart = useOptimisticCart(loaderCart);
  const count = cart?.totalQuantity ?? 0;
  const hasItems = count > 0 && (cart?.lines?.nodes?.length ?? 0) > 0;
  const justEmptied = useJustEmptied(hasItems);

  return (
    <>
      <Drawer.Head title="Your cart" meta={loading || error ? null : countLabel(count)} />
      <Drawer.Body className={styles.body}>
        {loading ? (
          <CartLinesSkeleton rows={2} />
        ) : error ? (
          <p className={styles.error} role="alert">
            We couldn’t load your cart. Refresh the page to try again.
          </p>
        ) : !hasItems ? (
          <>
            <CartNotices />
            <CartEmpty variant="drawer" onNavigate={close} focusHeading={justEmptied} />
          </>
        ) : (
          <>
            <CartNotices />
            <CartLines cart={cart} layout="drawer" onNavigate={close} />
            <div className={styles.note}>
              <CartNote cart={cart} />
            </div>
          </>
        )}
      </Drawer.Body>
      {hasItems ? (
        <Drawer.Foot>
          <CartTotals cart={cart} layout="drawer" onContinue={close} />
        </Drawer.Foot>
      ) : null}
    </>
  );
}

/** True on the render where the cart went from having lines to none. */
export function useJustEmptied(hasItems) {
  const had = useRef(hasItems);
  const justEmptied = had.current && !hasItems;
  useEffect(() => {
    had.current = hasItems;
  }, [hasItems]);
  return justEmptied;
}

/**
 * One `cart_viewed` per open, whoever opened it — the header link, an Add to
 * cart, the bundle builder. Waits for the shop to be known, as Hydrogen's
 * own view events do.
 */
function useCartViewed(isOpen) {
  const {publish, cart, prevCart, shop} = useAnalytics();
  useEffect(() => {
    if (!isOpen || !shop?.shopId) return;
    publish('cart_viewed', {cart, prevCart, shop, url: window.location.href});
    // Only opening should publish; the cart changing while open should not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shop?.shopId]);
}
