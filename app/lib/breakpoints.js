/**
 * Breakpoints — JS mirror of the table in app/styles/layout.css.
 *
 * ⚠ These values are duplicated by necessity, not by accident. CSS custom
 * properties cannot be used inside `@media` conditions, so the CSS side must
 * write the px values literally. If you change a breakpoint, change it in BOTH
 * app/styles/layout.css and this file.
 *
 * Use this only where JS genuinely needs to branch on viewport — matchMedia
 * subscriptions, canvas sizing, virtualised list thresholds. Anything that can
 * be expressed as CSS should be, because CSS applies before hydration and JS
 * does not.
 */

/** Raw pixel values, for arithmetic. */
export const BREAKPOINT_PX = {
  desktopLg: 1440,
  desktopNav: 1250,
  desktop: 1100,
  tablet: 1099,
  mdTablet: 699,
  phone: 499,
};

/**
 * Media query strings, matching the names used across our projects.
 * Pass straight to window.matchMedia().
 */
export const screen = {
  desktopLg: '(min-width: 1440px)',
  desktopNav: '(max-width: 1250px)',
  desktop: '(min-width: 1100px)',
  tablet: '(max-width: 1099px)',
  mdTablet: '(max-width: 699px)',
  tabletOnly: '(min-width: 500px) and (max-width: 1099px)',
  mobile: '(max-width: 499px)',
  largerThanPhone: '(min-width: 500px)',
  // Aliases — identical to tablet / desktop respectively. Kept so code ported
  // from other projects reads naturally.
  smallerThanDesktop: '(max-width: 1099px)',
  desktopOnly: '(min-width: 1100px)',
};

/**
 * Evaluate a named breakpoint. Returns false during SSR, where there is no
 * viewport — callers must handle the server render matching the desktop CSS.
 *
 * @param {keyof typeof screen} name
 * @returns {boolean}
 */
export function matchesScreen(name) {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  const query = screen[name];
  if (!query) throw new Error(`Unknown breakpoint: ${name}`);
  return window.matchMedia(query).matches;
}

export default screen;
