import {useLoaderData, data} from 'react-router';
import {Analytics, CartForm} from '@shopify/hydrogen';
import CartPage from '~/components/cart/CartPage';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Your cart | Hose Monster'}];
};

/**
 * @type {HeadersFunction}
 */
export const headers = ({actionHeaders}) => actionHeaders;

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      /*
       * The typed code goes first, then the codes already on the cart. The
       * existing list arrives as a string for one code and an array for
       * several (getFormInput), and a chip's remove sends the list without
       * the removed code and no typed one.
       */
      const typed =
        typeof inputs.discountCode === 'string' ? inputs.discountCode.trim() : '';
      const existing = [].concat(inputs.discountCodes ?? []).filter(Boolean);
      const codes = typed
        ? [typed, ...existing.filter((c) => c.toUpperCase() !== typed.toUpperCase())]
        : existing;

      result = await cart.updateDiscountCodes(codes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const formGiftCardCode = inputs.giftCardCode;

      const giftCardCodes = formGiftCardCode ? [formGiftCardCode] : [];

      result = await cart.addGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes;
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    case CartForm.ACTIONS.NoteUpdate: {
      // The order note (PO number, delivery instructions): a textarea named
      // `note` lands on inputs.note.
      result = await cart.updateNote(String(inputs.note ?? ''));
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  const {cart} = context;
  return await cart.get();
}

export default function Cart() {
  /** @type {LoaderReturnData} */
  const cart = useLoaderData();

  return (
    <>
      <CartPage cart={cart} />
      <Analytics.CartView />
    </>
  );
}

/** @typedef {import('react-router').HeadersFunction} HeadersFunction */
/** @typedef {import('./+types/cart').Route} Route */
/** @typedef {import('@shopify/hydrogen').CartQueryDataReturn} CartQueryDataReturn */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
/** @typedef {ReturnType<typeof useActionData<typeof action>>} ActionReturnData */
