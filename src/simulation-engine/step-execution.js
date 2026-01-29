/**
 * Step execution helpers for the simulation loop.
 * @module simulation-engine/step-execution
 */

import { buildVariableIndex, applyEffect, applyTriggers } from "../game-kernel/index.js";

/**
 * Deep-clone a game state via JSON round-trip.
 * @param {object} state
 * @returns {object}
 */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Apply an action's costs then effects to `state` (mutates in place).
 * @param {object} definition
 * @param {object} state
 * @param {object} action
 * @param {object} context
 */
export function applyAction(definition, state, action, context) {
  const variableIndex = buildVariableIndex(definition);
  const appliedEffects = [];
  for (const effect of action.costs ?? []) {
    const result = applyEffect(state, effect, { state, ...context, variableIndex });
    if (!result.ok) {
      throw new Error(`Action cost failed: ${result.reason ?? "unknown"}`);
    }
    if (result.appliedEffect) {
      appliedEffects.push({ ...result.appliedEffect, source: "cost" });
    }
  }
  for (const effect of action.effects ?? []) {
    const result = applyEffect(state, effect, { state, ...context, variableIndex });
    if (!result.ok) {
      throw new Error(`Action effect failed: ${result.reason ?? "unknown"}`);
    }
    if (result.appliedEffect) {
      appliedEffects.push({ ...result.appliedEffect, source: "effect" });
    }
  }
  return { appliedEffects };
}

/**
 * Fire after-action triggers.
 * @param {object} definition
 * @param {object} state
 * @param {object} context
 */
export function applyAfterActionTriggers(definition, state, context) {
  const result = applyTriggers(definition, state, "after_action", context);
  if (!result.ok) {
    throw new Error(`After-action triggers failed: ${result.reason ?? "unknown"}`);
  }
  return { appliedEffects: result.appliedEffects ?? [] };
}

/**
 * Create an empty step-impact tracker.
 * @returns {{ affectedPlayerIds: Set<number>, affectedGlobal: boolean }}
 */
export function createStepImpact() {
  return { affectedPlayerIds: new Set(), affectedGlobal: false };
}

/**
 * Normalise impact into a plain serialisable object.
 * @param {object|undefined} impact
 * @returns {{ affectedPlayerIds: number[], affectedGlobal: boolean }}
 */
function finalizeStepImpact(impact) {
  const affectedPlayerIds = Array.from(impact?.affectedPlayerIds ?? []).sort((a, b) => a - b);
  return {
    affectedPlayerIds,
    affectedGlobal: impact?.affectedGlobal ?? false,
  };
}

/**
 * Build a simulation step record.
 * @param {object} state
 * @param {string|null|undefined} actionId
 * @param {number} legalActionCount
 * @param {object} [impact]
 * @param {object} [trace] - Trace data: { stateHash, bindings, appliedEffects }
 * @returns {object}
 */
export function buildStep(state, actionId, legalActionCount, impact, trace) {
  const impactFields = finalizeStepImpact(impact);
  const step = {
    turn: state.turn.turn,
    phase: state.turn.phase ?? null,
    playerId: state.turn.currentPlayer ?? null,
    actionId,
    legalActionCount,
    state: cloneState(state),
    ...impactFields,
  };
  if (trace) {
    step.stateHash = trace.stateHash;
    step.bindings = trace.bindings;
    step.appliedEffects = trace.appliedEffects;
  }
  return step;
}
