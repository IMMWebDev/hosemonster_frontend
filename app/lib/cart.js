import {CartForm} from '@shopify/hydrogen';
import {BUNDLE_ATTRIBUTE, bundleLabelOf} from '~/lib/cart-lines';

/**
 * Pure helpers for reading a cart, shared by the drawer and the /cart page.
 */

/**
 * Child lines (warranties, gift wrap, bundle components) keyed by their
 * parent's id. Both places a child can appear are read: `parentRelationship`
 * on a root line, and `lineComponents` on a componentized line.
 *
 * @param {Array<object>} lines
 * @returns {Record<string, Array<object>>}
 */
export function getLineItemChildrenMap(lines) {
  const children = {};
  for (const line of lines ?? []) {
    if (line?.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      (children[parentId] ??= []).push(line);
    }
    if (Array.isArray(line?.lineComponents)) {
      // Merged in, not shadowed: the starter declared a second `children`
      // here and the nested map was thrown away.
      const nested = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, kids] of Object.entries(nested)) {
        (children[parentId] ??= []).push(...kids);
      }
    }
  }
  return children;
}

/** Root lines only — a child line renders under its parent, not on its own. */
export function rootLines(cart) {
  return (cart?.lines?.nodes ?? []).filter((line) => !line?.parentRelationship?.parent);
}

/**
 * Lines arranged for display: the loose ones, then one group per bundle,
 * in the order each bundle first appears.
 *
 * A pending (optimistic) line carries no attributes, so a bundle being added
 * sits with the loose lines until the server replies and it moves into its
 * group.
 *
 * @param {Array<object>} lines - root lines
 * @returns {{loose: Array<object>, bundles: Array<{label: string, lines: Array<object>}>}}
 */
export function groupBundles(lines) {
  const loose = [];
  const bundles = [];
  for (const line of lines) {
    const label = bundleLabelOf(line);
    if (!label) {
      loose.push(line);
      continue;
    }
    let group = bundles.find((b) => b.label === label);
    if (!group) {
      group = {label, lines: []};
      bundles.push(group);
    }
    group.lines.push(line);
  }
  return {loose, bundles};
}

/**
 * The options worth showing on a line. A single-variant product has one
 * option Shopify calls "Title" with the value "Default Title", which says
 * nothing. "Select Thread Type" reads as "Thread Type".
 *
 * @param {Array<{name: string, value: string}> | undefined} selectedOptions
 */
export function visibleOptions(selectedOptions) {
  return (selectedOptions ?? [])
    .filter((o) => !(o.name === 'Title' && o.value === 'Default Title'))
    .map((o) => ({name: String(o.name ?? '').replace(/^select\s+/i, ''), value: o.value}));
}

/**
 * Line attributes to show. Keys starting with `_` are Shopify's convention
 * for private data; the bundle tag is shown by the group it belongs to.
 *
 * @param {Array<{key: string, value: string}> | undefined} attributes
 */
export function visibleAttributes(attributes) {
  return (attributes ?? []).filter(
    (a) => a.key && !a.key.startsWith('_') && a.key !== BUNDLE_ATTRIBUTE,
  );
}

/** "1 item" / "3 items". */
export function countLabel(n) {
  const count = Number(n) || 0;
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

/**
 * The form data a programmatic `fetcher.submit` sends to /cart — the same
 * shape `<CartForm>` builds, so `useOptimisticCart` reads it the same way.
 *
 * @param {string} action - a CartForm.ACTIONS value
 * @param {object} inputs
 */
export function cartFormData(action, inputs) {
  const fd = new FormData();
  fd.set(CartForm.INPUT_NAME, JSON.stringify({action, inputs}));
  return fd;
}

/**
 * Everything discounts took off, as a Money, or null when nothing did.
 * Order-level allocations sit on the cart; line-level ones on each line.
 *
 * @param {object | null | undefined} cart
 * @returns {{amount: string, currencyCode: string} | null}
 */
export function savedAmount(cart) {
  const currencyCode = cart?.cost?.subtotalAmount?.currencyCode;
  let total = 0;
  for (const a of cart?.discountAllocations ?? []) total += Number(a?.discountedAmount?.amount) || 0;
  for (const line of cart?.lines?.nodes ?? []) {
    for (const a of line?.discountAllocations ?? []) total += Number(a?.discountedAmount?.amount) || 0;
  }
  if (!(total > 0) || !currencyCode) return null;
  return {amount: total.toFixed(2), currencyCode};
}

/** Any line Shopify won't sell online right now. */
export function hasUnavailableLine(cart) {
  return (cart?.lines?.nodes ?? []).some(
    (line) => line?.merchandise?.availableForSale === false,
  );
}
