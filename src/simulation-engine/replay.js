/**
 * Replay utilities for trace verification.
 * Pure functions — no side effects, no mutation of inputs.
 * @module simulation-engine/replay
 */

import { defaultStateHasher } from "./loop-detection.js";
import { cloneState } from "./step-execution.js";

/**
 * Verify that every step's recorded stateHash matches
 * `defaultStateHasher(step.state)`.
 * @param {object[]} steps
 * @returns {{ ok: boolean, failures: Array<{ index: number, expected: string, actual: string }> }}
 */
export function verifyTraceConsistency(steps) {
  const failures = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.stateHash === undefined || step.state === undefined) {
      continue;
    }
    const computed = defaultStateHasher(step.state);
    if (computed !== step.stateHash) {
      failures.push({ index: i, expected: step.stateHash, actual: computed });
    }
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Apply a list of appliedEffects to a cloned state's variables.
 * Supports inc, dec, set on global and perPlayer variable targets.
 * Returns the new state (input is not mutated).
 * @param {object} state
 * @param {object[]} appliedEffects
 * @param {{ playerId?: number }} [context]
 * @returns {object}
 */
export function replayEffectsOnState(state, appliedEffects, context = {}) {
  const next = cloneState(state);
  for (const effect of appliedEffects) {
    if (!effect.target || effect.target.kind !== "var") {
      continue;
    }
    const id = effect.target.id;
    const scope = effect.target.scope;
    if (scope === "global") {
      const current = next.variables.global[id];
      next.variables.global[id] = applyOp(current, effect);
    } else if (scope === "perPlayer") {
      const playerId = context.playerId;
      if (playerId != null && next.variables.perPlayer[playerId] != null) {
        const current = next.variables.perPlayer[playerId][id];
        next.variables.perPlayer[playerId][id] = applyOp(current, effect);
      }
    }
  }
  return next;
}

/**
 * @param {number} current
 * @param {object} effect
 * @returns {number}
 */
function applyOp(current, effect) {
  switch (effect.kind) {
    case "inc":
      return current + (effect.amount ?? 0);
    case "dec":
      return current - (effect.amount ?? 0);
    case "set":
      return effect.value;
    default:
      return current;
  }
}
