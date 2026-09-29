import {createContext, useContext, useEffect, useId, useRef} from 'react';
import {useLocation} from 'react-router';
import {useAside} from '~/components/Aside';
import UiIcon from '~/components/icons/UiIcon';
import styles from './Drawer.module.css';

/**
 * A side drawer: a native <dialog> pinned to the right edge, opened with
 * showModal(). The cart and the mobile menu are both one of these.
 *
 * Which drawer is open lives in Aside.Provider, so the callers that already
 * say `open('cart')` / `open('mobile')` keep working, and opening one still
 * closes the others (and the search sheet). This component only mirrors that
 * state onto the element.
 *
 * Native, for what it gives away from the old overlay div: the browser traps
 * focus inside, makes the page behind inert, handles Escape, and renders in
 * the top layer — so the sticky header can't paint over it, whatever its
 * z-index. Same pattern as the search sheet (search/QuickSearch.jsx).
 *
 * Layout is left to the children: `Drawer.Head`, `Drawer.Body` (the part
 * that scrolls) and `Drawer.Foot` (pinned to the bottom), so a drawer can
 * render its own loading state without remounting the dialog.
 *
 * @param {{
 *   type: 'cart' | 'mobile',
 *   id: string,
 *   label: string,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function Drawer({type, id, label, children}) {
  const {type: activeType, close} = useAside();
  const isOpen = activeType === type;
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const dismissedRef = useRef(false);
  // Whether the history entry pushed on open (see below) is still ours.
  const pushedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      /*
       * Focus the panel itself rather than the first control: the visitor
       * hears the drawer's name and reads from the top. Explicit, because
       * browsers disagree about what showModal() focuses by default.
       */
      dialog.querySelector('[data-drawer-focus]')?.focus();
      /*
       * On a phone the drawer is the whole screen, so the Back gesture is
       * the way out people reach for. One entry of our own, same URL, so
       * Back lands here and the popstate handler below closes the drawer.
       * The router's state ({usr, key, idx}) is carried over untouched: it
       * reads idx on its own next push, and never hears about this entry.
       */
      window.history.pushState({...(window.history.state ?? {}), [HISTORY_FLAG]: id}, '');
      pushedRef.current = true;
      historyGuard.id = id;
      historyGuard.dismiss = dismiss;
    } else if (!isOpen && dialog.open) {
      dialog.close();
      /*
       * Only when the visitor dismissed it (Escape, close, backdrop) — a
       * navigation away should leave focus where the new page puts it.
       */
      const target = openerRef.current;
      if (dismissedRef.current && target?.isConnected) target.focus();
      dismissedRef.current = false;
      openerRef.current = null;
      /*
       * Closed by the close button, Escape or a backdrop tap while our
       * entry is still the current one: take it back off the stack, so Back
       * afterwards does what it did before the drawer opened. After a Back
       * or a navigation the current entry is someone else's — leave it.
       */
      if (pushedRef.current && window.history.state?.[HISTORY_FLAG] === id) {
        historyGuard.swallow = true;
        window.history.back();
      }
      pushedRef.current = false;
      if (historyGuard.id === id) {
        historyGuard.id = null;
        historyGuard.dismiss = null;
      }
    }
    // dismiss is a fresh closure each render; it's read only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, id]);

  // Any navigation — a link inside, the back button — closes the drawer.
  useEffect(() => {
    if (isOpen) close();
    // Only the location matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  function dismiss() {
    dismissedRef.current = true;
    close();
  }

  return (
    <DrawerContext.Provider value={{dismiss, isOpen}}>
      {/*
        The handlers sit on the dialog because that is where a backdrop click
        lands and where Escape needs catching from any child.
      */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <dialog
        ref={dialogRef}
        id={id}
        className={styles.drawer}
        aria-label={label}
        // Escape is handled below; this keeps the context in step if the
        // browser closes it some other way.
        onClose={() => {
          if (isOpen) dismiss();
        }}
        onCancel={(event) => {
          event.preventDefault();
          dismiss();
        }}
        onClick={(event) => {
          // A click on the backdrop lands on the <dialog> itself.
          if (event.target === event.currentTarget) dismiss();
        }}
      >
        <div className={styles.panel} tabIndex={-1} data-drawer-focus="">
          {children}
        </div>
      </dialog>
    </DrawerContext.Provider>
  );
}

const DrawerContext = createContext({dismiss: () => {}, isOpen: false});

/** The key on our history entry's state that names the drawer it belongs to. */
const HISTORY_FLAG = 'drawer';

/*
 * Back while a drawer is open closes the drawer and nothing else.
 *
 * Registered here, at module load, on purpose: that is before hydration
 * creates the router, and popstate listeners on one target run in the order
 * they were added — so this one runs first and stopImmediatePropagation
 * keeps React Router out of it. To the router a pop to the same URL is a
 * navigation, and it would re-run every loader on the page for nothing.
 *
 * `swallow` marks a pop the drawer caused itself (history.back() after the
 * close button), which is not a navigation either.
 */
const historyGuard = {id: null, dismiss: null, swallow: false};

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    if (historyGuard.swallow) {
      historyGuard.swallow = false;
      event.stopImmediatePropagation();
      return;
    }
    if (historyGuard.id) {
      const {dismiss} = historyGuard;
      historyGuard.id = null;
      historyGuard.dismiss = null;
      event.stopImmediatePropagation();
      dismiss?.();
    }
  });
}

/** `dismiss()` closes the drawer the way its own close button does. */
export function useDrawer() {
  return useContext(DrawerContext);
}

/**
 * The top bar: a title, an optional note beside it ("3 items"), and Close.
 *
 * @param {{title: string, meta?: import('react').ReactNode}} props
 */
Drawer.Head = function DrawerHead({title, meta}) {
  const {dismiss} = useDrawer();
  const titleId = useId();
  return (
    <div className={styles.head}>
      <div className={styles.titles}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {/* Polite: a − / + tap changes the count, and that's the only
            spoken feedback the tap gets. */}
        {meta ? (
          <p className={styles.meta} aria-live="polite">
            {meta}
          </p>
        ) : null}
      </div>
      <button type="button" className={styles.close} onClick={dismiss}>
        <span className={styles.closeLabel}>Close</span>
        <UiIcon name="close" className={styles.closeIcon} />
      </button>
    </div>
  );
};

/** The part that scrolls. */
Drawer.Body = function DrawerBody({children, className = ''}) {
  return <div className={`${styles.body} ${className}`.trim()}>{children}</div>;
};

/** Pinned to the bottom, above the scrolling body. */
Drawer.Foot = function DrawerFoot({children}) {
  return <div className={styles.foot}>{children}</div>;
};

/** Ids the header's toggles point their aria-controls at. */
export const MOBILE_MENU_ID = 'mobile-menu';
