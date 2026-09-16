import {useEffect, useState} from 'react';
/*
 * Lives in app/styles/, NOT beside this file. flatRoutes treats every file in
 * app/routes/ as a route module and hands it to the JS parser, so a co-located
 * .module.css fails the build with "Unexpected token" pointing at its first
 * CSS rule.
 */
import styles from '~/styles/styleguide.module.css';

/**
 * Living styleguide — a hardcoded route, NOT a CMS page.
 *
 * ⚠ TEMPORARY. Built so the designer can see how the tokens actually resolve in
 * the browser rather than in Figma. Delete before launch: remove this file and
 * `styleguide.module.css`, and nothing else references them.
 *
 * Values are READ FROM THE LIVE STYLESHEET via getComputedStyle rather than
 * typed in here. That is the whole point — a hardcoded hex would drift the
 * first time someone edits tokens.css and this page would start lying. The
 * names below are the only thing maintained by hand; if a token is renamed it
 * shows as "—" here, which is the signal to update the list.
 */

const COLOR_GROUPS = [
  {
    title: "Brand",
    note:
      "Two colours carry the identity (styleguide \u00a701). Everything else is ink, surface or border.",
    tokens: [
      "--brand-orange",
      "--brand-orange-hover",
      "--brand-navy",
      "--deep-navy-ink",
      "--white",
    ],
  },
  {
    title: "Ink",
    note:
      "Four inks, and only four. Faint is for counts, chevrons and non-text marks \u2014 never body copy.",
    tokens: ["--ink-body", "--ink-muted", "--ink-on-navy", "--ink-faint"],
  },
  {
    title: "Surface & border",
    tokens: ["--neutral-50", "--neutral-100", "--photo-well"],
  },
  {
    title: "Text",
    tokens: [
      "--color-text",
      "--color-text-body",
      "--color-text-muted",
      "--color-text-inverse",
      "--color-text-on-navy",
      "--color-text-accent",
      "--color-text-on-orange",
      "--color-text-faint",
    ],
  },
  {
    title: "Surfaces",
    tokens: [
      "--color-surface",
      "--color-surface-alt",
      "--color-surface-subtle",
      "--color-surface-inverse",
    ],
  },
  {
    title: "Action",
    note: "Buttons and interactive states.",
    tokens: [
      "--color-action",
      "--color-action-hover",
      "--color-action-text",
      "--color-inverse-hover",
      "--color-action-secondary-border",
      "--color-action-secondary-text",
      "--color-action-tertiary-border",
      "--color-action-tertiary-text",
    ],
  },
  {
    title: "Borders",
    tokens: ["--color-border", "--color-border-strong"],
  },
  {
    title: "Still off-palette",
    note:
      "Everything else collapsed onto the four inks. These two are rules on NAVY grounds, where the single #E8E8E8 border is far too loud \u2014 open with design.",
    tokens: ["--hero-meta-rule", "--newsletter-input-border"],
  },
];

const HEADINGS = [
  {tag: "h1", token: "--text-h1", label: "H1 \u00b7 Page headline", sample: "Flow like you mean it"},
  {tag: "h2", token: "--text-h2-lg", label: "H2 large \u00b7 Major section", sample: "What buyers ask us"},
  {tag: "h2", token: "--text-h2", label: "H2 \u00b7 Standard section", sample: "Pick your test"},
  {tag: "h3", token: "--text-h3", label: "H3 \u00b7 Sub-section", sample: "Shop by category"},
];

const BODY_STYLES = [
  {token: "--text-eyebrow", label: "Eyebrow \u00b7 Gopher 700, 0.08em"},
  {token: "--text-body", label: "Body large \u00b7 intro and callout copy"},
  {token: "--text-body-sm", label: "Body \u00b7 standard section copy"},
  {token: "--text-detail", label: "Detail"},
  {token: "--text-card-title", label: "Card title"},
  {token: "--text-price", label: "Price"},
  {token: "--text-button", label: "Button"},
  {token: "--text-ui", label: "UI label"},
];

const WEIGHTS = [
  {token: '--weight-regular', label: 'Regular'},
  {token: '--weight-medium', label: 'Medium'},
  {token: '--weight-bold', label: 'Bold'},
  {token: '--weight-black', label: 'Black'},
];






/**
 * No data to load — this exists only to opt out of the newsletter band.
 *
 * PageLayout shows it unless some route in the match chain says otherwise
 * (useIncludeNewsletter defaults to true), and a marketing sign-up sitting
 * under a token reference page is just noise.
 */
export function loader() {
  return {includeNewsletter: false};
}

export const meta = () => [
  {title: 'Styleguide | Hose Monster'},
  // Never index this. It is an internal reference page that ships temporarily.
  {name: 'robots', content: 'noindex, nofollow'},
];

/**
 * Resolves token names to their computed values, once, after mount.
 *
 * Client-only on purpose: the values live in a stylesheet the server never
 * evaluates, so there is nothing to read during SSR. Returns an empty map on
 * the first render and fills in after paint.
 *
 * @param {string[]} names
 */
function useTokenValues(names) {
  const [values, setValues] = useState({});

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    const next = {};
    for (const name of names) {
      next[name] = root.getPropertyValue(name).trim();
    }
    setValues(next);
    // names is a module-level constant array; re-running on identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return values;
}

const ALL_TOKENS = [
  ...COLOR_GROUPS.flatMap((g) => g.tokens),
  ...HEADINGS.map((h) => h.token),
  ...BODY_STYLES.map((b) => b.token),
  ...WEIGHTS.map((w) => w.token),
  '--font-display',
  '--font-body',
];

export default function Styleguide() {
  const v = useTokenValues(ALL_TOKENS);
  const val = (name) => v[name] || '—';

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <p className={styles.kicker}>Internal reference</p>
        <h1 className={styles.title}>Styleguide</h1>
        <p className={styles.lede}>
          Every design token as the browser actually resolves it. Values are read
          from the live stylesheet, not typed into this page, so it cannot drift
          out of date.
        </p>
        <p className={styles.warning}>
          Temporary page — delete before launch. Not in the CMS, not indexed.
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section id="colour" title="Colour">
        {COLOR_GROUPS.map((group) => (
          <div key={group.title} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            {group.note ? <p className={styles.groupNote}>{group.note}</p> : null}
            <ul className={styles.swatches}>
              {group.tokens.map((token) => (
                <li key={token} className={styles.swatch}>
                  <span
                    className={styles.swatchChip}
                    style={{background: `var(${token})`}}
                  />
                  <code className={styles.swatchName}>{token}</code>
                  <span className={styles.swatchValue}>{val(token)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        id="type"
        title="Typography"
        note={`Display: ${val('--font-display')} · Body: ${val('--font-body')}`}
      >
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Headings</h3>
          {HEADINGS.map(({tag: Tag, token, label, sample}) => (
            <div key={token} className={styles.typeRow}>
              <div className={styles.typeMeta}>
                <strong>{label}</strong>
                <code>{token}</code>
                <span>{val(token)}</span>
              </div>
              <Tag className={styles[`sample${Tag.toUpperCase()}`]}>{sample}</Tag>
            </div>
          ))}
        </div>

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Body &amp; UI</h3>
          {BODY_STYLES.map(({token, label}) => (
            <div key={token} className={styles.typeRow}>
              <div className={styles.typeMeta}>
                <strong>{label}</strong>
                <code>{token}</code>
                <span>{val(token)}</span>
              </div>
              <p style={{fontSize: `var(${token})`, margin: 0}}>
                Gear for flow testing fire hydrants, fire pumps and standpipes.
              </p>
            </div>
          ))}
        </div>

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Weights</h3>
          <ul className={styles.tokenList}>
            {WEIGHTS.map(({token, label}) => (
              <li key={token}>
                <span style={{fontWeight: `var(${token})`}}>{label}</span>
                <code>{token}</code>
                <span>{val(token)}</span>
              </li>
            ))}
          </ul>
        </div>

      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        id="buttons"
        title="Buttons"
        note="One geometry, five fills — 19px / 700 Gopher, min-height 56px, padding 0 32px, 250ms. The 19px is an accessibility constraint, not a preference: white on orange measures 3.99:1 and only clears AA as large text."
      >
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>On light grounds</h3>
          <div className={styles.buttonRow}>
            <button type="button" className="btn btn--primary">
              Primary
            </button>
            <button type="button" className="btn btn--secondary">
              Secondary
            </button>
            <button type="button" className="btn btn--tertiary">
              Tertiary
            </button>
            <button type="button" className="btn btn--primary" disabled>
              Disabled
            </button>
          </div>
        </div>

        <div className={`${styles.group} ${styles.onNavy}`}>
          <h3 className={styles.groupTitle}>On navy</h3>
          <p className={styles.groupNote}>
            Not a case the styleguide covers. Primary holds up because its fill
            is its own colour; secondary keeps a white fill here rather than the
            specced transparent one, or it would vanish.
          </p>
          <div className={styles.buttonRow}>
            <button type="button" className="btn btn--primary">
              Primary
            </button>
            <button type="button" className="btn btn--secondary">
              Secondary
            </button>
          </div>
        </div>

        <div className={`${styles.group} ${styles.onRed}`}>
          <h3 className={styles.groupTitle}>On orange</h3>
          <p className={styles.groupNote}>
            The two fills the styleguide draws. Plain .btn--primary is not one of
            them — an orange fill on an orange band is an invisible button.
          </p>
          <div className={styles.buttonRow}>
            <button type="button" className="btn btn--inverse">
              Primary on orange
            </button>
            <button type="button" className="btn btn--secondary-on-orange">
              Secondary on orange
            </button>
          </div>
        </div>
      </Section>

            {/* ---------------------------------------------------------------- */}
      <Section id="links" title="Links">
        <div className={styles.group}>
          <p>
            A standard <a href="#links">inline link</a> in body copy. Hover turns
            it orange — which §09 now forbids at this size, and supplies no
            replacement for. Open question for design.
          </p>
          <p>
            <a href="#links" aria-current="page">
              A link marked aria-current=&quot;page&quot;
            </a>{' '}
            — this is the state the nav underline hangs off.
          </p>
        </div>
      </Section>

    </div>
  );
}

/**
 * @param {{id: string, title: string, note?: string, children: React.ReactNode}} props
 */
function Section({id, title, note, children}) {
  return (
    <section className={styles.section} id={id}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {note ? <p className={styles.sectionNote}>{note}</p> : null}
      {children}
    </section>
  );
}
