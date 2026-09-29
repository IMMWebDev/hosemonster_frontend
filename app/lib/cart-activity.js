import {useSyncExternalStore} from 'react';

/*
 * How many cart mutations are in flight, kept outside React so a click
 * handler can read it the moment a submit is made — before the router's
 * transition has rendered the fetcher as busy. Check out (CartSummary)
 * reads it; the lines (CartLines) count themselves in and out.
 */

let pending = 0;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export const cartActivity = {
  /** Count a mutation in. Returns the function that counts it back out. */
  begin() {
    pending += 1;
    emit();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      pending = Math.max(0, pending - 1);
      emit();
    };
  },
  get: () => pending,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** True while any cart mutation is in flight. Synchronous with begin(). */
export function useCartBusy() {
  return useSyncExternalStore(cartActivity.subscribe, cartActivity.get, () => 0) > 0;
}
