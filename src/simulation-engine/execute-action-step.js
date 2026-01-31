/**
 * Encapsulates the duplicated action-execution block shared by
 * sequential and simultaneous loops.
 * @module simulation-engine/execute-action-step
 */

import { recordStateUpdate } from "../game-kernel/index.js";
import {
  applyAction,
  applyAfterActionTriggers,
  createStepImpact,
  buildStep,
  recordStep,
} from "./step-execution.js";
import { defaultStateHasher } from "./loop-detection.js";

/**
 * Execute a single action step: apply effects, record state, build and record
 * the trajectory step.
 *
 * @param {object} params
 * @param {object} params.definition
 * @param {object} params.state
 * @param {object} params.action
 * @param {object} params.context     - { playerId, phase, turn }
 * @param {number} params.legalActionCount
 * @param {object} [params.rng]
 * @param {{ steps: object[] }} params.trajectory
 * @param {object} [params.stepControl]
 * @param {Record<string, string|number|Array<string|number>>} [params.args] - Explicit choice args forwarded to applyAction.
 * @param {number} [params.decisionSpaceRaw] - Raw (uncapped) decision-space total.
 * @param {boolean} [params.decisionSpaceCapped] - Whether the cap was applied.
 * @returns {void}
 */
export function executeActionStep({
  definition,
  state,
  action,
  context,
  legalActionCount,
  rng,
  events,
  trajectory,
  stepControl,
  args,
  decisionSpaceRaw,
  decisionSpaceCapped,
}) {
  const impact = createStepImpact();
  const effectContext = { ...context, impact, rng };
  const actionResult = applyAction(definition, state, action, effectContext, args);
  const triggerResult = applyAfterActionTriggers(definition, state, effectContext);
  recordStateUpdate(events, state, { actionId: action.id, playerId: context.playerId });

  const stateHash = defaultStateHasher(state);
  const appliedEffects = [
    ...actionResult.appliedEffects,
    ...triggerResult.appliedEffects,
  ];

  const skippedEffects = actionResult.skippedEffects ?? [];
  const skippedTriggers = triggerResult.skippedTrigger
    ? [triggerResult.skippedTrigger]
    : [];

  const costAborted = actionResult.costAborted === true;
  const triggerAttemptCount = triggerResult.triggerAttemptCount ?? 0;
  const triggerSkipCount = skippedTriggers.length;

  const step = buildStep(state, action.id, legalActionCount, impact, {
    stateHash,
    bindings: {},
    appliedEffects,
    skippedEffects,
    skippedTriggers,
    decisionSpaceRaw,
    decisionSpaceCapped,
    costAborted,
    triggerAttemptCount,
    triggerSkipCount,
  });
  recordStep(step, trajectory, stepControl);
}
