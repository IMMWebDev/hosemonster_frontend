import {Fragment, useEffect, useId, useMemo, useReducer, useRef, useState} from 'react';
import {BUNDLE_ATTRIBUTE, toCartLine} from '~/lib/cart-lines';
import {useSearchParams} from 'react-router';
import {CartForm, Image, Money} from '@shopify/hydrogen';
import CmsLink from '~/components/cms/CmsLink';
import {useAside} from '~/components/Aside';
import {
  OVER_MAX,
  REVIEW_LABEL,
  URL_PARAM,
  answerItems,
  buildModel,
  choiceAvailability,
  choicePrice,
  cleanName,
  computeBundle,
  decodeState,
  encodeState,
  picked,
  previewChoice,
  repairAnswers,
  rowFor,
  rowLabel,
} from '~/lib/bundle-builder';
import styles from './BundleBuilder.module.css';

/**
 * Bundle Builder module — a step-by-step configurator (the Fire Pump Test
 * Bundle Builder first).
 *
 * The steps, choices and product rules live in a Strapi `bundle-builder`
 * entry this module points at; products, variants and prices come live from
 * Shopify (fetched by the route through getModuleProducts). The logic — lines,
 * quantities, which choices are possible, which variant each product uses —
 * is all in ~/lib/bundle-builder.js; this file is only the interface.
 *
 * Layout, following the configurator patterns shoppers already know (Apple,
 * Dell, Trek):
 *  - One step at a time under a single-row stepper (a progress bar above the
 *    step title on narrower screens).
 *  - "Your bundle" beside the step (below it on narrow screens): what's been
 *    picked, grouped by step with an Edit link each, the running total, what's
 *    left to choose, and Start over — reset lives with the thing it clears.
 *  - The step's Next button says where it goes, and when it can't be pressed
 *    the line beside it says what's still needed.
 *  - The last step reviews the whole bundle and adds it to the cart in one go.
 * Nothing is chosen for the visitor. Each choice shows what it adds and costs
 * for the chosen pump; anything that can't combine with an earlier answer is
 * shown disabled with the reason rather than silently dropped.
 *
 * The configuration is written to the page URL (`?bundle=…`) as it changes, so
 * a built bundle can be bookmarked or sent to someone, and survives a reload.
 *
 * @param {{
 *   data: {eyebrow?: string, heading?: string, body?: string, builder?: object},
 *   products?: Record<string, object>,
 * }} props
 */
export default function BundleBuilder({data, products = {}}) {
  const builder = data?.builder;
  const model = useMemo(() => buildModel(builder), [builder]);
  const [searchParams] = useSearchParams();
  const {open} = useAside();

  const [state, dispatch] = useReducer(
    (current, action) => reduce(current, action, model, products),
    null,
    () =>
      repairAnswers(model, decodeState(searchParams.get(URL_PARAM), model), products),
  );

  const stepCount = model.steps.length;
  const [step, setStep] = useState(0);
  // A bundle opened from a shared link has its answers already: every step up
  // to the first unfinished one (or the review, if none) is reachable at once.
  const [furthest, setFurthest] = useState(() => {
    const open = model.steps.findIndex(
      (s) => !s.questions.every((q) => questionAnswered(q, state, model, products)),
    );
    return open === -1 ? stepCount : open;
  });
  const interacted = useRef(Boolean(searchParams.get(URL_PARAM)));
  const headingRef = useRef(null);
  const progressRef = useRef(null);
  // The step the effect below last acted on. A "first render" flag doesn't
  // survive StrictMode, which runs mount effects twice in dev: the second run
  // scrolled every fresh page load down to the builder.
  const prevStep = useRef(step);

  const bundle = useMemo(
    () => computeBundle(model, state, products),
    [model, state, products],
  );

  // Keep the URL in step with the configuration, without a navigation — a
  // navigation would re-run the page loader on every click. History state is
  // passed through untouched: React Router keeps its own keys in it.
  useEffect(() => {
    if (!interacted.current) return;
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, encodeState(state));
    window.history.replaceState(window.history.state, '', url);
  }, [state]);

  // A new step: bring its heading into view when it is off screen — above
  // (Next pressed at the bottom of a long step) or well down the page (Next
  // pressed with the hero still showing) — and move focus to it so keyboard
  // and screen-reader users start there. The heading's scroll-margin clears
  // the sticky header.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    const heading = headingRef.current;
    if (!heading) return;
    const {top} = heading.getBoundingClientRect();
    if (top < 120 || top > window.innerHeight * 0.6) {
      heading.scrollIntoView({block: 'start'});
    }
    heading.focus({preventScroll: true});
    // On a phone the step list scrolls sideways; keep the current step in it.
    progressRef.current
      ?.querySelector('[aria-current]')
      ?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }, [step]);

  if (!builder || stepCount === 0) return null;

  const act = (action) => {
    interacted.current = true;
    dispatch(action);
  };

  const goTo = (n) => {
    const next = Math.max(0, Math.min(stepCount, n));
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  };

  const started =
    state.gpm != null ||
    (state.touched ?? []).length > 0 ||
    Object.keys(state.overrides ?? {}).length > 0;

  // Back to a blank builder: every answer cleared and ?bundle= taken off the
  // URL, so a reload or a shared link doesn't bring the old bundle back.
  const restart = () => {
    if (!window.confirm('Clear all your choices and start over?')) return;
    interacted.current = false;
    dispatch({type: 'reset'});
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    window.history.replaceState(window.history.state, '', url);
    setFurthest(0);
    if (step === 0) headingRef.current?.focus();
    else setStep(0);
  };

  const isReview = step === stepCount;
  const current = model.steps[step];
  const stepComplete = (s) =>
    model.steps[s].questions.every((q) => questionAnswered(q, state, model, products));
  const titles = [...model.steps.map((s) => s.title), REVIEW_LABEL];
  const blocker = isReview ? null : stepBlocker(current, state, model, products);
  const override = (entryKey, variantId) => act({type: 'override', entryKey, variantId});

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {data.heading ? (
          <div className={styles.intro}>
            {data.eyebrow ? <p className={styles.eyebrow}>{data.eyebrow}</p> : null}
            <h2 className={styles.heading}>{data.heading}</h2>
            {data.body ? <p className={styles.body}>{data.body}</p> : null}
          </div>
        ) : null}

        <nav className={styles.progress} aria-label="Bundle builder steps">
          <ol
            className={styles.progressList}
            ref={progressRef}
            style={{'--steps': titles.length}}
          >
            {titles.map((title, i) => {
              const done = i < stepCount && stepComplete(i) && i < furthest;
              const reachable = i <= furthest;
              return (
                <li key={title + i} data-reached={reachable ? '' : undefined}>
                  <button
                    type="button"
                    className={styles.progressStep}
                    data-state={i === step ? 'current' : done ? 'done' : 'todo'}
                    aria-current={i === step ? 'step' : undefined}
                    disabled={!reachable}
                    onClick={() => goTo(i)}
                  >
                    <span className={styles.progressNumber} aria-hidden="true">
                      {done && i !== step ? <CheckIcon /> : i + 1}
                    </span>
                    <span className={styles.progressLabel}>{title}</span>
                    {done ? <span className="sr-only">, completed</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={`${styles.layout} ${isReview ? styles.layoutReview : ''}`}>
          <div className={styles.main}>
            <div className={styles.stepHead}>
              {/* Stands in for the stepper where it doesn't fit. */}
              <div className={styles.meter} aria-hidden="true">
                <span style={{'--progress': (step + 1) / titles.length}} />
              </div>
              <p className={styles.stepCount}>
                {isReview ? 'Last step' : `Step ${step + 1} of ${stepCount}`}
              </p>
              <h3 className={styles.stepTitle} ref={headingRef} tabIndex={-1}>
                {isReview ? 'Review your bundle' : current.title}
              </h3>
              {!isReview && current.description ? (
                <p className={styles.stepDescription}>{current.description}</p>
              ) : null}
            </div>

            {isReview ? (
              <Summary
                full
                model={model}
                bundle={bundle}
                state={state}
                currentStep={step}
                onOverride={override}
                onAdd={() => open('cart')}
                onEdit={goTo}
                onRestart={started ? restart : null}
              />
            ) : (
              <div className={styles.questions}>
                {current.questions.map((q) => (
                  <Question
                    key={q.key}
                    q={q}
                    qIndex={model.questions.indexOf(q)}
                    model={model}
                    state={state}
                    products={products}
                    act={act}
                  />
                ))}
              </div>
            )}

            <div className={styles.nav} data-first={step === 0 ? '' : undefined}>
              {step > 0 ? (
                <button
                  type="button"
                  className={`btn btn--tertiary ${styles.navBack}`}
                  onClick={() => goTo(step - 1)}
                >
                  Back
                </button>
              ) : null}
              {/* Why Next can't be pressed yet, rather than a dead button. The
                  live region stays mounted so the change is announced; the
                  visible line only takes up room when there's something to say. */}
              <span className="sr-only" aria-live="polite">
                {blocker}
              </span>
              {blocker ? (
                <p className={styles.navHint} aria-hidden="true">
                  {blocker}
                </p>
              ) : null}
              {!isReview ? (
                <button
                  type="button"
                  className={`btn btn--primary ${styles.navNext}`}
                  disabled={Boolean(blocker) || !stepComplete(step)}
                  onClick={() => goTo(step + 1)}
                >
                  {step === stepCount - 1 ? (
                    'Review bundle'
                  ) : (
                    <>
                      Next<span className={styles.nextTitle}>: {titles[step + 1]}</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>

          {!isReview ? (
            <div className={styles.side}>
              <Summary
                model={model}
                bundle={bundle}
                state={state}
                currentStep={step}
                onOverride={override}
                onAdd={() => open('cart')}
                onEdit={goTo}
                onReview={() => goTo(stepCount)}
                onRestart={started ? restart : null}
              />
            </div>
          ) : null}
        </div>

        {/* Narrow screens: the summary sits below the step, so the running
            total stays in reach on a bar pinned to the bottom of the view. */}
        {!isReview ? (
          <div className={styles.mobileBar}>
            <div className={styles.mobileTotal}>
              <span className={styles.mobileTotalLabel}>
                {bundle.complete
                  ? `${bundle.items.length} ${bundle.items.length === 1 ? 'item' : 'items'}`
                  : choicesLeft(bundle)}
              </span>
              <strong>
                <Price amount={bundle.subtotal} currencyCode={bundle.currencyCode} />
              </strong>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => goTo(stepCount)}
              disabled={furthest < stepCount && !bundle.complete}
            >
              Review
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* State                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * @param {object} current
 * @param {object} action
 * @param {ReturnType<typeof buildModel>} model
 * @param {Record<string, object>} products
 */
function reduce(current, action, model, products) {
  const touched = new Set(current.touched ?? []);
  let next = current;

  switch (action.type) {
    case 'rating':
      next = {...current, gpm: action.gpm};
      break;
    case 'choose':
      touched.add(action.key);
      next = {
        ...current,
        answers: {...current.answers, [action.key]: action.choice},
        touched: [...touched],
      };
      break;
    case 'toggle': {
      touched.add(action.key);
      const list = picked(current.answers, action.key);
      const answer = list.includes(action.choice)
        ? list.filter((c) => c !== action.choice)
        : [...list, action.choice].sort((a, b) => a - b);
      next = {
        ...current,
        answers: {...current.answers, [action.key]: answer},
        touched: [...touched],
      };
      break;
    }
    case 'override':
      return {
        ...current,
        overrides: {...current.overrides, [action.entryKey]: action.variantId},
      };
    case 'reset':
      next = decodeState(null, model);
      break;
    default:
      return current;
  }
  return repairAnswers(model, next, products);
}

/**
 * @param {object} q
 * @param {object} state
 * @param {ReturnType<typeof buildModel>} model
 * @param {Record<string, object>} products
 */
function questionAnswered(q, state, model, products) {
  if (q.questionType === 'pumpRating') return Boolean(rowFor(model, state.gpm));
  // A picked product with an option still to choose (a gauge's PSI range)
  // leaves the question open, optional or not.
  const qIndex = model.questions.indexOf(q);
  if (answerItems(model, state, products, qIndex).some((i) => i.choosable)) return false;
  if (q.isRequired === false) return true;
  return picked(state.answers, q.key).length > 0;
}

/**
 * What the visitor still has to do on this step before Next, in words — or
 * null when the step is done.
 *
 * @param {object} step
 * @param {object} state
 * @param {ReturnType<typeof buildModel>} model
 * @param {Record<string, object>} products
 * @returns {string | null}
 */
function stepBlocker(step, state, model, products) {
  for (const q of step.questions) {
    if (questionAnswered(q, state, model, products)) continue;
    // Over the table's top rating: the step shows the contact message instead.
    if (q.questionType === 'pumpRating') {
      return state.gpm === OVER_MAX ? null : 'Choose your pump rating to continue';
    }
    const open = answerItems(model, state, products, model.questions.indexOf(q)).find(
      (i) => i.choosable,
    );
    return open
      ? `Choose the ${open.pendingOption.toLowerCase()} to continue`
      : `Choose ${q.title.toLowerCase()} to continue`;
  }
  return null;
}

/**
 * "5 choices left" — questions not answered plus product options not chosen.
 *
 * @param {ReturnType<typeof computeBundle>} bundle
 */
function choicesLeft(bundle) {
  const n = bundle.missing.length + bundle.toChoose.length;
  return `${n} ${n === 1 ? 'choice' : 'choices'} left`;
}

/* -------------------------------------------------------------------------- */
/* Questions                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @param {{q: object, qIndex: number, model: object, state: object, products: object, act: Function}} props
 */
function Question({q, qIndex, model, state, products, act}) {
  const fieldsetRef = useRef(null);
  if (q.questionType === 'pumpRating') {
    return <PumpRating q={q} model={model} state={state} act={act} />;
  }

  const multiple = q.selection === 'multiple';
  const chosen = picked(state.answers, q.key);
  const availability = q.choices.map((_, c) =>
    choiceAvailability(model, state, products, qIndex, c),
  );
  // Options of the picked products that nothing else sets — the visitor
  // chooses them here, where they picked the product. Items still waiting on
  // a later question (the thread) get theirs once it's answered.
  const pickers = answerItems(model, state, products, qIndex).filter(
    (i) => i.freeOptions.length > 0 && (i.choosable || !i.pendingOption),
  );

  // Pills can't hold a reason the way a card does, so the reasons are listed
  // once under the group — visible without hover, and readable in order.
  const chipReasons = {};
  if (q.questionType === 'variant') {
    q.choices.forEach((choice, c) => {
      const {available, reason} = availability[c];
      if (available || !reason) return;
      (chipReasons[reason] ??= []).push(choice.label);
    });
  }

  return (
    <fieldset className={styles.question} ref={fieldsetRef} tabIndex={-1}>
      <legend className={styles.legend}>
        <span className={styles.questionTitle}>{q.title}</span>
        {q.badge ? <span className={styles.badge}>{q.badge}</span> : null}
        {q.isRequired === false && !q.badge ? (
          <span className={styles.badgeQuiet}>Optional</span>
        ) : null}
      </legend>

      <Info text={q.infoBubble} />

      <div
        className={
          q.questionType === 'variant' ? styles.chipGroup : styles.choiceGrid
        }
      >
        {q.choices.map((choice, c) => {
          const selected = chosen.includes(c);
          // What this pick would really do — priced after later answers are
          // repaired, with any change to them spelled out on the card.
          const preview =
            q.questionType === 'product' && availability[c].available
              ? previewChoice(model, state, products, qIndex, c)
              : null;

          const onChange = () =>
            multiple
              ? act({type: 'toggle', key: q.key, choice: c})
              : act({type: 'choose', key: q.key, choice: c});

          return q.questionType === 'variant' ? (
            <VariantChip
              key={choice.id ?? c}
              name={q.key}
              choice={choice}
              selected={selected}
              availability={availability[c]}
              onChange={onChange}
            />
          ) : (
            <ChoiceCard
              key={choice.id ?? c}
              name={q.key}
              multiple={multiple}
              choice={choice}
              selected={selected}
              availability={availability[c]}
              res={preview?.res ?? null}
              changes={selected ? [] : (preview?.changes ?? [])}
              onChange={onChange}
            />
          );
        })}
      </div>

      {Object.keys(chipReasons).length ? (
        <ul className={styles.chipReasons} role="list">
          {Object.entries(chipReasons).map(([reason, labels]) => (
            <li key={reason}>
              {labels.join(', ')}: {reason.charAt(0).toLowerCase() + reason.slice(1)}
            </li>
          ))}
        </ul>
      ) : null}

      {pickers.length ? (
        <div className={styles.pickers}>
          {pickers.map((item) => (
            <OptionPicker
              key={item.entryKey}
              item={item}
              onChange={(variantId) =>
                act({type: 'override', entryKey: item.entryKey, variantId})
              }
            />
          ))}
        </div>
      ) : null}

      {q.isRequired === false && !multiple && chosen.length > 0 ? (
        <button
          type="button"
          className={styles.textButton}
          onClick={() => {
            act({type: 'choose', key: q.key, choice: null});
            // The button disappears with the selection; keep focus in the
            // question rather than dropping it to the top of the page.
            fieldsetRef.current?.focus();
          }}
        >
          Clear selection
        </button>
      ) : null}

      {q.helpLink ? (
        <p className={styles.helpLink}>
          <CmsLink link={q.helpLink} className={styles.link} />
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * @param {{q: object, model: object, state: object, act: Function}} props
 */
function PumpRating({q, model, state, act}) {
  const id = useId();
  const row = rowFor(model, state.gpm);
  const max = model.rows[model.rows.length - 1];
  const overLabel =
    model.overMaxLabel ||
    (model.overMaxMessage && max ? `More than ${rowLabel(max)}` : '');

  return (
    <div className={styles.question}>
      <label htmlFor={id} className={styles.legend}>
        <span className={styles.questionTitle}>{q.title}</span>
        {q.badge ? <span className={styles.badge}>{q.badge}</span> : null}
      </label>
      <Info text={q.infoBubble} />

      <select
        id={id}
        className={styles.select}
        value={state.gpm ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          act({type: 'rating', gpm: v === '' ? null : v === OVER_MAX ? OVER_MAX : Number(v)});
        }}
      >
        <option value="">Choose your pump’s rated capacity</option>
        {model.rows.map((r) => (
          <option key={r.pumpGpm} value={r.pumpGpm}>
            {rowLabel(r)}
          </option>
        ))}
        {overLabel ? <option value={OVER_MAX}>{overLabel}</option> : null}
      </select>

      {/* Always mounted: a live region inserted already holding text is not
          announced, so the first rating picked used to be read out as
          nothing. */}
      <div aria-live="polite">
      {row ? (
        <div className={styles.readout}>
          <p className={styles.readoutLines}>
            <strong>{row.lines}</strong> test {row.lines === 1 ? 'line' : 'lines'}
          </p>
          <ul className={styles.readoutFlows} role="list">
            {row.flowPerLine100 ? (
              <li>
                100% test: {row.streams100 ?? row.lines} of {row.lines} flowing at{' '}
                {row.flowPerLine100} GPM each
              </li>
            ) : null}
            {row.flowPerLine150 ? (
              <li>
                150% test: all {row.lines} flowing at {row.flowPerLine150} GPM each
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {state.gpm === OVER_MAX ? (
        <div className={styles.overMax}>
          {model.overMaxMessage ? <p>{model.overMaxMessage}</p> : null}
          {model.overMaxLink ? (
            <CmsLink link={model.overMaxLink} className="btn btn--secondary" />
          ) : null}
        </div>
      ) : null}
      </div>
    </div>
  );
}

/**
 * The client's "info bubble". A native disclosure: it works before hydration,
 * is keyboard- and screen-reader-friendly out of the box, and on a phone opens
 * in place rather than as a hover tooltip nobody can reach.
 *
 * @param {{text?: string}} props
 */
function Info({text}) {
  if (!text) return null;
  return (
    <details className={styles.info}>
      <summary className={styles.infoToggle}>
        <InfoIcon />
        <span>Why this matters</span>
      </summary>
      <p className={styles.infoText}>{text}</p>
    </details>
  );
}

/**
 * @param {{
 *   name: string, multiple: boolean, choice: object, selected: boolean,
 *   availability: {available: boolean, reason: string},
 *   res: ReturnType<typeof resolveChoice> | null, onChange: () => void,
 * }} props
 */
function ChoiceCard({name, multiple, choice, selected, availability, res, changes = [], onChange}) {
  const disabled = !availability.available;
  const first = res?.items?.[0];
  const image = first?.variant?.image ?? first?.product?.featuredImage;
  const price = res ? choicePrice(res) : null;
  // Whenever more than one of anything goes in, spell out "2 × $807" so the
  // total isn't read as the price of one.
  const breakdown =
    price?.total != null && res.items.some((i) => i.quantity > 1)
      ? res.items.filter((i) => i.quantity)
      : null;
  // "Coming soon" is usually the badge too — don't say it twice.
  const showReason = disabled && !(choice.comingSoon && choice.badge);

  return (
    <label
      className={styles.card}
      data-selected={selected ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <input
        type={multiple ? 'checkbox' : 'radio'}
        name={name}
        className={styles.hiddenInput}
        checked={selected}
        disabled={disabled}
        onChange={onChange}
      />
      <span className={styles.cardMedia} aria-hidden="true">
        {image?.url ? (
          <Image data={image} width={72} height={72} sizes="72px" alt="" className={styles.cardImage} />
        ) : (
          <span className={styles.cardMediaEmpty} />
        )}
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>{choice.label}</span>
          {choice.badge ? (
            <span className={styles.badge}>{choice.badge}</span>
          ) : null}
        </span>
        {choice.description ? (
          <span className={styles.cardDescription}>{choice.description}</span>
        ) : null}
        <span className={styles.cardPrice}>
          {disabled ? (
            showReason ? <span className={styles.reason}>{availability.reason}</span> : null
          ) : !price ? (
            'Nothing added'
          ) : price.total == null ? (
            <span className={styles.muted}>Price depends on your pump rating</span>
          ) : (
            <>
              {price.from ? 'From ' : 'Adds '}
              <Price amount={price.total} currencyCode={price.currencyCode} />
              {breakdown ? (
                <span className={styles.muted}>
                  {' ('}
                  {breakdown.map((i, k) => (
                    <Fragment key={i.entryKey}>
                      {k ? ' + ' : ''}
                      {i.quantity} × <Price amount={unitPrice(i)} currencyCode={price.currencyCode} />
                    </Fragment>
                  ))}
                  {')'}
                </span>
              ) : null}
            </>
          )}
        </span>
        {changes.length ? (
          <span className={styles.cardChanges}>{changes.join('. ')}</span>
        ) : null}
      </span>
      <span className={styles.check} aria-hidden="true">
        <CheckIcon />
      </span>
    </label>
  );
}

/**
 * @param {{name: string, choice: object, selected: boolean, availability: object, onChange: () => void}} props
 */
function VariantChip({name, choice, selected, availability, onChange}) {
  const disabled = !availability.available;
  return (
    <label
      className={styles.chip}
      data-selected={selected ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <input
        type="radio"
        name={name}
        className={styles.hiddenInput}
        checked={selected}
        disabled={disabled}
        onChange={onChange}
      />
      <span>{choice.label}</span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Summary + cart                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The running bundle: beside the steps (compact), and as the review step
 * (`full`, where every product option can still be set or changed).
 *
 * Items are grouped under the step that added them, each group with an Edit
 * link back to its step — the quickest way to change one answer, and on
 * narrow screens (no stepper) the way to jump back.
 *
 * @param {{
 *   full?: boolean, model: object, bundle: ReturnType<typeof computeBundle>,
 *   state: object, currentStep: number, onOverride: Function, onAdd: Function,
 *   onEdit: (step: number) => void, onReview?: Function, onRestart?: Function | null,
 * }} props
 */
function Summary({
  full = false,
  model,
  bundle,
  state,
  currentStep,
  onOverride,
  onAdd,
  onEdit,
  onReview,
  onRestart,
}) {
  const {row, items, subtotal, currencyCode, unavailable, missing, toChoose, complete} =
    bundle;
  const addable = items.filter((i) => !i.pendingOption && i.variant.availableForSale);
  const bundleLabel = row ? `${model.name} · ${rowLabel(row)}` : model.name;
  const meta = row
    ? `${rowLabel(row)} pump · ${row.lines} test ${row.lines === 1 ? 'line' : 'lines'}`
    : state.gpm === OVER_MAX
      ? 'Custom bundle — contact us'
      : 'Choose your pump rating to see quantities';
  const stillToChoose = [
    ...missing.map((q) => q.title),
    ...toChoose.map((i) => `${i.pendingOption} for ${i.displayTitle ?? i.product.title}`),
  ];

  // Entry keys start with the step index ("2.0:1:0").
  /** @type {Array<{step: number, title: string, items: object[]}>} */
  const groups = [];
  for (const item of items) {
    const s = Number(String(item.entryKey).split('.')[0]);
    let group = groups.find((g) => g.step === s);
    if (!group) {
      group = {step: s, title: model.steps[s]?.title ?? '', items: []};
      groups.push(group);
    }
    group.items.push(item);
  }
  groups.sort((x, y) => x.step - y.step);

  /*
   * Each line tagged with the bundle it came from, so the cart can show them
   * as a set. toCartLine carries the product into selectedVariant, which is
   * what Hydrogen's optimistic cart draws the line from while the request is
   * in flight — without it every line logs an error and the drawer opens
   * empty.
   */
  const lines = addable.map((i) =>
    toCartLine({
      product: i.product,
      variant: i.variant,
      quantity: i.quantity,
      attributes: [{key: BUNDLE_ATTRIBUTE, value: bundleLabel}],
    }),
  );

  return (
    <div
      className={`${styles.summary} ${full ? styles.summaryFull : ''}`}
      role="region"
      aria-label="Your bundle"
    >
      <div className={styles.summaryHead}>
        {/* On the review step the page heading already says "Review your
            bundle"; the pump line leads instead of a second title. */}
        <div className={styles.summaryTitleRow}>
          {full ? (
            <p className={styles.summaryMetaLead}>{meta}</p>
          ) : (
            <h4 className={styles.summaryTitle}>Your bundle</h4>
          )}
          {onRestart ? (
            <button type="button" className={styles.restart} onClick={onRestart}>
              <RestartIcon />
              Start over
            </button>
          ) : null}
        </div>
        {full ? null : <p className={styles.summaryMeta}>{meta}</p>}
      </div>

      {groups.length ? (
        <div className={styles.groups}>
          {groups.map((group) => (
            <div key={group.step} className={styles.group}>
              <div className={styles.groupHead}>
                <h5 className={styles.groupTitle}>{group.title}</h5>
                {group.step !== currentStep ? (
                  <button
                    type="button"
                    className={styles.editLink}
                    onClick={() => onEdit(group.step)}
                  >
                    Edit<span className="sr-only"> {group.title}</span>
                  </button>
                ) : null}
              </div>
              <ul className={styles.items} role="list">
                {group.items.map((item) => (
                  <SummaryItem
                    key={item.entryKey}
                    item={item}
                    full={full}
                    onOverride={onOverride}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Your choices will appear here as you build.</p>
      )}

      <div className={styles.subtotal}>
        <span>Subtotal</span>
        <strong>
          <Price amount={subtotal} currencyCode={currencyCode} />
        </strong>
      </div>

      {/* Beside the steps a count is enough (the stepper shows where); the
          review spells out exactly what's left. */}
      {stillToChoose.length ? (
        <p className={styles.status}>
          {full ? `Still to choose: ${stillToChoose.join(', ')}.` : `${choicesLeft(bundle)}.`}
          {items.some((i) => i.pendingOption)
            ? ' “From” prices aren’t in the subtotal until they’re final.'
            : ''}
        </p>
      ) : null}

      {unavailable.length ? (
        <p className={styles.notice}>
          {unavailable.length === 1 ? '1 item' : `${unavailable.length} items`} can’t be
          bought online yet and won’t be added to the cart
          {full ? `: ${unavailable.map((i) => i.product.title).join(', ')}` : ''}. Contact us
          to order {unavailable.length === 1 ? 'it' : 'them'}.
        </p>
      ) : null}

      {/*
        One LinesAdd for the whole bundle, each line tagged with the bundle it
        came from so it reads as a set in the cart and in the order. Items
        Shopify won't sell online are left out and listed above — sending
        them would fail the whole request. One shared fetcher key, so the side
        summary and the review screen see the same in-flight add.
      */}
      <CartForm
        route="/cart"
        fetcherKey="bundle-builder-add"
        inputs={{lines}}
        action={CartForm.ACTIONS.LinesAdd}
      >
        {(fetcher) => {
          const problems = [
            ...(fetcher.data?.errors ?? []),
            ...(fetcher.data?.warnings ?? []),
          ];
          return (
            <>
              <button
                type="submit"
                className={`btn btn--primary ${styles.addButton}`}
                disabled={!complete || lines.length === 0 || fetcher.state !== 'idle'}
                onClick={onAdd}
              >
                {fetcher.state !== 'idle' ? 'Adding…' : 'Add bundle to cart'}
              </button>
              {fetcher.state === 'idle' && problems.length ? (
                <p className={styles.notice} role="alert">
                  Some items couldn’t be added:{' '}
                  {problems.map((p) => p.message).filter(Boolean).join(' ')}
                </p>
              ) : null}
            </>
          );
        }}
      </CartForm>

      {!full && complete && onReview ? (
        <button type="button" className={styles.textButton} onClick={onReview}>
          Review the full bundle
        </button>
      ) : null}
    </div>
  );
}

/**
 * One product option to choose — a gauge's PSI range, whether the tach comes
 * calibrated. Starts on "Choose …": nothing is picked for the visitor.
 *
 * @param {{item: object, onChange: (variantId: string) => void}} props
 */
function OptionPicker({item, onChange}) {
  const id = useId();
  const names = item.freeOptions.map(cleanName).join(', ');
  return (
    <div className={styles.picker}>
      <label htmlFor={id} className={styles.pickerLabel}>
        {names} <span className={styles.muted}>for {item.displayTitle ?? item.product.title}</span>
      </label>
      <VariantSelect
        id={id}
        item={item}
        className={styles.select}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * @param {{id: string, item: object, className: string, onChange: (variantId: string) => void}} props
 */
function VariantSelect({id, item, className, onChange}) {
  const names = item.freeOptions.map((n) => cleanName(n).toLowerCase());
  const label = (v) =>
    v.selectedOptions
      .filter((o) => names.includes(cleanName(o.name).toLowerCase()))
      .map((o) => o.value)
      .join(' / ') || v.title;
  return (
    <select
      id={id}
      className={className}
      value={item.choosable ? '' : item.variant.id}
      onChange={(e) => onChange(e.target.value)}
    >
      {item.choosable ? (
        <option value="" disabled>
          Choose {names.join(', ')}
        </option>
      ) : null}
      {item.candidates.map((v) => (
        <option key={v.id} value={v.id}>
          {label(v)}
        </option>
      ))}
    </select>
  );
}

/** @param {{item: object, full: boolean, onOverride: Function}} props */
function SummaryItem({item, full, onOverride}) {
  const id = useId();
  const variantTitle =
    item.variant.title && item.variant.title !== 'Default Title' ? item.variant.title : '';
  const lineTotal = Number(item.variant.price?.amount ?? 0) * item.quantity;
  // Not settled yet (it waits on the thread, say): the lowest it can come to.
  const fromTotal = item.pendingOption ? unitPrice(item) * item.quantity : null;
  // The review screen lets every open or chosen option be set or changed.
  const canChange =
    full && item.freeOptions?.length > 0 && (item.choosable || !item.pendingOption);

  return (
    <li className={styles.item}>
      <span className={styles.itemQty}>{item.quantity}×</span>
      <span className={styles.itemBody}>
        <span className={styles.itemTitle}>{item.displayTitle ?? item.product.title}</span>
        {/* "Choose …" only when it can be chosen now (a PSI range, right in the
            step). An item waiting on a later step just shows its "from" price —
            a prompt it can't act on yet read as being stuck. */}
        {item.choosable && !canChange ? (
          <span className={styles.itemVariant}>Choose {item.pendingOption.toLowerCase()}</span>
        ) : !item.pendingOption && variantTitle && !canChange ? (
          <span className={styles.itemVariant}>{variantTitle}</span>
        ) : null}
        {canChange ? (
          <span className={styles.itemOption}>
            <label htmlFor={id} className={styles.itemOptionLabel}>
              {item.freeOptions.map(cleanName).join(', ')}
            </label>
            <VariantSelect
              id={id}
              item={item}
              className={styles.itemSelect}
              onChange={(variantId) => onOverride(item.entryKey, variantId)}
            />
          </span>
        ) : null}
        {!item.pendingOption && !item.variant.availableForSale ? (
          <span className={styles.itemUnavailable}>Currently unavailable online</span>
        ) : null}
      </span>
      <span className={styles.itemPrice}>
        <span>
          {item.pendingOption ? (
            <>
              <span className={styles.muted}>From </span>
              <Price amount={fromTotal} currencyCode={item.variant.price?.currencyCode} />
            </>
          ) : (
            <Price amount={lineTotal} currencyCode={item.variant.price?.currencyCode} />
          )}
        </span>
        {item.quantity > 1 ? (
          <span className={styles.itemEach}>
            {item.pendingOption ? 'from ' : ''}
            <Price amount={unitPrice(item)} currencyCode={item.variant.price?.currencyCode} /> each
          </span>
        ) : null}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One unit's price. For an item not settled yet (it waits on the thread), the
 * lowest it can be — what a "from" price is built on.
 *
 * @param {object} item - a resolved bundle item
 */
function unitPrice(item) {
  return item.pendingOption
    ? Math.min(...item.candidates.map((v) => Number(v.price?.amount ?? Infinity)))
    : Number(item.variant.price?.amount ?? 0);
}

/** @param {{amount: number | string, currencyCode?: string}} props */
function Price({amount, currencyCode = 'USD'}) {
  return (
    <Money
      as="span"
      withoutTrailingZeros
      data={{amount: String(Number(amount) || 0), currencyCode}}
    />
  );
}

function RestartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
      <path d="M2.5 2.5v3h3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.25v4M8 4.9v.1" />
    </svg>
  );
}
