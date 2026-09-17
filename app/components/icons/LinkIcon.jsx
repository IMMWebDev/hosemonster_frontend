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
  flame: (
    <>
      <path d="M12 2c0 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-1-2.5-1-4 1 .5 2 2 2 4a5 5 0 0 1-10 0c0-5 5-6 5-9z"/>
    </>
  ),
  graduation: (
    <>
      <path d="M12 3 2 8l10 5 10-5-10-5Z"/>
      <path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5"/>
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </>
  ),
  pump: (
    <>
      <path d="M4 15h4l2-6h6l2 6h4"/>
      <path d="M9 9V5h4v4"/>
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
