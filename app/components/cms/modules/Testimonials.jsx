import {useCallback, useEffect, useRef, useState} from 'react';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './Testimonials.module.css';

/**
 * Testimonials module — Figma "Homepage" → Hifi → Main → Section (7:1735).
 *
 * Intro copy above a carousel of quote cards. Page-agnostic.
 *
 * The carousel is a native scroll-snap track, not a transform slider. That
 * means it works with no JavaScript, is swipeable on touch for free, and the
 * cards-per-view can change at each breakpoint without page arithmetic. The
 * JavaScript here only drives the arrows and dots, and reads its state back
 * from the element's real scroll position rather than tracking an index — so
 * a swipe and an arrow click can never disagree.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     items?: Array<{
 *       id: number,
 *       quote: string,
 *       authorName: string,
 *       authorTitle?: string,
 *       authorImage?: {url?: string},
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function Testimonials({data, baseUrl}) {
  const {eyebrow, heading, body, items = []} = data ?? {};
  const trackRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    overflowing: false,
    atStart: true,
    atEnd: false,
    activeIndex: 0,
    pageCount: 0,
  });

  const readScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px of slack: fractional layout widths mean scrollLeft rarely lands
    // exactly on 0 or max, which would otherwise leave an arrow enabled at the
    // end of the track.
    const overflowing = max > 1;
    // Pages, not cards. Cards-per-view changes at each breakpoint, and four
    // cards shown three-across is TWO scroll positions, not four — so a dot per
    // card would leave two of them inert. Deriving from the viewport width
    // gives one dot per reachable position at any breakpoint.
    const page = el.clientWidth;
    const pageCount = page ? Math.ceil(el.scrollWidth / page) : 0;
    /*
     * activeIndex comes from scroll PROGRESS across the available range, not
     * from scrollLeft / pageWidth. The last page is almost never a full page
     * wide: four cards shown three-across leaves only one card of scroll, so
     * the track's entire range can be far smaller than one viewport. Dividing
     * by pageWidth then yields a fraction that always rounds to 0, and the
     * active dot never advances no matter how far you scroll.
     */
    const nextState = {
      overflowing,
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft >= max - 1,
      activeIndex:
        max > 0 && pageCount > 1
          ? Math.round((el.scrollLeft / max) * (pageCount - 1))
          : 0,
      pageCount,
    };
    // Scroll fires on every animation frame while the track is moving. React
    // bails out of a re-render only on Object.is equality, so handing it a new
    // object each time would re-render the whole carousel ~60x a second for a
    // state that usually has not changed. Return the previous object instead.
    setScrollState((prev) =>
      prev.overflowing === nextState.overflowing &&
      prev.atStart === nextState.atStart &&
      prev.atEnd === nextState.atEnd &&
      prev.activeIndex === nextState.activeIndex &&
      prev.pageCount === nextState.pageCount
        ? prev
        : nextState,
    );
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    readScrollState();
    // Cards-per-view changes at each breakpoint, so overflow and page count
    // have to be re-measured on resize, not just on scroll. The window
    // listener backs up the observer: a stale page count leaves dots that
    // point nowhere, and the state update is a no-op when nothing changed.
    const observer = new ResizeObserver(readScrollState);
    observer.observe(el);
    window.addEventListener('resize', readScrollState);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', readScrollState);
    };
  }, [readScrollState, items.length]);

  /**
   * Distance between two adjacent pages. Derived from the real scroll range
   * rather than the viewport width, so the arrows and the dots always land on
   * the same positions — and on the exact positions activeIndex reads back.
   */
  function pageStep(el) {
    const max = el.scrollWidth - el.clientWidth;
    const pages = el.clientWidth ? Math.ceil(el.scrollWidth / el.clientWidth) : 1;
    return pages > 1 ? max / (pages - 1) : max;
  }

  /** @param {number} direction -1 back, 1 forward */
  function scrollByPage(direction) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({left: pageStep(el) * direction, behavior: 'smooth'});
  }

  /** @param {number} index */
  function scrollToPage(index) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({left: pageStep(el) * index, behavior: 'smooth'});
  }

  if (!heading || items.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.heading}>{heading}</h2>
        {body ? <p className={styles.body}>{body}</p> : null}

        <div
          className={styles.track}
          ref={trackRef}
          onScroll={readScrollState}
          // A scrollable region MUST be focusable, or a keyboard user has no
          // way to scroll it — WCAG 2.1.1. The lint rule below flags tabIndex
          // on anything it does not consider interactive and has no exception
          // for scroll containers, so this is a deliberate override, not an
          // oversight. Removing it makes the carousel keyboard-inaccessible.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={heading}
        >
          {items.map((item, i) => (
            <article className={styles.card} key={item.id ?? i}>
              <div className={styles.quoteMark} aria-hidden="true" />
              <blockquote className={styles.quote}>{item.quote}</blockquote>
              <footer className={styles.author}>
                <Avatar item={item} baseUrl={baseUrl} />
                <div>
                  <p className={styles.authorName}>{item.authorName}</p>
                  {item.authorTitle ? (
                    <p className={styles.authorTitle}>{item.authorTitle}</p>
                  ) : null}
                </div>
              </footer>
            </article>
          ))}
        </div>

        {scrollState.overflowing && (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => scrollByPage(-1)}
              disabled={scrollState.atStart}
              aria-label="Previous testimonial"
            >
              <Chevron direction="left" />
            </button>

            <div className={styles.dots}>
              {Array.from({length: scrollState.pageCount}, (_, i) => (
                <button
                  type="button"
                  key={i}
                  className={`${styles.dot} ${
                    i === scrollState.activeIndex ? styles.dotActive : ''
                  }`}
                  onClick={() => scrollToPage(i)}
                  aria-label={`Go to slide ${i + 1} of ${scrollState.pageCount}`}
                  aria-current={i === scrollState.activeIndex}
                />
              ))}
            </div>

            <button
              type="button"
              className={styles.arrow}
              onClick={() => scrollByPage(1)}
              disabled={scrollState.atEnd}
              aria-label="Next testimonial"
            >
              <Chevron direction="right" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Arrow glyph.
 *
 * Drawn as SVG rather than the "<" and ">" characters the comp uses. Those are
 * text, so flex centring aligns their LINE BOX, not the glyph — and both sit
 * high in the em box, which reads as visibly off-centre inside a circle. An SVG
 * has no baseline or side bearings, so it centres exactly, and it does not
 * shift again when the brand font finally loads.
 *
 * @param {{direction: 'left' | 'right'}} props
 */
function Chevron({direction}) {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {direction === 'left' ? (
        <polyline points="15 5 8 12 15 19" />
      ) : (
        <polyline points="9 5 16 12 9 19" />
      )}
    </svg>
  );
}

/**
 * @param {{item: object, baseUrl?: string}} props
 */
function Avatar({item, baseUrl}) {
  const url = strapiMedia(item.authorImage?.url, baseUrl);
  if (!url) return null;
  return (
    <img
      src={url}
      /* Decorative: the name sits right beside it in the same footer. */
      alt=""
      className={styles.authorImage}
      loading="lazy"
      decoding="async"
    />
  );
}
