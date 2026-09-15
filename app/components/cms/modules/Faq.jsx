import {useRef} from 'react';
import styles from './Faq.module.css';

/**
 * FAQ module — Smart Monster collection hifi
 * (sprint-04/hifi_smartmonstercollection.html, "What buyers ask us").
 *
 * A stacked accordion of questions. The comp draws two columns; stacked is the
 * convention for a reason — opening an answer only lengthens one column, so a
 * two-column accordion falls out of alignment the moment anyone uses it, and
 * the reading order (across, or down?) is ambiguous before they do.
 *
 * Each item is a native <details>/<summary> rather than a button with React
 * state: it works before hydration and without JS, brings its own keyboard
 * handling and its own announcement, and there is no open/closed state for this
 * module to own. The height animation is layered on top as an enhancement — see
 * the handler below.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     background?: 'white' | 'grey',
 *     items?: Array<{id: number, question: string, answer?: string}>,
 *   },
 * }} props
 */
export default function Faq({data}) {
  const {eyebrow, heading, background, items = []} = data ?? {};

  if (!heading) return null;

  /*
   * Only "grey" gets a class, same as Text & Media and Link Cards. Strapi
   * applies an enum default on CREATE only, so an entry authored before the
   * field existed comes back null rather than "white".
   */
  const backgroundClass = background === 'grey' ? styles.grey : '';

  return (
    <section className={`${styles.section} ${backgroundClass}`.trim()}>
      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}

        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          {heading}
        </h2>

        {items.length > 0 ? (
          <div className={styles.list}>
            {items.map((item, i) => (
              <Item
                key={item.id ?? i}
                item={item}
                /* The first question is open on load, matching the comp — it
                   shows the shape of an answer without making anyone click.
                   Everything else starts closed and opens independently, so two
                   answers can be compared. */
                open={i === 0}
                index={i}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Open/close duration. Matches --duration-slide, the house drawer timing. */
const DURATION = 260;
const EASING = 'ease-in-out';

/**
 * @param {{item: {question: string, answer?: string}, open?: boolean, index?: number}} props
 */
function Item({item, open = false, index = 0}) {
  const {question, answer} = item;

  const detailsRef = useRef(null);
  const panelRef = useRef(null);
  const animationRef = useRef(null);
  /* What the RUNNING animation is heading towards. Without it, a second click
   * mid-collapse reads `details.open` as still true and starts collapsing an
   * already-collapsing panel instead of reversing it. */
  const targetRef = useRef(open);

  /*
   * Height animation, as an enhancement over what <details> already does.
   *
   * <details> cannot be animated in CSS — the panel goes from nothing to its
   * full height in one frame. `::details-content` with `interpolate-size` fixes
   * that natively but is too new to rely on, so the height is driven here with
   * the Web Animations API and the native toggle is suppressed for the duration.
   *
   * Everything below is additive: with no JS, reduced motion, or no answer to
   * reveal, this returns early and the browser opens the panel itself.
   */
  function handleToggleClick(event) {
    const details = detailsRef.current;
    const panel = panelRef.current;
    if (!details || !panel) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    event.preventDefault();

    const running = animationRef.current;
    /* Reverse a running animation; otherwise go to the opposite of where the
     * panel currently is. */
    const target = running ? !targetRef.current : !details.open;
    targetRef.current = target;

    /*
     * Height the panel is at RIGHT NOW, so a reversal starts where it stands
     * rather than snapping to either end first.
     *
     * A closed panel contributes nothing and must start from 0 — measuring it
     * is not an option. Chrome hides closed <details> content with
     * `content-visibility: hidden` on ::details-content rather than removing
     * it, and getBoundingClientRect() on a descendant of that reports the
     * height the panel WOULD have. Trusting it animates 106px to 106px, which
     * is a very convincing way to render no animation at all.
     */
    const from = details.open ? panel.getBoundingClientRect().height : 0;
    if (running) running.cancel();

    // The content has to be laid out before it can be measured.
    if (target) details.open = true;
    panel.style.height = '';
    const to = target ? panel.scrollHeight : 0;

    const animation = panel.animate(
      {height: [`${from}px`, `${to}px`]},
      {duration: DURATION, easing: EASING},
    );
    animationRef.current = animation;

    animation.onfinish = () => {
      animationRef.current = null;
      // Closing happens at the END, so the content stays visible on the way out.
      if (!target) details.open = false;
      panel.style.height = '';
    };
  }

  return (
    <details
      className={styles.item}
      ref={detailsRef}
      open={open}
      data-reveal
      style={{'--reveal-i': index + 2}}
    >
      {/* Enter and Space on a <summary> both arrive as a click, so this one
          handler covers pointer and keyboard. */}
      <summary className={styles.summary} onClick={handleToggleClick}>
        <span className={styles.question}>{question}</span>
        {/* Decorative: <details> already announces its own expanded state, so
            an icon label here would say it a second time. */}
        <span className={styles.toggle} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" focusable="false">
            <line
              className={styles.toggleBar}
              x1="6"
              y1="1"
              x2="6"
              y2="11"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <line
              x1="1"
              y1="6"
              x2="11"
              y2="6"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </summary>

      {answer ? (
        // The wrapper is the thing whose height animates; the padding lives on
        // the child so it collapses with the content instead of holding the
        // panel open at 24px.
        <div className={styles.panel} ref={panelRef}>
          {/*
           * Rich text from CKEditor, rendered the same way module.wysiwyg does
           * it. Strapi content is authored internally; if untrusted HTML ever
           * reaches this field, sanitize here and there together.
           */}
          <div
            className={styles.answer}
            dangerouslySetInnerHTML={{__html: answer}}
          />
        </div>
      ) : null}
    </details>
  );
}
