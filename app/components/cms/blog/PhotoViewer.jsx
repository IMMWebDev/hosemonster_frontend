import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useLocation} from 'react-router';
import UiIcon from '~/components/icons/UiIcon';
import {strapiLargest, strapiMedia, strapiSrcSet} from '~/lib/strapi-media';
import {
  TrackingContext,
  TrackingScope,
  pageKeyFromPath,
  useTrackId,
  useTrackingRoot,
} from '~/lib/tracking';
import styles from './PhotoViewer.module.css';

/**
 * Photo viewer — the full-screen swipe carousel a blog post's photos open in.
 *
 * Click any photo in a post's Image or Image Gallery modules and every photo
 * in the post opens here, in the order they appear on the page, starting at
 * the one clicked. Photos a gallery doesn't show as tiles (the ones behind its
 * "+3") are in the run too. Video posters are not: they're a play button, not
 * a photo.
 *
 * POST-LEVEL, NOT PER MODULE. BlogBody wraps the post in a
 * PhotoViewerProvider, which works out the slides from the modules array —
 * the same pure pass on the server and in the browser, so the markup matches
 * and nothing is measured. A module asks usePhotoViewer() where each of its
 * photos sits in that run (indexOf) and opens the viewer there (open). The
 * lookup is by the media object itself: BlockManager hands each module a
 * shallow copy of its block, so `data.images[i]` is the very object the
 * provider saw. Not by media id — an editor can put one photo in a post three
 * times, and each needs its own slide.
 *
 * A module rendered outside a post (there is no such page today; the Blog
 * Modules are only offered in the Blogs zone) gets a viewer of its own photos
 * instead — see WithPhotoViewer — rather than crashing on a missing context.
 *
 * THE DIALOG is the house modal: a native <dialog> opened with showModal(),
 * as Drawer.jsx and search/QuickSearch.jsx. The browser contains focus, makes
 * the page inert, closes on Escape and renders it in the top layer above the
 * sticky header. The page behind can't scroll (the CSS :has() rule), focus
 * goes back to the tile that opened it, and Back closes it (see the history
 * guard below).
 *
 * THE CAROUSEL is Testimonials' scroll-snap track: one slide per screen width,
 * swiped natively on touch. The arrows and keys only scroll it, and which
 * photo is showing is read back from scrollLeft rather than kept alongside —
 * so a swipe, an arrow and a key press can never disagree about it.
 */

/** @typedef {import('~/lib/strapi-media').StrapiImage} StrapiImage */

/**
 * @typedef {{
 *   media: StrapiImage,
 *   src: string,
 *   srcSet?: string,
 *   width?: number,
 *   height?: number,
 *   alt: string,
 *   caption: string,
 * }} PhotoSlide
 *
 * @typedef {{
 *   count: number,
 *   indexOf: (media: StrapiImage | null | undefined) => number,
 *   open: (index: number, opener?: HTMLElement | null) => void,
 * }} PhotoViewerApi
 */

/** @type {import('react').Context<PhotoViewerApi | null>} */
const PhotoViewerContext = createContext(
  /** @type {PhotoViewerApi | null} */ (null),
);

/** The viewer's HTML id, and the {module} part of its tracking ids. */
const VIEWER_ANCHOR = 'photo-viewer';

/**
 * Every photo in a post, in page order, as the viewer's slides. Pure: the
 * modules array in, the same list out, on the server and in the browser.
 *
 * Each slide's `src` is the Strapi `large` format (1000px), or the original
 * when there's no `large` (which means it's 1000px or less anyway), and its
 * `srcset` runs from the 500px format up to the original — so a wide or
 * retina screen gets a photo as sharp as the upload allows, and a phone still
 * gets the 1000px one. `width`/`height` are the original's: the most the
 * viewer will show the photo at (see .photo). An image with no URL is
 * skipped, as the modules themselves skip it, so the counts agree.
 *
 * A gallery's caption is under every one of its photos: it describes the set.
 *
 * @param {Array<{__component?: string} & Record<string, any>> | null | undefined} modules
 * @param {string} [baseUrl]
 * @returns {PhotoSlide[]}
 */
export function collectPostPhotos(modules, baseUrl) {
  /** @type {PhotoSlide[]} */
  const slides = [];

  /**
   * @param {StrapiImage | null | undefined} media
   * @param {string | null | undefined} caption
   */
  const add = (media, caption) => {
    if (!media || !strapiMedia(media.url, baseUrl)) return;
    const largest = strapiLargest(media, baseUrl);
    if (!largest) return;
    const sized = media.width && media.height;
    slides.push({
      media,
      src: largest.url,
      srcSet: strapiSrcSet(media, baseUrl),
      width: sized ? media.width : largest.width,
      height: sized ? media.height : largest.height,
      alt: media.alternativeText ?? '',
      caption: caption ?? '',
    });
  };

  for (const module of modules ?? []) {
    if (module?.__component === 'blog-modules.image') {
      add(module.image, module.caption);
    } else if (module?.__component === 'blog-modules.image-row') {
      for (const image of module.images ?? []) add(image, module.caption);
    }
  }
  return slides;
}

/**
 * The post's viewer, for a module's photos: `indexOf(image)` is the photo's
 * place in the post's run (-1 if it isn't in it), `open(i, opener)` shows the
 * viewer at that place and remembers `opener` to hand focus back to, and
 * `count` is how many photos the run has ("Open photo 3 of 7").
 *
 * Null outside a provider; the Blog Modules render inside WithPhotoViewer, so
 * they always have one.
 *
 * @returns {PhotoViewerApi | null}
 */
export function usePhotoViewer() {
  return useContext(PhotoViewerContext);
}

/**
 * Renders `children` inside the post's viewer when there is one, and inside a
 * viewer of just this module's photos when there isn't — so a Blog Module used
 * anywhere still opens its photos rather than crashing. `module` is the
 * block as BlockManager had it: its `__component` plus its data.
 *
 * The stand-alone viewer is named after the module's tracking scope
 * ("{page}__image-gallery-2__photo-viewer") and takes no HTML id, so two of
 * them on one page don't collide.
 *
 * @param {{
 *   module: {__component: string} & Record<string, any>,
 *   baseUrl?: string,
 *   children: import('react').ReactNode,
 * }} props
 */
export function WithPhotoViewer({module, baseUrl, children}) {
  const viewer = useContext(PhotoViewerContext);
  const scope = useContext(TrackingContext);
  const modules = useMemo(() => [module], [module]);
  if (viewer) return children;

  return (
    <PhotoViewerProvider
      modules={modules}
      baseUrl={baseUrl}
      scopeId={scope ? `${scope.moduleId}__${VIEWER_ANCHOR}` : undefined}
      anchor={null}
    >
      {children}
    </PhotoViewerProvider>
  );
}

/**
 * @typedef {{open: boolean, index: number, mounted: boolean, announce: boolean}} ViewState
 * `announce` turns the live line on a frame after the dialog shows (see the
 * open branch in PhotoViewerDialog).
 */

/**
 * Closed, and never opened: no slides rendered, no images fetched.
 * @type {ViewState}
 */
const INITIAL_VIEW = {open: false, index: 0, mounted: false, announce: false};

/**
 * Collects the post's photos and renders the one viewer they open in, after
 * `children`. Nothing is in the dialog until it first opens, so a post's page
 * load fetches no full-size photos.
 *
 * The viewer is site UI rather than a module, so it names its own tracking
 * scope: "{page}__photo-viewer", with close / prev / next on its buttons.
 *
 * @param {{
 *   modules?: Array<{__component?: string} & Record<string, any>>,
 *   baseUrl?: string,
 *   scopeId?: string,
 *   anchor?: string | null,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function PhotoViewerProvider({
  modules,
  baseUrl,
  scopeId,
  anchor = VIEWER_ANCHOR,
  children,
}) {
  const {pathname} = useLocation();
  const slides = useMemo(
    () => collectPostPhotos(modules, baseUrl),
    [modules, baseUrl],
  );
  const [view, setView] = useState(INITIAL_VIEW);
  const openerRef = useRef(/** @type {HTMLElement | null} */ (null));

  /** @type {PhotoViewerApi} */
  const api = useMemo(() => {
    const indexByMedia = new Map(slides.map((slide, i) => [slide.media, i]));
    return {
      count: slides.length,
      indexOf: (media) => (media ? (indexByMedia.get(media) ?? -1) : -1),
      open: (index, opener) => {
        if (slides.length === 0) return;
        openerRef.current = opener ?? null;
        setView({
          open: true,
          index: clamp(index, 0, slides.length - 1),
          mounted: true,
          announce: false,
        });
      },
    };
  }, [slides]);

  return (
    <PhotoViewerContext.Provider value={api}>
      {children}
      {slides.length > 0 ? (
        <TrackingScope
          id={scopeId ?? `${pageKeyFromPath(pathname)}__${VIEWER_ANCHOR}`}
          anchor={anchor}
        >
          <PhotoViewerDialog
            slides={slides}
            view={view}
            setView={setView}
            openerRef={openerRef}
          />
        </TrackingScope>
      ) : null}
    </PhotoViewerContext.Provider>
  );
}

/**
 * The dialog itself. `view.index` is which photo is showing: set to the
 * clicked photo when it opens, and from then on only ever read back from the
 * track's scroll position.
 *
 * @param {{
 *   slides: PhotoSlide[],
 *   view: ViewState,
 *   setView: import('react').Dispatch<import('react').SetStateAction<ViewState>>,
 *   openerRef: import('react').MutableRefObject<HTMLElement | null>,
 * }} props
 */
function PhotoViewerDialog({slides, view, setView, openerRef}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const location = useLocation();
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const frameRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const trackRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const pagerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  // Whether the dialog was open after the last run of the effect below — so
  // the close branch runs once however it was closed (button, Escape, Back).
  const wasOpenRef = useRef(false);
  // Closed by a navigation rather than by the visitor: focus stays where the
  // new page puts it.
  const navigatedRef = useRef(false);
  // This opening's mark on the history entry it pushed (see the guard).
  const tokenRef = useRef(/** @type {string | null} */ (null));
  // The frame that switches the live line on, cancelled if it closes first.
  const announceFrameRef = useRef(0);
  /*
   * The slide an arrow press last sent the track to, until it gets there. A
   * second press mid-glide steps on from it: the glide hasn't passed halfway
   * yet, so stepping from the rounded scroll position would aim at the same
   * photo again and two presses would move one. Only ever where the track is
   * heading — which photo is showing is still read from scrollLeft.
   */
  const targetRef = useRef(/** @type {number | null} */ (null));

  const count = slides.length;
  const {open: isOpen, index} = view;

  const dismiss = useCallback(() => {
    setView((current) => (current.open ? {...current, open: false} : current));
  }, [setView]);

  /** Which slide fills the track, from its scroll position. */
  const readIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const next = clamp(
      Math.round(track.scrollLeft / track.clientWidth),
      0,
      count - 1,
    );
    // Arrived where the last arrow press sent it: the next press steps from
    // here. (scrollend clears it too — this is for browsers without it.)
    if (
      targetRef.current !== null &&
      Math.abs(track.scrollLeft - targetRef.current * track.clientWidth) < 1
    ) {
      targetRef.current = null;
    }
    // Scroll fires every frame of a swipe; hand React the same object when
    // nothing changed so it bails out of the re-render (as Testimonials).
    setView((current) =>
      current.index === next ? current : {...current, index: next},
    );
  }, [count, setView]);

  /**
   * One photo along. `behavior` is left to the track's CSS, which is smooth
   * unless the visitor prefers reduced motion. Stepped from where the track
   * is heading when a glide is under way (targetRef), so two quick presses
   * land two photos on; from where it is otherwise.
   *
   * @param {-1 | 1} step
   */
  const go = useCallback(
    (step) => {
      const track = trackRef.current;
      if (!track || !track.clientWidth) return;
      const from =
        targetRef.current ?? Math.round(track.scrollLeft / track.clientWidth);
      const to = clamp(from + step, 0, count - 1);
      if (to === from) return;
      targetRef.current = to;
      track.scrollTo({left: to * track.clientWidth});
    },
    [count],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      wasOpenRef.current = true;
      navigatedRef.current = false;
      targetRef.current = null;
      dialog.showModal();
      /*
       * Straight to the clicked photo, before the first frame paints —
       * `instant` overrides the track's smooth scrolling, which would
       * otherwise glide past every photo in front of it.
       */
      const track = trackRef.current;
      if (track) {
        track.scrollTo({left: index * track.clientWidth, behavior: 'instant'});
      }
      /*
       * Focus the frame rather than the first control, as Drawer does: the
       * visitor hears the dialog's name, the arrow keys work at once, and no
       * focus ring lands on Close from a mouse click. Explicit, because
       * browsers disagree about what showModal() focuses by default.
       */
      frameRef.current?.focus({preventScroll: true});
      /*
       * "Photo 3 of 7" goes into the live line a frame from now, not in the
       * render that opened the dialog: then the dialog was still hidden, and
       * a live region that appears with its text already in it isn't
       * announced — screen readers speak changes, not starting content.
       */
      announceFrameRef.current = requestAnimationFrame(() =>
        setView((current) =>
          current.open ? {...current, announce: true} : current,
        ),
      );
      /*
       * Full screen on a phone, so the Back gesture is the way out people
       * reach for — the same idea as Drawer's. One entry of our own, same
       * URL, marked with this opening's token; Back pops it and the guard
       * below closes the viewer. The router's state ({usr, key, idx}) rides
       * along untouched, so it never notices the entry — and the guard
       * knows the page's own entry by that key and idx.
       */
      const home = window.history.state ?? {};
      const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      tokenRef.current = token;
      window.history.pushState({...home, [HISTORY_FLAG]: token}, '');
      historyGuard.open = {
        token,
        home: {key: home.key, idx: home.idx},
        onPop: (toHome) => {
          // Anywhere but the page's own entry is a navigation the router
          // carries out; the new page decides where focus goes.
          if (!toHome) navigatedRef.current = true;
          dismiss();
        },
      };
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      cancelAnimationFrame(announceFrameRef.current);
      // Escape has already closed it natively; the button and Back haven't.
      if (dialog.open) dialog.close();
      if (historyGuard.open?.token === tokenRef.current) {
        historyGuard.open = null;
      }
      /*
       * Closed by Close, Escape or a click beside the photo while our entry
       * is still the current one: take it back off the stack, so Back
       * afterwards does what it did before the viewer opened. After a Back,
       * a jump further back, or a navigation, the current entry is someone
       * else's — leave it. By token, not just the flag: an entry left over
       * from before a reload carries the flag too, and isn't ours to pop.
       */
      if (
        tokenRef.current &&
        window.history.state?.[HISTORY_FLAG] === tokenRef.current
      ) {
        historyGuard.swallow = true;
        window.history.back();
      }
      tokenRef.current = null;
      /*
       * Back to the tile that opened it. The browser restores focus on
       * close too, but not everywhere: Safari doesn't focus a button on
       * click, so it would have nothing to restore to.
       */
      const opener = openerRef.current;
      if (!navigatedRef.current && opener?.isConnected) {
        opener.focus({preventScroll: true});
      }
      openerRef.current = null;
    }
    // `index` is read only on open — the clicked photo. After that the
    // scroll position owns it, and re-running this on every swipe would
    // re-open nothing and jump the track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dismiss]);

  // Any navigation closes it (the page behind is inert, so this is only ever
  // a Back the guard didn't claim).
  useEffect(() => {
    if (!isOpen) return;
    navigatedRef.current = true;
    dismiss();
    // Only the location matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // A rotated phone changes the slide width; the snap holds the photo, but
  // the index is re-read in case the browser settled on another.
  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener('resize', readIndex);
    return () => window.removeEventListener('resize', readIndex);
  }, [isOpen, readIndex]);

  /*
   * However a scroll ends — the glide an arrow started, or a swipe that cut
   * it short — the next press steps from where the track came to rest. A
   * native listener: React 18 has no onScrollEnd.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!isOpen || !track) return undefined;
    const settle = () => {
      targetRef.current = null;
    };
    track.addEventListener('scrollend', settle);
    return () => track.removeEventListener('scrollend', settle);
  }, [isOpen]);

  // Unmounted while open (a hot reload, a route change): forget the guard.
  useEffect(
    () => () => {
      cancelAnimationFrame(announceFrameRef.current);
      if (tokenRef.current && historyGuard.open?.token === tokenRef.current) {
        historyGuard.open = null;
      }
    },
    [],
  );

  /*
   * The site's search shortcut — ⌘K / Ctrl+K — listens on the document
   * (QuickSearch.jsx). The page behind is inert while the viewer is
   * up, so its search shouldn't open on top of it. A native listener on the
   * dialog, stopping the key before it bubbles out: React's own onKeyDown
   * can't, because the app hydrates onto the document — React's listener and
   * the search's sit on the same node, where stopPropagation doesn't reach.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;
    /** @param {KeyboardEvent} event */
    const holdSearchKeys = (event) => {
      const k =
        (event.metaKey || event.ctrlKey) && event.key?.toLowerCase() === 'k';
      if (k) event.stopPropagation();
    };
    dialog.addEventListener('keydown', holdSearchKeys);
    return () => dialog.removeEventListener('keydown', holdSearchKeys);
  }, [isOpen]);

  /** @param {import('react').KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    // Alt+← is the browser's Back; leave modified keys alone.
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    go(event.key === 'ArrowRight' ? 1 : -1);
  }

  /**
   * The dialog fills the screen, so there's no ::backdrop to click — the
   * dark space around the photo is the backdrop. A click on the photo, its
   * caption or a control is theirs; anywhere else closes. A swipe is a
   * scroll, not a click, so swiping never closes it.
   *
   * On a phone the arrows sit in a strip along the bottom, and a thumb that
   * just misses one meant the arrow, not "close" — so the strip isn't
   * backdrop. It's checked by position rather than made clickable, so a
   * swipe that starts down there still moves the track under it. (On wider
   * screens the strip has no box — `display: contents` — and this is moot.)
   *
   * @param {import('react').MouseEvent} event
   */
  function handleClick(event) {
    const target = /** @type {Element} */ (event.target);
    if (target.closest?.('img, figcaption, button')) return;
    const strip = pagerRef.current?.getBoundingClientRect();
    if (strip && strip.height > 0 && event.clientY >= strip.top) return;
    dismiss();
  }

  const atStart = index <= 0;
  const atEnd = index >= count - 1;

  return (
    /*
     * The handlers sit on the dialog because that's where a click beside the
     * photo lands and where the arrow keys need catching from any child. A
     * modal dialog is an interactive container; the rule predates <dialog>.
     */
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      {...trackingRoot}
      className={styles.dialog}
      aria-label="Photos"
      // Escape closes a modal dialog natively; this keeps the state in step.
      onClose={dismiss}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div ref={frameRef} className={styles.frame} tabIndex={-1}>
        {/*
          tabIndex -1: Chrome makes a scroller with nothing focusable in it a
          Tab stop of its own, and this one fills the screen, so its focus
          ring would only show as a hairline at the screen's edge — the first
          Tab would seem to do nothing. ←/→ are caught on the dialog anyway.
        */}
        <div
          ref={trackRef}
          className={styles.track}
          onScroll={readIndex}
          tabIndex={-1}
          role="group"
          aria-roledescription="carousel"
          aria-label="Photos"
        >
          {view.mounted
            ? slides.map((slide, i) => (
                <Slide
                  // A post can carry the same photo twice; position is the
                  // identity here, and the list never reorders.
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  slide={slide}
                  // By position, as the APG carousel's slides: the photo's
                  // alt text is read from the image itself, and naming the
                  // slide with it too would read it twice.
                  label={`${i + 1} of ${count}`}
                  // The photo showing and its neighbours load now, so a swipe
                  // never lands on a blank; the rest wait until they're near.
                  eager={Math.abs(i - index) <= 1}
                />
              ))
            : null}
        </div>

        <div className={styles.bar}>
          {/* Hidden from screen readers, which get the live line below
              rather than "3 slash 7". */}
          <p className={styles.counter} aria-hidden="true">
            {index + 1} / {count}
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={dismiss}
            data-track-id={trackId('close')}
          >
            <span className={styles.closeLabel}>Close</span>
            <UiIcon name="close" size={18} className={styles.closeIcon} />
          </button>
        </div>

        {count > 1 ? (
          <div ref={pagerRef} className={styles.pager}>
            {/*
              aria-disabled rather than disabled at the ends: a disabled
              button drops focus to <body> the moment it disables, which
              strands a keyboard user mid-modal. go() is a no-op there anyway.
            */}
            <button
              type="button"
              className={`${styles.arrow} ${styles.prev}`}
              onClick={() => go(-1)}
              aria-disabled={atStart}
              aria-label="Previous photo"
              data-track-id={trackId('prev')}
            >
              <UiIcon name="chevron" size={20} className={styles.arrowIcon} />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              onClick={() => go(1)}
              aria-disabled={atEnd}
              aria-label="Next photo"
              data-track-id={trackId('next')}
            >
              <UiIcon name="chevron" size={20} className={styles.arrowIcon} />
            </button>
          </div>
        ) : null}

        {/* Polite: a swipe or an arrow changes the photo, and this is the
            only spoken feedback it gets. Empty while closed and for the
            first frame of an opening (view.announce), so each opening —
            even on the same photo as last time — is a change, and spoken. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {isOpen && view.announce ? `Photo ${index + 1} of ${count}` : ''}
        </p>
      </div>
    </dialog>
  );
}

/**
 * One photo, as big as the screen allows without cropping or blowing it up
 * past the size it was uploaded at. The width is worked out in CSS from the
 * photo's proportions and the room left by the bars (see .photo), so the box
 * is the photo's own shape before it loads and a click just beside it closes.
 *
 * `sizes` is the same sum, roughly: no wider than the screen, no wider than
 * the screen's height allows at this photo's proportions. Near enough for the
 * browser to pick the 1000px file on a phone and the original on a retina
 * laptop; the bars it ignores only ever make it pick a little bigger.
 *
 * `data-caption` gives a captioned slide room for its caption under the
 * photo; one without keeps that room for the photo.
 *
 * @param {{slide: PhotoSlide, label: string, eager: boolean}} props
 */
function Slide({slide, label, eager}) {
  const {src, srcSet, width, height, alt, caption} = slide;
  const ratio = width && height ? width / height : undefined;

  return (
    <div
      className={styles.slide}
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      data-caption={caption ? '' : undefined}
    >
      <figure
        className={styles.photo}
        style={
          ratio
            ? /** @type {import('react').CSSProperties} */ ({
                '--photo-w': `${width}px`,
                '--photo-ratio': ratio,
              })
            : undefined
        }
      >
        <img
          src={src}
          srcSet={srcSet}
          sizes={
            srcSet && ratio
              ? `min(100vw, ${Math.round(ratio * 1000) / 10}vh)`
              : undefined
          }
          alt={alt}
          width={width}
          height={height}
          className={styles.image}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
        />
        {caption ? (
          <figcaption className={styles.caption}>{caption}</figcaption>
        ) : null}
      </figure>
    </div>
  );
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** The key on our history entry's state that marks it as the viewer's. */
const HISTORY_FLAG = 'photoViewer';

/*
 * Back while the viewer is open closes the viewer and nothing else.
 *
 * Drawer.jsx keeps React Router out of its own Back by registering its
 * popstate listener before the router exists. This module can load after the
 * router — it comes with the blog route, which a client-side navigation
 * fetches later — so that ordering isn't available. A CAPTURE listener on
 * window is: at the target, capturing listeners run before non-capturing
 * ones whatever order they were added in, and the router's is non-capturing.
 * stopImmediatePropagation then keeps the router from treating a pop to the
 * same URL as a navigation and re-running every loader on the page.
 *
 * It only ever hides a pop from the router when the router would have
 * nothing to do: when the pop lands on the page's own entry — the same key
 * and idx the router already has, so the same URL and the same screen. That
 * is a plain Back from the viewer, and the history.back() the viewer makes
 * itself after Close (`swallow`). Any other pop while it's open — a jump two
 * pages back from the Back button's long-press menu, history.go(-2) — closes
 * the viewer and goes on to the router, which navigates. Hiding those would
 * leave the address bar on one page and the screen on another.
 *
 * Closing leaves our entry ahead in the stack, so Forward afterwards lands
 * on it: the same URL, the viewer shut. The router sees that pop and
 * revalidates the page it's already on — wasted, but harmless, and the same
 * as Drawer's entry does. Stepping back off it silently, as an earlier
 * version did, also caught Backs from later pages onto a left-over entry
 * (after a reload, or a search run from over the viewer) and broke them.
 */
const historyGuard = {
  /**
   * The open viewer: its entry's token, the page's own entry it was pushed
   * from, and what to do when a pop arrives (`toHome`: whether it landed on
   * that entry).
   *
   * @type {{
   *   token: string,
   *   home: {key?: string, idx?: number},
   *   onPop: (toHome: boolean) => void,
   * } | null}
   */
  open: null,
  swallow: false,
};

if (typeof window !== 'undefined') {
  window.addEventListener(
    'popstate',
    (event) => {
      if (historyGuard.swallow) {
        historyGuard.swallow = false;
        event.stopImmediatePropagation();
        return;
      }
      const {open} = historyGuard;
      if (!open) return;
      historyGuard.open = null;
      const toHome =
        event.state?.key === open.home.key &&
        event.state?.idx === open.home.idx;
      if (toHome) event.stopImmediatePropagation();
      open.onPop(toHome);
    },
    {capture: true},
  );
}
