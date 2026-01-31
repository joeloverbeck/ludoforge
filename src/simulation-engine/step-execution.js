/**
 * Step execution helpers for the simulation loop.
 * @module simulation-engine/step-execution
 */

import { buildVariableIndex, applyEffect, applyTriggers } from "../game-kernel/index.js";
import { clearFlags } from "../game-kernel/flags.js";
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
 * @param {Record<string, string|number|Array<string|number>>} [args] - Explicit choice args used as bindings.
 */
export function applyAction(definition, state, action, context, args) {
  const variableIndex = buildVariableIndex(definition);
  const bindings = { ...(context.bindings ?? {}), ...(args ?? {}) };
  const effectContext = { state, ...context, variableIndex, bindings, definition };
  const appliedEffects = [];
  const skippedEffects = [];
  for (const effect of action.costs ?? []) {
    const result = applyEffect(state, effect, effectContext, { boundsMode: "reject" });
    if (!result.ok) {
      skippedEffects.push({ effect, reason: result.reason ?? "unknown", source: "cost" });
      return { appliedEffects: [], skippedEffects, costAborted: true };
    }
    if (result.appliedEffect) {
      appliedEffects.push({ ...result.appliedEffect, source: "cost" });
    }
  }
  for (const effect of action.effects ?? []) {
    const result = applyEffect(state, effect, effectContext);
    if (!result.ok) {
      skippedEffects.push({ effect, reason: result.reason ?? "unknown", source: "effect" });
      continue;
    }
    if (result.appliedEffect) {
      appliedEffects.push({ ...result.appliedEffect, source: "effect" });
    }
  }
  clearFlags(state, "action");
  return { appliedEffects, skippedEffects };
}

/**
 * Fire after-action triggers.
 * @param {object} definition
 * @param {object} state
 * @param {object} context
 */
export function applyAfterActionTriggers(definition, state, context) {
  const allTriggers = [...(definition.triggers ?? []), ...(definition.turn?.stepEffects ?? [])];
  const triggerAttemptCount = allTriggers.filter(t => t.event === "after_action").length;
  const result = applyTriggers(definition, state, "after_action", context);
  if (!result.ok) {
    return {
      appliedEffects: result.appliedEffects ?? [],
      skippedTrigger: { reason: result.reason ?? "unknown" },
      triggerAttemptCount,
    };
  }
  return { appliedEffects: result.appliedEffects ?? [], triggerAttemptCount };
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
 * @param {object} [trace] - Trace data: { stateHash, bindings, appliedEffects, skippedEffects, skippedTriggers, decisionSpaceRaw, decisionSpaceCapped }
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
    if (Array.isArray(trace.skippedEffects) && trace.skippedEffects.length > 0) {
      step.skippedEffects = trace.skippedEffects;
    }
    if (Array.isArray(trace.skippedTriggers) && trace.skippedTriggers.length > 0) {
      step.skippedTriggers = trace.skippedTriggers;
    }
    if (typeof trace.decisionSpaceRaw === "number") {
      step.decisionSpaceRaw = trace.decisionSpaceRaw;
    }
    if (typeof trace.decisionSpaceCapped === "boolean") {
      step.decisionSpaceCapped = trace.decisionSpaceCapped;
    }
    if (trace.costAborted === true) {
      step.costAborted = true;
    }
    if (typeof trace.triggerAttemptCount === "number") {
      step.triggerAttemptCount = trace.triggerAttemptCount;
    }
    if (typeof trace.triggerSkipCount === "number") {
      step.triggerSkipCount = trace.triggerSkipCount;
    }
  }
  return step;
}

/**
 * Build a pass step (null action, zero legal actions) with a state hash.
 * @param {object} state
 * @param {string} stateHash
 * @returns {object}
 */
export function buildPassStep(state, stateHash) {
  return buildStep(state, null, 0, undefined, {
    stateHash,
    bindings: {},
    appliedEffects: [],
  });
}

/**
 * Push a step onto the trajectory and fire the onStep callback.
 * @param {object} step
 * @param {{ steps: object[] }} trajectory
 * @param {object} [stepControl]
 */
export function recordStep(step, trajectory, stepControl) {
  trajectory.steps.push(step);
  stepControl?.onStep?.(step);
}
