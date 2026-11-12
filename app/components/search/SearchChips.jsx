import {Link} from 'react-router';
import {useTrackId} from '~/lib/tracking';
import styles from './SearchChips.module.css';

/**
 * A row of pill links — categories, pages.
 *
 * Same geometry as the §07 applied-filter chip (44px, 2px border, the pill
 * radius §06 reserves for buttons and chips), so every chip on the search
 * surfaces reads as one family. The difference is the ink: these are links, so
 * they are navy rather than body grey, and carry an arrow where a filter chip
 * carries its ×.
 *
 * @param {{
 *   items: Array<{key: string, label: string, to: string}>,
 *   label?: string,
 *   onNavigate?: () => void,
 *   trackRole?: string,
 * }} props
 *
 * `trackRole` prefixes each chip's analytics role with its 1-based position
 * ("related-category" → related-category-1, -2…). Give each row in one module
 * its own prefix, or their chips share ids — see app/lib/tracking.js.
 */
export default function SearchChips({
  items,
  label,
  onNavigate,
  trackRole = 'chip',
}) {
  const trackId = useTrackId();
  if (!items?.length) return null;

  return (
    <ul className={styles.list} role="list" aria-label={label}>
      {items.map((item, i) => (
        <li key={item.key}>
          <Link
            to={item.to}
            prefetch="intent"
            className={styles.chip}
            onClick={onNavigate}
            data-track-id={trackId(`${trackRole}-${i + 1}`)}
          >
            <span>{item.label}</span>
            <ArrowIcon />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ArrowIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
