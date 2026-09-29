import {createContext, useCallback, useContext, useMemo, useState} from 'react';

/**
 * Which panel is open — the cart drawer, the mobile menu, the search sheet —
 * and the `open`/`close` every toggle and Add to cart button calls. The
 * panels themselves are components/Drawer.jsx and search/QuickSearch.jsx;
 * only one is open at a time because they all read this one value.
 */
const AsideContext = createContext(null);

export function AsideProvider({children}) {
  /*
   * `payload` travels with an open request — e.g. {term} when a page search
   * box hands its text to the quick-search sheet on a phone. Cleared on every
   * open and close, so a stale term never reappears in a later open.
   */
  const [state, setState] = useState({type: 'closed', payload: null});

  // Stable callbacks: QuickSearch binds a document keydown listener to `open`,
  // which would otherwise re-subscribe on every render.
  const open = useCallback(
    (type, payload = null) => setState({type, payload}),
    [],
  );
  const close = useCallback(
    () => setState({type: 'closed', payload: null}),
    [],
  );

  const value = useMemo(
    () => ({type: state.type, payload: state.payload, open, close}),
    [state, open, close],
  );

  return (
    <AsideContext.Provider value={value}>{children}</AsideContext.Provider>
  );
}

/** Kept as `Aside.Provider` for the layout's existing usage. */
export const Aside = {Provider: AsideProvider};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

/** @typedef {'search' | 'cart' | 'mobile' | 'closed'} AsideType */
/**
 * @typedef {{
 *   type: AsideType;
 *   payload: Record<string, any> | null;
 *   open: (mode: AsideType, payload?: Record<string, any>) => void;
 *   close: () => void;
 * }} AsideContextValue
 */

/** @typedef {import('react').ReactNode} ReactNode */
