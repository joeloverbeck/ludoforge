/**
 * Format an action definition into a human-readable display label for the TUI.
 *
 * @import { ActionDef } from '../../dsl/types.ts'
 */

import { formatEffect } from "./format-effect.js";

/**
 * Produce a short display label for an action.
 *
 * Examples:
 *   "deployWarrior"
 *   "marchWarrior (select target)"
 *   "heal (cost: energy -1)"
 *
 * @param {ActionDef} action
 * @returns {string}
 */
export function formatAction(action) {
  const parts = [action.id];

  if (action.targets && action.targets.length > 0) {
    const summary = action.targets.map((t) => t.id).join(", ");
    parts.push(`(select ${summary})`);
  }

  if (action.costs && action.costs.length > 0) {
    const costStr = action.costs.map((c) => formatEffect(c)).join(", ");
    parts.push(`(cost: ${costStr})`);
  }

  return parts.join(" ");
}
