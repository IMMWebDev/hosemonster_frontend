import {Link} from 'react-router';
import {Money, useOptimisticCart} from '@shopify/hydrogen';
import {CartLines, CartNotices} from './CartLines';
import {CartTotals} from './CartSummary';
import CartEmpty from './CartEmpty';
import {useJustEmptied} from './CartDrawer';
import {countLabel} from '~/lib/cart';
import styles from './CartPage.module.css';

/**
 * The /cart page: the lines in a wide column, the summary in a sticky panel
 * beside them; stacked on a phone, with the total and Check out pinned to
 * the bottom of the screen so they're never a scroll away.
 *
 * Lives here rather than in routes/cart.jsx because a route file can't sit
 * next to its CSS module (flatRoutes would treat the .css as a route).
 *
 * @param {{cart: object | null}} props
 */
export default function CartPage({cart: loaderCart}) {
  const cart = useOptimisticCart(loaderCart);
  const count = cart?.totalQuantity ?? 0;
  const hasItems = count > 0 && (cart?.lines?.nodes?.length ?? 0) > 0;
  const justEmptied = useJustEmptied(hasItems);
  const total = cart?.cost?.totalAmount;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Empty, the page IS the empty state: its heading is the page's. */}
        {!hasItems ? (
          <>
            <CartNotices />
            <CartEmpty variant="page" focusHeading={justEmptied} />
          </>
        ) : (
          <div className={styles.head}>
            <h1 className={styles.title}>
              Your cart
              <span className={styles.count}>{countLabel(count)}</span>
            </h1>
            <Link to="/shop" className={styles.continue}>
              Continue shopping
            </Link>
          </div>
        )}

        {!hasItems ? null : (
          <div className={styles.layout}>
            <div className={styles.lines}>
              <CartNotices />
              <div className={styles.columns} aria-hidden="true">
                <span>Product</span>
                <span>Quantity</span>
                <span>Total</span>
              </div>
              <CartLines cart={cart} layout="page" />
            </div>

            <aside className={styles.panel} aria-label="Order summary">
              <h2 className={styles.panelTitle}>Order summary</h2>
              <CartTotals cart={cart} layout="page" />
            </aside>

            {/* Phone: the total and the way out, pinned. */}
            {cart?.checkoutUrl ? (
              <div className={styles.mobileBar}>
                <p className={styles.mobileTotal}>
                  <span className={styles.mobileTotalLabel}>Estimated total</span>
                  {total ? <Money data={total} as="span" /> : null}
                </p>
                <a href={cart.checkoutUrl} target="_self" className="btn btn--primary">
                  Check out
                </a>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
