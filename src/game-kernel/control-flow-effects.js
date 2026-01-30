import { evaluateExpr } from "./expression-eval.js";

export function applyRepeat(state, effect, context, options, applyEffectFn) {
  const count = effect.count ?? 1;
  const subEffects = effect.effects ?? [];
  const collected = [];
  for (let i = 0; i < count; i += 1) {
    for (const subEffect of subEffects) {
      const result = applyEffectFn(state, subEffect, context, options);
      if (!result.ok) {
        return { ok: true, appliedEffect: { kind: "repeat", count: i, applied: collected } };
      }
      if (result.appliedEffect) {
        collected.push(result.appliedEffect);
      }
    }
  }
  return { ok: true, appliedEffect: { kind: "repeat", count, applied: collected } };
}

export function applyConditional(state, effect, context, options, applyEffectFn) {
  const condition = effect.condition;
  const thenEffects = Array.isArray(effect.then) ? effect.then : null;
  const elseEffects = Array.isArray(effect.else) ? effect.else : [];
  if (!condition || !thenEffects) {
    return { ok: false, reason: "missing-conditional-params" };
  }
  const conditionMet = evaluateExpr(condition, context);
  const branch = conditionMet ? thenEffects : elseEffects;
  const applied = [];
  for (const subEffect of branch) {
    const result = applyEffectFn(state, subEffect, context, options);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    if (result.appliedEffect) {
      applied.push(result.appliedEffect);
    }
  }
  return { ok: true, appliedEffect: { kind: "conditional", conditionMet, applied } };
}

export function applyChoose(state, effect, context, options, applyEffectFn) {
  const allOptions = Array.isArray(effect.options) ? effect.options : [];
  if (allOptions.length === 0) {
    return { ok: true, appliedEffect: { kind: "choose", selected: [], applied: [] } };
  }
  const count = typeof effect.count === "number" ? effect.count : 1;
  const available = allOptions.slice();
  const selected = [];
  const rng = context.rng;

  for (let i = 0; i < count && available.length > 0; i += 1) {
    const idx = rng?.nextInt
      ? rng.nextInt(available.length)
      : Math.floor(Math.random() * available.length);
    selected.push(available[idx]);
    available.splice(idx, 1);
  }

  const applied = [];
  for (const optionEffects of selected) {
    for (const subEffect of optionEffects) {
      const result = applyEffectFn(state, subEffect, context, options);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      if (result.appliedEffect) {
        applied.push(result.appliedEffect);
      }
    }
  }
  return { ok: true, appliedEffect: { kind: "choose", selected: selected.length, applied } };
}
