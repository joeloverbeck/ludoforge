import { normalizeArray } from "./issue-collector.js";

/**
 * Detect cancelling effects (inc+dec net zero on same var) and redundant set effects.
 * @param {Array} actions
 * @param {Function} pushIssue
 */
export function detectCancellingEffects(actions, pushIssue) {
  if (!Array.isArray(actions)) {
    return;
  }

  actions.forEach((action, actionIndex) => {
    if (!action || typeof action !== "object") {
      return;
    }
    const effects = normalizeArray(action.effects);
    const basePath = `/actions/${actionIndex}`;

    const varTotals = new Map();
    const varSets = new Map();

    for (const effect of effects) {
      if (!effect?.target || effect.target.kind !== "var" || typeof effect.target.id !== "string") {
        continue;
      }
      const varId = effect.target.id;

      if (effect.kind === "inc" && typeof effect.amount === "number") {
        const entry = varTotals.get(varId) ?? { inc: 0, dec: 0 };
        entry.inc += effect.amount;
        varTotals.set(varId, entry);
      } else if (effect.kind === "dec" && typeof effect.amount === "number") {
        const entry = varTotals.get(varId) ?? { inc: 0, dec: 0 };
        entry.dec += effect.amount;
        varTotals.set(varId, entry);
      } else if (effect.kind === "set") {
        const count = (varSets.get(varId) ?? 0) + 1;
        varSets.set(varId, count);
      }
    }

    for (const [varId, totals] of varTotals) {
      if (totals.inc > 0 && totals.dec > 0 && totals.inc === totals.dec) {
        pushIssue(
          basePath,
          `Action "${action.id ?? actionIndex}" has cancelling effects on variable "${varId}" (inc ${totals.inc} == dec ${totals.dec})`,
          "cancelling-effects"
        );
      }
    }

    for (const [varId, count] of varSets) {
      if (count >= 2) {
        pushIssue(
          basePath,
          `Action "${action.id ?? actionIndex}" has ${count} set effects on variable "${varId}"`,
          "redundant-set-effect"
        );
      }
    }
  });
}
