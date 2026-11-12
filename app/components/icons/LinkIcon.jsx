/*
 * Link Card icons.
 *
 * GENERATED — do not hand-edit the path data.
 *
 * To add or change an icon:
 *   1. Drop the .svg into app/assets/link-icons/ (viewBox "0 0 24 24",
 *      stroked not filled, no hardcoded colour)
 *   2. Run: node scripts/generate-link-icons.mjs
 *   3. Add the name to the `icon` enum on the Strapi
 *      `utilities.link-card` component so editors can select it.
 *
 * STROKED, unlike SocialIcon which is filled. The stroke attributes sit on the
 * wrapper below so every icon shares one weight; a source file that disagrees
 * about viewBox fails the build rather than rendering at the wrong scale.
 */

const ICONS = {
  archive: (
    <>
      <path d="M4 7h16v13H4z"/>
      <path d="M4 7l8-4 8 4"/>
      <path d="M9 12h6"/>
      <path d="M9 16h6"/>
    </>
  ),
  bolt: (
    <>
      <path d="M13 3L5 14h6l-1 7 8-11h-6z"/>
    </>
  ),
  building: (
    <>
      <path d="M4 20h16"/>
      <path d="M6 20V9l6-5 6 5v11"/>
      <path d="M10 20v-6h4v6"/>
    </>
  ),
  calculator: (
    <>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5"/>
      <path d="M7.5 7h9"/>
      <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01M8 15.5h.01M12 15.5h.01M16 15.5h.01M8 18.5h.01M12 18.5h.01M16 18.5h.01"/>
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M12 20V4M20 20v-7"/>
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v10H8l-4 4V5Z"/>
    </>
  ),
  clipboard: (
    <>
      <path d="M9 3h4v3H9z"/>
      <path d="M8 6h6l1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L8 6Z"/>
      <path d="M6 11h10"/>
      <path d="M6 16h10"/>
    </>
  ),
  devices: (
    <>
      <path d="M3 5h13v10H3z"/>
      <path d="M8 19h3"/>
      <path d="M17 8h4v13h-4z"/>
      <path d="M18 18h2"/>
    </>
  ),
  document: (
    <>
      <path d="M6 3h9l3 3v15H6z"/>
      <path d="M15 3v3h3"/>
      <path d="M9 12h6M9 15h6M9 18h4"/>
    </>
  ),
  droplet: (
    <>
      <path d="M12 2.5c3 3.6 5 6.6 5 9.5a5 5 0 0 1-10 0c0-2.9 2-5.9 5-9.5z"/>
      <path d="M9.5 13a2.5 2.5 0 0 0 2.5 2.5"/>
    </>
  ),
  fire: (
    <>
      <path d="M12.5 3.5C9 6.2 5.5 9.6 5.5 14a6.5 6.5 0 0 0 13 0c0-1.9-.6-3.6-1.5-5-.7 1-1.8 1.5-2.9 1.2C13 9.8 12.2 8 12.5 3.5z"/>
      <path d="M12 14.2c-1.5 1.7-2.4 3-2.4 4.1a2.4 2.4 0 0 0 4.8 0c0-1.1-.9-2.4-2.4-4.1z"/>
    </>
  ),
  flame: (
    <>
      <path d="M12 2c0 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-1-2.5-1-4 1 .5 2 2 2 4a5 5 0 0 1-10 0c0-5 5-6 5-9z"/>
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6"/>
      <path d="M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/>
    </>
  ),
  flow: (
    <>
      <path d="M3.5 7.5h6"/>
      <path d="M3.5 12h9"/>
      <path d="M3.5 16.5h6"/>
      <path d="M14 5.5c3.5 2 5.5 4 5.5 6.5s-2 4.5-5.5 6.5"/>
    </>
  ),
  gauge: (
    <>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M12 12l4-3.5"/>
      <path d="M12 3.5v1.6M20.5 12h-1.6M12 20.5v-1.6M3.5 12h1.6"/>
    </>
  ),
  graduation: (
    <>
      <path d="M12 3 2 8l10 5 10-5-10-5Z"/>
      <path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5"/>
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/>
      <path d="M3.5 9.5h17M3.5 15h17M9.5 3.5v17"/>
    </>
  ),
  hand: (
    <>
      <path d="M7 11V6a1.5 1.5 0 0 1 3 0v4"/>
      <path d="M10 10V4.5a1.5 1.5 0 0 1 3 0V10"/>
      <path d="M13 10V5.5a1.5 1.5 0 0 1 3 0V12"/>
      <path d="M16 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-12 0v-3"/>
    </>
  ),
  home: (
    <>
      <path d="M4 21V10.5L12 4l8 6.5V21"/>
      <path d="M9.5 21v-6h5v6"/>
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/>
      <path d="M5 19l7-7"/>
    </>
  ),
  meter: (
    <>
      <circle cx="12" cy="13" r="8"/>
      <path d="M12 13l4-4"/>
      <path d="M8 20h8"/>
    </>
  ),
  notes: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5"/>
      <path d="M8 8h8M8 12h8M8 16h5"/>
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </>
  ),
  pipe: (
    <>
      <path d="M4 9h10a4 4 0 0 1 4 4v7"/>
      <path d="M4 15h7a1 1 0 0 1 1 1v4"/>
    </>
  ),
  pulse: (
    <>
      <path d="M3 12.5h4l2.5 7 2.5-11 2.5 11 2-7h4"/>
    </>
  ),
  pump: (
    <>
      <path d="M4 15h4l2-6h6l2 6h4"/>
      <path d="M9 9V5h4v4"/>
    </>
  ),
  residual: (
    <>
      <path d="M4 6.5h9"/>
      <path d="M4 11h6.5"/>
      <path d="M4 15.5h9"/>
      <path d="M17.5 5.5v11"/>
      <path d="M14 13l3.5 3.5L21 13"/>
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.2-3 7.2-7 9-4-1.8-7-4.8-7-9V6z"/>
      <path d="M9 12l2.2 2.2L15.2 10"/>
    </>
  ),
  square: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2"/>
    </>
  ),
  standpipe: (
    <>
      <path d="M8 21V9a4 4 0 0 1 4-4a4 4 0 0 1 4 4v3"/>
      <path d="M4 12h4M16 12h4"/>
      <circle cx="8" cy="21" r="1.4"/>
      <circle cx="16" cy="15" r="1.4"/>
    </>
  ),
  trace: (
    <>
      <path d="M3 8.5h4l2.5 7 2.5-11 2.5 11 2-4h4"/>
      <path d="M3 18.5h18"/>
    </>
  ),
  trend: (
    <>
      <path d="M4 18l6-6 4 4 6-8"/>
      <path d="M15 8h5v5"/>
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="12.5" rx="2"/>
      <path d="M9.5 8.5l5 3-5 3z"/>
      <path d="M8 20.5h8"/>
    </>
  ),
  waves: (
    <>
      <path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
      <path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
    </>
  ),
  wrench: (
    <>
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"/>
    </>
  ),
};

/** Icon names that exist. Keep in sync with the Strapi enum. */
export const LINK_ICONS = Object.keys(ICONS);

/**
 * @param {{
 *   name: string,
 *   size?: number,
 *   className?: string,
 *   title?: string,
 * }} props
 */
export function LinkIcon({name, size = 26, className, title}) {
  const path = ICONS[name];
  if (!path) return null;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  );
}

export default LinkIcon;
