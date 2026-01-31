/**
 * Decision-space accounting: computes the total number of distinct
 * player choices across all legal actions, considering parameter domains.
 * @module simulation-engine/decision-space
 */

import { resolveParamDomains, buildVariableIndex } from "../game-kernel/index.js";

/** @type {number} */
const DEFAULT_MAX_DECISION_SPACE = 10000;

/**
 * Compute the number of distinct choices for a single action.
 * Returns the product of all param domain sizes, or 1 if the action has no params.
 *
 * @param {object} action
 * @param {Record<string, Array>} domains - Pre-resolved domains keyed by param id.
 * @returns {number}
 */
export function choicesForAction(action, domains) {
  const params = action.params ?? [];
  if (params.length === 0) {
    return 1;
  }
  let product = 1;
  for (const param of params) {
    const domain = domains[param.id];
    const size = Array.isArray(domain) ? domain.length : 0;
    if (size === 0) {
      return 0;
    }
    product *= size;
  }
  return product;
}

/**
 * Compute decision-space metrics for a set of legal actions.
 *
 * @param {object} definition
 * @param {object} state
 * @param {object[]} legalActions
 * @param {object} context - { playerId, phase, turn }
 * @param {{ maxDecisionSpace?: number }} [opts]
 * @returns {{ legalActionCount: number, decisionSpaceRaw: number, decisionSpaceCapped: boolean }}
 */
export function computeDecisionSpace(definition, state, legalActions, context, opts) {
  const cap = opts?.maxDecisionSpace ?? DEFAULT_MAX_DECISION_SPACE;
  const variableIndex = buildVariableIndex(definition);

  let raw = 0;
  for (const action of legalActions) {
    const params = action.params ?? [];
    const domains =
      params.length > 0
        ? resolveParamDomains(params, state, { ...context, variableIndex })
        : {};
    raw += choicesForAction(action, domains);
  }

  const capped = raw > cap;
  return {
    legalActionCount: capped ? cap : raw,
    decisionSpaceRaw: raw,
    decisionSpaceCapped: capped,
  };
}
