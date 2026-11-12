import {noteBodyHtml} from '~/lib/cms-note';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import styles from './SpecSheet.module.css';

/**
 * Spec Sheet module — sprint-04 hifi_smartmonsterfeature.html,
 * "Specifications".
 *
 * An eyebrow and heading over a product's specs, label beside value, in two
 * striped cards; then an optional navy note ("Buying note: …"). The specs are
 * one list in the CMS and split evenly here — first half left — so an editor
 * never has to balance two columns by hand.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     background?: 'white' | 'grey',
 *     specs?: Array<{id: number, label: string, value: string}>,
 *     note?: {heading?: string, body?: string} | null,
 *   },
 * }} props
 */
export default function SpecSheet({data}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const {eyebrow, heading, background, note} = data ?? {};

  if (!heading) return null;

  // The shared utilities.note component: Heading in bold at the start of the
  // Body's first paragraph. See lib/cms-note.js.
  const noteHtml = noteBodyHtml(note?.body, {leadIn: note?.heading, trackId});

  const specs = (data.specs ?? []).filter((spec) => spec?.label);
  const half = Math.ceil(specs.length / 2);
  const cards = [specs.slice(0, half), specs.slice(half)].filter(
    (card) => card.length > 0,
  );

  // Only "grey" gets a class; an entry made before the field existed comes
  // back null, which is white.
  const backgroundClass = background === 'grey' ? styles.grey : '';

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          {heading}
        </h2>

        {cards.length > 0 ? (
          <div className={styles.cards}>
            {cards.map((card, c) => (
              /* A description list: each spec is a term and its value, which
               * is what a screen reader should announce. */
              <dl
                className={styles.card}
                key={c === 0 ? 'left' : 'right'}
                data-reveal
                style={{'--reveal-i': c + 2}}
              >
                {card.map((spec, i) => (
                  <div className={styles.row} key={spec.id ?? i}>
                    <dt className={styles.label}>{spec.label}</dt>
                    <dd className={styles.value}>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        ) : null}

        {noteHtml ? (
          <div
            className={`${styles.note} cms-note-body`}
            data-reveal
            style={{'--reveal-i': 4}}
            dangerouslySetInnerHTML={{__html: noteHtml}}
          />
        ) : null}
      </div>
    </section>
  );
}
