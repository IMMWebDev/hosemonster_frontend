import {useId} from 'react';
import styles from './QuantityStepper.module.css';

/**
 * A quantity control: − / typed number / +.
 *
 * `value` may be '' while the visitor is clearing the field to retype; it
 * settles back to `min` on blur. `onChange` fires on every change (typing
 * included); `onCommit` fires only when a value is settled — a ± click, Enter,
 * or leaving the field — which is what the cart submits on, so a half-typed
 * "1" never becomes a request.
 *
 * Two sizes: the product page's 56px control, and a 44px `compact` one for a
 * cart line, where it sits beside the price.
 *
 * @param {{
 *   value: number | '',
 *   onChange: (value: number | '') => void,
 *   onCommit?: (value: number) => void,
 *   disabled?: boolean,
 *   min?: number,
 *   max?: number,
 *   size?: 'default' | 'compact',
 *   label?: string,
 * }} props
 */
export default function QuantityStepper({
  value,
  onChange,
  onCommit,
  disabled,
  min = 1,
  max = 999,
  size = 'default',
  label = 'Quantity',
}) {
  const id = useId();
  const n = clamp(Number(value) || min, min, max);

  const settle = (next) => {
    const v = clamp(next, min, max);
    onChange(v);
    onCommit?.(v);
  };

  return (
    <div className={styles.qty} data-size={size}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <button
        type="button"
        className={styles.button}
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || n <= min}
        onClick={() => settle(n - 1)}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className={styles.input}
        value={value}
        disabled={disabled}
        // Empty while typing is allowed; it settles back on blur.
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange('');
          const parsed = Number.parseInt(raw, 10);
          onChange(Number.isFinite(parsed) ? clamp(parsed, min, max) : min);
        }}
        onBlur={() => settle(value === '' ? min : Number(value))}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          // Settle here rather than submitting a surrounding form.
          e.preventDefault();
          settle(value === '' ? min : Number(value));
        }}
      />
      <button
        type="button"
        className={styles.button}
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || n >= max}
        onClick={() => settle(n + 1)}
      >
        +
      </button>
    </div>
  );
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
