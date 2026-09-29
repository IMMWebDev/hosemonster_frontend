/**
 * Small UI icons, one shape each, on the house 16×16 grid: stroked in
 * currentColor at 1.75 with round caps, the same as every inline SVG in the
 * header, search and bundle builder. Decorative — the button or text beside
 * them carries the meaning — so all are hidden from assistive tech.
 */

const PATHS = {
  close: 'M4 4l8 8M12 4l-8 8',
  trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.6 8.5h4.8l.6-8.5',
  minus: 'M3.5 8h9',
  plus: 'M8 3.5v9M3.5 8h9',
  chevron: 'M4 6l4 4 4-4',
  check: 'M3 8.5l3.2 3L13 4.5',
  alert: 'M8 2.5l6 11H2l6-11zM8 6.5v3M8 11.5v.5',
  lock: 'M4 7.5h8v6H4zM5.5 7.5v-2a2.5 2.5 0 0 1 5 0v2',
  arrow: 'M3 8h10M9 4l4 4-4 4',
  cart: 'M1.5 2.5h2l1.7 7.5h7.3l1.5-5H4.4M6 13.25a.25.25 0 1 0 .01 0M11.5 13.25a.25.25 0 1 0 .01 0',
};

/**
 * @param {{name: keyof typeof PATHS, className?: string, size?: number}} props
 */
export default function UiIcon({name, className, size = 16}) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
