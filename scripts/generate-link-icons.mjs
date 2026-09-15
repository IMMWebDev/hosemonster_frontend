import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

/*
 * Builds app/components/icons/LinkIcon.jsx from app/assets/link-icons/*.svg.
 *
 * A sibling of generate-social-icons.mjs rather than a shared generator,
 * because the two icon families differ in the one place that matters: social
 * icons are FILLED shapes, these are STROKED outlines. That changes which
 * attributes have to survive onto the wrapper <svg> (stroke, width, caps and
 * joins) and which hardcoded colours need rewriting to currentColor. Merging
 * them would mean a flag on every line that differs.
 */

const SRC = new URL('../app/assets/link-icons', import.meta.url).pathname;
const OUT = new URL('../app/components/icons/LinkIcon.jsx', import.meta.url).pathname;

// kebab-case SVG attributes -> JSX camelCase
const ATTR_MAP = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
};

const files = readdirSync(SRC).filter((f) => f.endsWith('.svg'));
if (files.length === 0) throw new Error(`no .svg files in ${SRC}`);

const icons = {};

for (const file of files) {
  const name = path.basename(file, '.svg');
  const raw = readFileSync(path.join(SRC, file), 'utf8');

  const viewBox = raw.match(/viewBox="([^"]*)"/)?.[1];
  if (!viewBox) throw new Error(`${file}: no viewBox`);

  // Stroke attributes live on the wrapper in the source and must be carried to
  // the generated wrapper, or every icon renders as an invisible hairline.
  const strokeWidth = raw.match(/stroke-width="([^"]*)"/)?.[1] ?? '1.8';
  const linecap = raw.match(/stroke-linecap="([^"]*)"/)?.[1] ?? 'round';
  const linejoin = raw.match(/stroke-linejoin="([^"]*)"/)?.[1] ?? 'round';

  // Inner markup only — the wrapper is written by the component so every icon
  // gets identical sizing and a11y attributes.
  let inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');

  // The comp exported these with the brand red baked in. Hardcoded strokes must
  // become currentColor or the icons cannot be themed.
  inner = inner.replace(
    /stroke="(#EB3F21|#eb3f21|black|#000000|#000)"/gi,
    'stroke="currentColor"',
  );

  for (const [kebab, camel] of Object.entries(ATTR_MAP)) {
    inner = inner.replace(new RegExp(`${kebab}=`, 'g'), `${camel}=`);
  }

  inner = inner
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => '      ' + l)
    .join('\n');

  icons[name] = {viewBox, inner, strokeWidth, linecap, linejoin};
}

const names = Object.keys(icons).sort();
const first = icons[names[0]];

for (const n of names) {
  if (icons[n].viewBox !== first.viewBox) {
    throw new Error(
      `${n}: viewBox "${icons[n].viewBox}" differs from "${first.viewBox}". ` +
        `These icons are meant to share one grid — fix the source SVG.`,
    );
  }
}

const body = names
  .map(
    (n) => `  ${n}: (
    <>
${icons[n].inner}
    </>
  ),`,
  )
  .join('\n');

const out = `/*
 * Link Card icons.
 *
 * GENERATED — do not hand-edit the path data.
 *
 * To add or change an icon:
 *   1. Drop the .svg into app/assets/link-icons/ (viewBox "${first.viewBox}",
 *      stroked not filled, no hardcoded colour)
 *   2. Run: node scripts/generate-link-icons.mjs
 *   3. Add the name to the \`icon\` enum on the Strapi
 *      \`utilities.link-card\` component so editors can select it.
 *
 * STROKED, unlike SocialIcon which is filled. The stroke attributes sit on the
 * wrapper below so every icon shares one weight; a source file that disagrees
 * about viewBox fails the build rather than rendering at the wrong scale.
 */

const ICONS = {
${body}
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
      viewBox="${first.viewBox}"
      fill="none"
      stroke="currentColor"
      strokeWidth="${first.strokeWidth}"
      strokeLinecap="${first.linecap}"
      strokeLinejoin="${first.linejoin}"
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
`;

writeFileSync(OUT, out);
console.log(`Wrote ${OUT}`);
console.log(`Icons (${names.length}): ${names.join(', ')}`);
