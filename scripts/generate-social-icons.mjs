import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

const SRC = new URL('../app/assets/social', import.meta.url).pathname;
const OUT = new URL('../app/components/icons/SocialIcon.jsx', import.meta.url).pathname;

// kebab-case SVG attributes -> JSX camelCase
const ATTR_MAP = {
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-dasharray': 'strokeDasharray',
  'fill-opacity': 'fillOpacity',
  'stroke-opacity': 'strokeOpacity',
};

const files = readdirSync(SRC).filter((f) => f.endsWith('.svg'));
const icons = {};

for (const file of files) {
  const name = path.basename(file, '.svg');
  const raw = readFileSync(path.join(SRC, file), 'utf8');

  const viewBox = raw.match(/viewBox="([^"]*)"/)?.[1];
  if (!viewBox) throw new Error(`${file}: no viewBox`);

  // Inner markup only — the wrapper <svg> is written by the component so every
  // icon gets identical sizing and a11y attributes.
  let inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');

  // Hardcoded fills must become currentColor or the icons cannot be themed.
  inner = inner.replace(/fill="(black|#000000|#000)"/gi, 'fill="currentColor"');

  for (const [kebab, camel] of Object.entries(ATTR_MAP)) {
    inner = inner.replace(new RegExp(`${kebab}=`, 'g'), `${camel}=`);
  }

  inner = inner
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => '      ' + l)
    .join('\n');

  icons[name] = {viewBox, inner};
}

const names = Object.keys(icons).sort();

const body = names
  .map(
    (n) => `  ${n}: {
    viewBox: '${icons[n].viewBox}',
    path: (
      <>
${icons[n].inner}
      </>
    ),
  },`,
  )
  .join('\n');

const out = `/*
 * Social platform icons.
 *
 * GENERATED — do not hand-edit the path data.
 *
 * To add or change an icon:
 *   1. Drop the .svg into app/assets/social/
 *   2. Run: node scripts/generate-social-icons.mjs
 *   3. Add the platform to the \`platform\` enum on the Strapi
 *      \`utilities.social-link\` component so editors can select it.
 *
 * Every icon is normalized to fill="currentColor" so it inherits its color from
 * CSS. The source files were inconsistent — most hardcoded fill="black", while
 * x and linkedin already used currentColor.
 *
 * Note the viewBoxes are not uniform (${[...new Set(names.map((n) => icons[n].viewBox))].join(' and ')}),
 * so each icon carries its own rather than sharing one.
 */

const ICONS = {
${body}
};

/** Platform keys that have an icon. Keep in sync with the Strapi enum. */
export const SOCIAL_PLATFORMS = Object.keys(ICONS);

/**
 * @param {{
 *   platform: string,
 *   size?: number,
 *   className?: string,
 *   title?: string,
 * }} props
 */
export function SocialIcon({platform, size = 24, className, title}) {
  const icon = ICONS[platform];
  if (!icon) return null;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {icon.path}
    </svg>
  );
}

export default SocialIcon;
`;

writeFileSync(OUT, out);
console.log(`Wrote ${OUT}`);
console.log(`Platforms (${names.length}): ${names.join(', ')}`);
for (const n of names) console.log(`  ${n.padEnd(12)} viewBox="${icons[n].viewBox}"`);
