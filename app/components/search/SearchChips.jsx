import {Link} from 'react-router';
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
 * }} props
 */
export default function SearchChips({items, label, onNavigate}) {
  if (!items?.length) return null;

  return (
    <ul className={styles.list} role="list" aria-label={label}>
      {items.map((item) => (
        <li key={item.key}>
          <Link
            to={item.to}
            prefetch="intent"
            className={styles.chip}
            onClick={onNavigate}
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
