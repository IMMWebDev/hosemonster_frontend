/**
 * Bundle builder logic — pure functions, no React.
 *
 * The CMS describes a builder (Strapi `bundle-builder`): a pump-rating table,
 * then steps of questions whose choices add Shopify products. This file turns
 * that description plus the visitor's answers into a bundle: which variant of
 * which product, how many, and whether each choice can be picked at all.
 *
 * The rules, in one place:
 *
 *  - LINES come from the rating table row the visitor picks.
 *  - QUANTITY per product: perLine = lines; fixed = n; perLines = one per n
 *    lines, rounded up; none = not added.
 *  - VARIANTS: a 'variant' question (Thread, Length) sets that option on every
 *    product that has it. A product's own preset (Angle = 45 Degree) pins one
 *    option for that product only. Any other option (a gauge's PSI range) is
 *    the visitor's to choose, right under the choice they picked.
 *  - CONDITIONS: a product with a condition is only added when an earlier
 *    answer matches — a variant option ("Thread Type" = NH) or another
 *    question's choice ("Discharge Method" = Little Hose Monster™). A leading
 *    "!" inverts it ("!NH" = any thread but NH).
 *  - TIERS: Min/Max Lines limit a product to bundles in that size range.
 *  - ORDER: a question is only constrained by the questions BEFORE it. Picking
 *    a 30° elbow in step 3 therefore limits the thread in step 4 to NH, rather
 *    than the thread reaching back and disabling the elbow. When an earlier
 *    answer changes and makes a later one impossible, the later one is cleared
 *    — see `repairAnswers`.
 *  - NOTHING IS CHOSEN FOR THE VISITOR: every question and every product
 *    option starts empty. Until something an item depends on is answered, the
 *    item is listed with what's left to choose, priced "from", and kept out of
 *    the subtotal and the cart.
 *
 * Shopify spells option names inconsistently ("Select Thread Type" on one
 * product, "Thread Type" on another), so names and values are compared through
 * `normalize`, and an editor can type the friendly form in Strapi.
 */

/** The review screen follows the CMS steps; this is its label. */
export const REVIEW_LABEL = 'Review';

/** Sentinel for "more than the largest rating in the table". */
export const OVER_MAX = 'over';

/**
 * "Select Thread Type" and "Thread Type" → "threadtype"; "10 Feet" → "10feet".
 *
 * @param {unknown} value
 */
export function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/^select\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * The builder as the UI walks it: steps holding questions, each question with
 * a stable key ("stepIndex.questionIndex") used for answers and the URL.
 *
 * @param {object} builder - the Strapi entry, populated
 */
export function buildModel(builder) {
  const steps = (builder?.steps ?? []).map((step, s) => ({
    title: step.title,
    description: step.description,
    questions: (step.questions ?? []).map((q, i) => ({
      ...q,
      key: `${s}.${i}`,
      stepIndex: s,
      choices: q.choices ?? [],
    })),
  }));

  const rows = [...(builder?.lineRows ?? [])]
    .filter((r) => Number.isFinite(r?.pumpGpm) && Number.isFinite(r?.lines))
    .sort((a, b) => a.pumpGpm - b.pumpGpm);

  return {
    name: builder?.name ?? 'Bundle',
    steps,
    questions: steps.flatMap((s) => s.questions),
    rows,
    overMaxLabel: builder?.overMaxLabel || '',
    overMaxMessage: builder?.overMaxMessage || '',
    overMaxLink: builder?.overMaxLink?.linkText ? builder.overMaxLink : null,
  };
}

/**
 * Dropdown text for a rating row.
 *
 * @param {{pumpGpm: number, label?: string}} row
 */
export function rowLabel(row) {
  return row.label || `${row.pumpGpm.toLocaleString('en-US')} GPM`;
}

/**
 * @param {ReturnType<typeof buildModel>} model
 * @param {number | 'over' | null} gpm
 */
export function rowFor(model, gpm) {
  if (gpm == null || gpm === OVER_MAX) return null;
  return model.rows.find((r) => r.pumpGpm === gpm) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Answers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Choice indices picked for a question, always as an array.
 *
 * @param {Record<string, number | number[] | null>} answers
 * @param {string} key
 * @returns {number[]}
 */
export function picked(answers, key) {
  const a = answers?.[key];
  if (a == null) return [];
  return Array.isArray(a) ? a : [a];
}

/**
 * Variant selections made so far, keyed by normalised option name.
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {Record<string, any>} answers
 * @param {number} [uptoIndex] - only questions before this flat index count
 * @returns {Record<string, {value: string, label: string}>}
 */
export function variantSelections(model, answers, uptoIndex = Infinity) {
  const out = {};
  model.questions.forEach((q, i) => {
    if (i >= uptoIndex || q.questionType !== 'variant') return;
    const [c] = picked(answers, q.key);
    const choice = q.choices[c];
    if (!choice?.variantValue || !q.variantOptionName) return;
    out[normalize(q.variantOptionName)] = {
      value: choice.variantValue,
      label: choice.label,
    };
  });
  return out;
}

/**
 * What each question before `uptoIndex` was answered with, keyed by its
 * normalised title (and, for a variant question, its option name too) — what
 * a condition like "Discharge Method = Little Hose Monster™" is checked
 * against. Labels and variant values both count, so either can be typed in
 * Strapi.
 *
 * A question in range that was left BLANK is present with an empty list: it is
 * known to be nothing, which fails "= X" and passes "!X". Only questions past
 * `uptoIndex` — not reached yet — are absent, i.e. unknown.
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {Record<string, any>} answers
 * @param {number} [uptoIndex]
 * @returns {Record<string, string[]>}
 */
export function answerLabels(model, answers, uptoIndex = Infinity) {
  const out = {};
  model.questions.forEach((q, i) => {
    if (i >= uptoIndex || q.questionType === 'pumpRating') return;
    const values = [];
    for (const c of picked(answers, q.key)) {
      const choice = q.choices[c];
      if (!choice) continue;
      values.push(normalize(choice.label));
      if (choice.variantValue) values.push(normalize(choice.variantValue));
    }
    out[normalize(q.title)] = values;
    if (q.questionType === 'variant' && q.variantOptionName) {
      out[normalize(q.variantOptionName)] = values;
    }
  });
  return out;
}

/**
 * Normalised option names of required variant questions still unanswered —
 * a product with one of these options has no settled variant or price yet
 * (a hose before its length is picked).
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {Record<string, any>} answers
 * @returns {Set<string>}
 */
export function pendingOptions(model, answers) {
  const out = new Set();
  for (const q of model.questions) {
    if (q.questionType !== 'variant' || !q.variantOptionName) continue;
    if (q.isRequired === false) continue;
    if (picked(answers, q.key).length === 0) out.add(normalize(q.variantOptionName));
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Resolving one product entry                                                 */
/* -------------------------------------------------------------------------- */

/**
 * @param {object} product - Storefront product with options + variants
 * @returns {Set<string>} normalised option names that actually vary
 */
function optionNames(product) {
  return new Set(
    (product?.options ?? [])
      .filter((o) => normalize(o.name) !== 'title')
      .map((o) => normalize(o.name)),
  );
}

/**
 * @param {object} variant
 * @param {string} name - normalised
 */
function variantValue(variant, name) {
  const opt = (variant?.selectedOptions ?? []).find(
    (o) => normalize(o.name) === name,
  );
  return opt ? normalize(opt.value) : undefined;
}

/** "Select Thread Type" -> "Thread Type". */
export function cleanName(name) {
  return String(name ?? '').replace(/^select\s+/i, '');
}

/**
 * @param {string} rule
 * @param {number | null | undefined} n
 * @param {number | null} lines - null until a rating is picked
 * @returns {number | null} null = "per line", not yet countable
 */
export function quantityFor(rule, n, lines) {
  const count = Math.max(1, Number(n) || 1);
  switch (rule) {
    case 'fixed':
      return count;
    case 'perLines':
      return lines == null ? null : Math.ceil(lines / count);
    case 'none':
      return 0;
    case 'perLine':
    default:
      return lines;
  }
}

/**
 * Why a product's condition keeps it out, or null when it passes.
 *
 * @param {object} entry
 * @param {{selections: object, answers?: Record<string, string[]>, unknownPasses?: boolean}} ctx
 * @returns {string | null}
 */
function checkCondition(entry, ctx) {
  if (!entry.conditionOption) return null;

  const key = normalize(entry.conditionOption);
  const raw = String(entry.conditionValues ?? '').trim();
  const negate = raw.startsWith('!');
  const allowed = raw
    .replace(/^!/, '')
    .split(',')
    .map(normalize)
    .filter(Boolean);
  if (allowed.length === 0) return null;

  const values = raw.replace(/^!/, '');
  const sel = ctx.selections?.[key];
  const actual = sel
    ? [normalize(sel.value), normalize(sel.label)]
    : ctx.answers?.[key];

  // Unknown: a question not reached yet (availability checks pass it), or a
  // name that matches nothing, which can never equal X — so "!X" holds.
  if (actual === undefined) {
    return ctx.unknownPasses || negate ? null : `Only with ${values}`;
  }

  const hit = actual.some((v) => allowed.includes(v));
  if (negate ? !hit : hit) return null;
  return negate ? `Not with ${values}` : `Only with ${values}`;
}

/**
 * @param {{minLines?: number, maxLines?: number}} entry
 */
function tierLabel({minLines, maxLines}) {
  if (Number.isFinite(minLines) && Number.isFinite(maxLines)) {
    return `Only for ${minLines}–${maxLines} lines`;
  }
  if (Number.isFinite(minLines)) return `Only for ${minLines}+ lines`;
  return `Only for up to ${maxLines} lines`;
}

/**
 * One product line of a choice, resolved against the current answers.
 *
 * `unknownPasses` is for availability checks made while later questions are
 * still open: an unanswered thread neither satisfies nor fails a condition.
 *
 * @param {object} entry - builder-product component
 * @param {{
 *   products: Record<string, object>,
 *   selections: Record<string, {value: string, label: string}>,
 *   lines: number | null,
 *   overrideId?: string,
 *   unknownPasses?: boolean,
 * }} ctx
 */
export function resolveEntry(entry, ctx) {
  const {products, selections, lines, overrideId, unknownPasses = false} = ctx;

  if (entry.quantityRule === 'none') return {status: 'skipped'};

  // A condition on a question the visitor hasn't answered yet can't be
  // decided: the product stands in for its choice until it is (see
  // resolveChoice), rather than being guessed in or out.
  const conditionKey = entry.conditionOption ? normalize(entry.conditionOption) : null;
  const undetermined =
    conditionKey && ctx.unanswered?.has(conditionKey)
      ? ctx.unanswered.get(conditionKey)
      : null;
  if (!undetermined) {
    const condition = checkCondition(entry, ctx);
    if (condition) return {status: 'skipped', reason: condition};
  }

  // Size tiers. Unknown until a rating is picked: a tiered product neither
  // counts for nor against a choice's availability before then. A skip here
  // carries a reason, so a choice whose products are ALL outside the tier
  // shows as unavailable rather than as a pick that adds nothing.
  const tiered = Number.isFinite(entry.minLines) || Number.isFinite(entry.maxLines);
  if (tiered && lines != null) {
    if (
      (Number.isFinite(entry.minLines) && lines < entry.minLines) ||
      (Number.isFinite(entry.maxLines) && lines > entry.maxLines)
    ) {
      return {status: 'skipped', reason: tierLabel(entry)};
    }
  } else if (tiered && !unknownPasses) {
    return {status: 'skipped', reason: 'Depends on your pump rating'};
  }

  const ref = String(entry.productHandle ?? '').trim();
  const product = products?.[ref];
  if (!product) {
    return {status: 'unavailable', reason: 'Not currently available'};
  }

  const names = optionNames(product);
  const variants = product.variants?.nodes ?? [];

  /** @type {Array<{name: string, value: string, label: string}>} */
  const constraints = [];
  if (entry.presetOptionName && entry.presetOptionValue) {
    const name = normalize(entry.presetOptionName);
    if (names.has(name)) {
      constraints.push({
        name,
        value: normalize(entry.presetOptionValue),
        label: entry.presetOptionValue,
      });
    }
  }
  for (const [name, sel] of Object.entries(selections)) {
    if (names.has(name) && !constraints.some((c) => c.name === name)) {
      constraints.push({name, value: normalize(sel.value), label: sel.label});
    }
  }

  const matches = (v, list) => list.every((c) => variantValue(v, c.name) === c.value);
  const candidates = variants.filter((v) => matches(v, constraints));

  if (candidates.length === 0) {
    const failing =
      constraints.find((c) => !variants.some((v) => matches(v, [c]))) ??
      constraints[constraints.length - 1];
    return {
      status: 'unavailable',
      reason: failing ? `Not available in ${failing.label}` : 'Not currently available',
    };
  }

  const constrained = new Set(constraints.map((c) => c.name));
  const pending = (product.options ?? []).find((o) =>
    ctx.pending?.has(normalize(o.name)),
  );
  // Options no question or preset sets, that still differ between the
  // remaining variants — the visitor picks these (a gauge's PSI range).
  const freeOptions = (product.options ?? [])
    .filter((o) => normalize(o.name) !== 'title' && !constrained.has(normalize(o.name)))
    .filter((o) => !ctx.pending?.has(normalize(o.name)))
    .filter(
      (o) => new Set(candidates.map((v) => variantValue(v, normalize(o.name)))).size > 1,
    )
    .map((o) => o.name);

  const chosen = candidates.find((v) => v.id === overrideId);
  const blocking = undetermined ?? (pending ? cleanName(pending.name) : null);
  const open = !chosen && freeOptions.length > 0;

  return {
    status: 'ok',
    product,
    // Until everything is chosen this is only a stand-in for the picture and
    // the "from" price.
    variant: chosen ?? candidates.find((v) => v.availableForSale) ?? candidates[0],
    candidates,
    freeOptions,
    undeterminedKey: undetermined ? conditionKey : null,
    // What's still to choose before this item is settled: an unanswered
    // question it depends on, or one of its own options.
    pendingOption: blocking ?? (open ? freeOptions.map(cleanName).join(', ') : null),
    // The visitor can settle it right now, from the item's own options.
    choosable: !blocking && open,
    quantity: quantityFor(entry.quantityRule, entry.quantity, lines),
  };
}

/* -------------------------------------------------------------------------- */
/* Choices                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Whether a choice can be picked, and what it adds.
 *
 * A choice with no products ("Open Atmosphere", "No Elbow") is always
 * available and adds nothing. A choice whose products all drop out — the
 * variant doesn't exist, or every product's condition fails — is unavailable.
 *
 * @param {object} choice
 * @param {object} ctx - as resolveEntry, plus `keyPrefix` for overrides
 */
export function resolveChoice(choice, ctx) {
  if (!choice) return {available: false, reason: '', items: []};
  if (choice.comingSoon) {
    return {available: false, reason: 'Coming soon', items: []};
  }

  const entries = choice.products ?? [];
  if (entries.length === 0) return {available: true, reason: '', items: []};

  const results = entries.map((entry, e) =>
    resolveEntry(entry, {
      ...ctx,
      overrideId: ctx.overrides?.[`${ctx.keyPrefix}:${e}`],
    }),
  );
  // One product that can't be supplied (missing from Shopify, or no variant
  // for the answers given) makes the whole choice unavailable. Dropping just
  // that product would let a required question read as answered while the
  // bundle quietly lacked part of what the choice promised.
  const broken = results.find((r) => r.status === 'unavailable');
  if (broken) return {available: false, reason: broken.reason, items: []};

  const seen = new Set();
  const ok = results
    .map((r, e) => ({...r, entryKey: `${ctx.keyPrefix}:${e}`}))
    .filter((r) => r.status === 'ok')
    // Products whose condition waits on the same unanswered question are
    // alternatives (the NH elbow OR the special-thread elbow): list one, under
    // the choice's own name, until the answer decides which.
    .filter((r) => {
      if (!r.undeterminedKey) return true;
      if (seen.has(r.undeterminedKey)) return false;
      seen.add(r.undeterminedKey);
      return true;
    })
    .map((r) => (r.undeterminedKey ? {...r, displayTitle: choice.label} : r));

  if (ok.length > 0) return {available: true, reason: '', items: ok};

  // Everything was skipped by quantity rule 'none' (no reason): nothing to
  // add, but fine. Skips WITH a reason — a condition or a size tier — mean
  // the choice doesn't apply to this bundle.
  if (results.every((r) => r.status === 'skipped' && !r.reason)) {
    return {available: true, reason: '', items: []};
  }

  const why =
    results.find((r) => r.status === 'unavailable')?.reason ??
    results.find((r) => r.reason)?.reason ??
    'Not available with your selections';
  return {available: false, reason: why, items: []};
}

/**
 * Can `choiceIndex` be picked for question `qIndex`, given only the answers
 * BEFORE it? Returns the reason when it can't: its own ("Not available in
 * NYFD") or the earlier choice it conflicts with ("Not available with 30°
 * Playpipe Elbow").
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {{gpm: any, answers: Record<string, any>}} state
 * @param {Record<string, object>} products
 * @param {number} qIndex - flat question index
 * @param {number} choiceIndex
 */
export function choiceAvailability(model, state, products, qIndex, choiceIndex) {
  const q = model.questions[qIndex];
  const choice = q.choices[choiceIndex];
  if (!choice) return {available: false, reason: ''};
  if (choice.comingSoon) return {available: false, reason: 'Coming soon'};

  const trial = {...state.answers};
  if (q.selection === 'multiple') {
    const current = picked(state.answers, q.key);
    trial[q.key] = current.includes(choiceIndex) ? current : [...current, choiceIndex];
  } else {
    trial[q.key] = choiceIndex;
  }

  const selections = variantSelections(model, trial, qIndex + 1);
  const answers = answerLabels(model, trial, qIndex + 1);
  const lines = rowFor(model, state.gpm)?.lines ?? null;

  for (let i = 0; i <= qIndex; i++) {
    const pq = model.questions[i];
    if (pq.questionType !== 'product') continue;
    for (const c of picked(trial, pq.key)) {
      if (i === qIndex && c !== choiceIndex) continue;
      const res = resolveChoice(pq.choices[c], {
        products,
        selections,
        answers,
        lines,
        unknownPasses: true,
        keyPrefix: `${pq.key}:${c}`,
      });
      if (!res.available) {
        return {
          available: false,
          reason:
            i === qIndex
              ? res.reason
              : `Not available with ${pq.choices[c]?.label ?? 'an earlier choice'}`,
        };
      }
    }
  }
  return {available: true, reason: ''};
}

/* -------------------------------------------------------------------------- */
/* Defaults, recommendations, repair                                            */
/* -------------------------------------------------------------------------- */

/**
 * Walk the questions in order and make every answer valid.
 *
 * Nothing is ever answered for the visitor: every question starts empty and
 * the builder only reflects what they pick. Pre-selecting the recommended
 * choices filled the bundle with nozzles, elbows and hose the moment a pump
 * rating was chosen, before the visitor had looked at any of it.
 *
 * An answer an earlier change has made impossible is cleared, so the step
 * shows as unfinished and the reason is right there on the choice.
 * Multiple-choice answers just lose the impossible picks.
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {{gpm: any, answers: Record<string, any>, touched: string[]}} state
 * @param {Record<string, object>} products
 */
export function repairAnswers(model, state, products) {
  const next = {...state, answers: {...state.answers}};
  const touched = new Set(state.touched ?? []);

  model.questions.forEach((q, qi) => {
    if (q.questionType === 'pumpRating') return;
    const ok = (c) => choiceAvailability(model, next, products, qi, c).available;

    if (q.selection === 'multiple') {
      const current = touched.has(q.key) ? picked(next.answers, q.key) : [];
      next.answers[q.key] = current.filter(ok);
      return;
    }

    if (!touched.has(q.key)) {
      next.answers[q.key] = null;
      return;
    }

    const [current] = picked(next.answers, q.key);
    if (current == null || ok(current)) return;
    next.answers[q.key] = null;
  });

  return next;
}

/* -------------------------------------------------------------------------- */
/* The bundle                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Everything the summary and the cart need.
 *
 * An item whose variant still depends on an unanswered question (a hose
 * before its length is chosen) is listed but left out of the subtotal — its
 * price isn't known yet.
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {{gpm: any, answers: Record<string, any>, overrides: Record<string, string>}} state
 * @param {Record<string, object>} products
 */
export function computeBundle(model, state, products) {
  const row = rowFor(model, state.gpm);
  const lines = row?.lines ?? null;
  const ctx = bundleContext(model, state, products);

  /** @type {Map<string, any>} */
  const byVariant = new Map();

  model.questions.forEach((q) => {
    if (q.questionType !== 'product') return;
    for (const c of picked(state.answers, q.key)) {
      const res = resolveChoice(q.choices[c], {...ctx, keyPrefix: `${q.key}:${c}`});
      for (const item of res.items) {
        if (!item.quantity) continue;
        const id = item.variant.id;
        const existing = byVariant.get(id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.sources.push(q.title);
        } else {
          byVariant.set(id, {...item, sources: [q.title]});
        }
      }
    }
  });

  const items = [...byVariant.values()];
  const currencyCode =
    items[0]?.variant?.price?.currencyCode ??
    Object.values(products ?? {})[0]?.priceRange?.minVariantPrice?.currencyCode ??
    'USD';
  const subtotal = items
    .filter((i) => !i.pendingOption)
    .reduce((sum, i) => sum + Number(i.variant.price?.amount ?? 0) * i.quantity, 0);

  const missing = model.questions.filter((q) => {
    if (q.questionType === 'pumpRating') return !row;
    if (q.isRequired === false) return false;
    return picked(state.answers, q.key).length === 0;
  });

  // Items the visitor still has to settle from their own options (a gauge's
  // PSI range). Items waiting on a question are covered by `missing`.
  const toChoose = items.filter((i) => i.choosable);

  return {
    row,
    lines,
    items,
    subtotal,
    currencyCode,
    unavailable: items.filter((i) => !i.pendingOption && !i.variant.availableForSale),
    missing,
    toChoose,
    complete:
      missing.length === 0 && items.length > 0 && items.every((i) => !i.pendingOption),
  };
}

/**
 * The resolution context for the FULL set of answers — what the bundle is
 * built from.
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {object} state
 * @param {Record<string, object>} products
 */
function bundleContext(model, state, products) {
  const answers = answerLabels(model, state.answers);
  // A required question with no answer yet is UNKNOWN, not "answered with
  // nothing": a condition on it waits instead of failing (which used to put
  // the special-thread elbow in every bundle until a thread was picked).
  /** @type {Map<string, string>} */
  const unanswered = new Map();
  for (const q of model.questions) {
    if (q.questionType === 'pumpRating' || q.isRequired === false) continue;
    if (picked(state.answers, q.key).length > 0) continue;
    const label = q.variantOptionName ? cleanName(q.variantOptionName) : q.title;
    for (const key of [normalize(q.title), q.variantOptionName && normalize(q.variantOptionName)]) {
      if (!key) continue;
      delete answers[key];
      unanswered.set(key, label);
    }
  }
  return {
    products,
    selections: variantSelections(model, state.answers),
    answers,
    unanswered,
    pending: pendingOptions(model, state.answers),
    lines: rowFor(model, state.gpm)?.lines ?? null,
    overrides: state.overrides,
  };
}

/**
 * The items a question's current answer adds, resolved against all answers —
 * what the step shows option pickers for.
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {object} state
 * @param {Record<string, object>} products
 * @param {number} qIndex
 */
export function answerItems(model, state, products, qIndex) {
  const q = model.questions[qIndex];
  if (q?.questionType !== 'product') return [];
  const ctx = bundleContext(model, state, products);
  return picked(state.answers, q.key).flatMap(
    (c) => resolveChoice(q.choices[c], {...ctx, keyPrefix: `${q.key}:${c}`}).items,
  );
}

/**
 * What picking `choiceIndex` would actually do: the answers after it is
 * applied and every later answer repaired, the choice resolved against that
 * result (so the card's price is the price the visitor will get), and any
 * later answer of theirs that it changes or clears.
 *
 * Cards used to be priced against the current answers while their
 * availability was judged against earlier ones only, so a pick could read
 * "Nothing added" and then quietly switch the thread to NH.
 *
 * @param {ReturnType<typeof buildModel>} model
 * @param {object} state
 * @param {Record<string, object>} products
 * @param {number} qIndex
 * @param {number} choiceIndex
 */
export function previewChoice(model, state, products, qIndex, choiceIndex) {
  const q = model.questions[qIndex];
  const touched = new Set(state.touched ?? []);
  touched.add(q.key);

  let answer = choiceIndex;
  if (q.selection === 'multiple') {
    const list = picked(state.answers, q.key);
    answer = list.includes(choiceIndex) ? list : [...list, choiceIndex].sort((a, b) => a - b);
  }

  const next = repairAnswers(
    model,
    {...state, answers: {...state.answers, [q.key]: answer}, touched: [...touched]},
    products,
  );

  const res = resolveChoice(q.choices[choiceIndex], {
    ...bundleContext(model, next, products),
    keyPrefix: `${q.key}:${choiceIndex}`,
  });

  /** @type {string[]} */
  const changes = [];
  model.questions.forEach((later, i) => {
    if (i <= qIndex || later.questionType === 'pumpRating') return;
    if (!(state.touched ?? []).includes(later.key)) return;
    const before = picked(state.answers, later.key);
    const after = picked(next.answers, later.key);
    if (before.join() === after.join()) return;
    const label = (list) => list.map((c) => later.choices[c]?.label).filter(Boolean).join(', ');
    changes.push(
      after.length
        ? `Changes ${later.title} to ${label(after)}`
        : `Clears your ${later.title} choice`,
    );
  });

  return {res, changes};
}

/**
 * The price a choice card shows. `total` is null until a rating is picked;
 * `from` marks a price that still depends on an unanswered question (the
 * cheapest variant is used).
 *
 * @param {ReturnType<typeof resolveChoice>} res
 */
export function choicePrice(res) {
  if (!res.items.length) return null;
  let total = 0;
  let countable = true;
  let from = false;
  for (const item of res.items) {
    let price = Number(item.variant.price?.amount ?? 0);
    if (item.pendingOption) {
      from = true;
      price = Math.min(
        ...item.candidates.map((v) => Number(v.price?.amount ?? Infinity)),
      );
    }
    if (item.quantity == null) countable = false;
    else total += price * item.quantity;
  }
  return {
    total: countable ? total : null,
    from,
    currencyCode: res.items[0].variant.price?.currencyCode ?? 'USD',
  };
}

/* -------------------------------------------------------------------------- */
/* URL state                                                                    */
/* -------------------------------------------------------------------------- */

/** Query parameter holding a configured bundle, so it can be shared. */
export const URL_PARAM = 'bundle';

const VARIANT_GID = 'gid://shopify/ProductVariant/';

/**
 * `1500~1.0:2,6.0:0+2~5.0:1:0=4412345` — rating; the answers the visitor
 * chose; then the product options they picked (a gauge's PSI range), as entry
 * key = numeric variant id.
 *
 * @param {{gpm: any, answers: Record<string, any>, touched?: string[], overrides?: Record<string, string>}} state
 */
export function encodeState(state) {
  const touched = new Set(state.touched ?? []);
  const pairs = Object.entries(state.answers)
    .filter(([k]) => touched.has(k))
    .map(([k, v]) => {
      const list = v == null ? [] : Array.isArray(v) ? v : [v];
      return `${k}:${list.join('+')}`;
    });
  const overrides = Object.entries(state.overrides ?? {})
    .filter(([, id]) => typeof id === 'string' && id.startsWith(VARIANT_GID))
    .map(([k, id]) => `${k}=${id.slice(VARIANT_GID.length)}`);
  return `${state.gpm ?? ''}~${pairs.join(',')}~${overrides.join(',')}`;
}

/**
 * The inverse, strict about shape and tolerant of garbage: anything it can't
 * read falls back to defaults rather than failing, duplicate indices are
 * dropped, and a blank value means "chose nothing" only for an optional or
 * multiple-choice question.
 *
 * @param {string | null} raw
 * @param {ReturnType<typeof buildModel>} model
 */
export function decodeState(raw, model) {
  const empty = {gpm: null, answers: {}, touched: [], overrides: {}};
  if (!raw) return empty;
  const [gpmPart, pairPart = '', overridePart = ''] = String(raw).split('~');

  const gpm =
    gpmPart === OVER_MAX
      ? OVER_MAX
      : model.rows.some((r) => String(r.pumpGpm) === gpmPart)
        ? Number(gpmPart)
        : null;

  const answers = {};
  const touched = [];
  for (const pair of pairPart.split(',')) {
    const match = /^(\d+\.\d+):(\d+(?:\+\d+)*)?$/.exec(pair);
    if (!match) continue;
    const [, key, value = ''] = match;
    const q = model.questions.find((x) => x.key === key);
    if (!q || q.questionType === 'pumpRating') continue;

    const indices = [...new Set(value ? value.split('+').map(Number) : [])]
      .filter((n) => q.choices[n])
      .sort((a, b) => a - b);

    if (q.selection === 'multiple') {
      answers[key] = indices;
    } else if (indices.length) {
      answers[key] = indices[0];
    } else if (q.isRequired === false) {
      answers[key] = null;
    } else {
      continue;
    }
    touched.push(key);
  }

  const overrides = {};
  for (const pair of overridePart.split(',')) {
    const match = /^(\d+\.\d+:\d+:\d+)=(\d+)$/.exec(pair);
    if (match) overrides[match[1]] = `${VARIANT_GID}${match[2]}`;
  }

  return {...empty, gpm, answers, touched, overrides};
}
