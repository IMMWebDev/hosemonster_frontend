import {Fragment} from 'react';

/** ® and ™, the marks a brand name carries. */
const MARK = /([®™])/;

/**
 * Text from the CMS with its ® and ™ raised — "Hose Monster®" as drawn, with
 * the mark in a <sup>, so editors type the name plainly and never need markup.
 * The <sup>'s size and baseline are the caller's (e.g. `.byline sup`).
 *
 * @param {{text?: string | null}} props
 */
export default function RaisedMarks({text}) {
  if (!text) return null;
  /* eslint-disable react/no-array-index-key -- the pieces of one fixed
   * string, never reordered: the position is the identity. */
  return text
    .split(MARK)
    .map((part, i) =>
      MARK.test(part) ? (
        <sup key={i}>{part}</sup>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
  /* eslint-enable react/no-array-index-key */
}
