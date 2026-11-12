import {useRef} from 'react';

/** Open/close duration. Matches --duration-slide, the house drawer timing. */
const DURATION = 260;
const EASING = 'ease-in-out';

/**
 * Smooth height animation for a native <details>, as an enhancement over what
 * it already does — the same technique the FAQ module uses inline.
 *
 * <details> can't be animated in CSS: the panel goes from nothing to its full
 * height in one frame. `::details-content` with `interpolate-size` fixes that
 * natively but is too new to rely on, so the height is driven with the Web
 * Animations API and the native toggle is held off for the duration.
 *
 * Everything is additive: with no JS or with reduced motion the click falls
 * through and the browser opens the panel itself.
 *
 * Put `detailsRef` on the <details>, `panelRef` on a wrapper around its
 * content (give it `overflow: hidden`, and keep padding on a child so it
 * collapses too), and `onSummaryClick` on the <summary>.
 */
export function useDetailsAnimation() {
  const detailsRef = useRef(null);
  const panelRef = useRef(null);
  const animationRef = useRef(null);
  /* Where the RUNNING animation is heading. Without it, a second click
   * mid-collapse reads `details.open` as still true and collapses an
   * already-collapsing panel instead of reversing it. */
  const targetRef = useRef(false);

  function onSummaryClick(event) {
    const details = detailsRef.current;
    const panel = panelRef.current;
    if (!details || !panel) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    event.preventDefault();

    const running = animationRef.current;
    const target = running ? !targetRef.current : !details.open;
    targetRef.current = target;

    /* Start from where the panel stands now, so a reversal doesn't snap. A
     * closed panel starts from 0 — Chrome keeps closed <details> content laid
     * out under `content-visibility: hidden`, so measuring it would report the
     * open height. */
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

  return {detailsRef, panelRef, onSummaryClick};
}
