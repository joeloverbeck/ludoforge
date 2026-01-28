import {
  listLegalActions,
  validateActionChoice,
  applyEffect,
  applyTriggers,
  buildVariableIndex,
  advanceTurnPhase,
} from "../../../src/game-kernel/index.js";
import { renderState } from "../../../src/human-interface/renderer.js";
import { promptForAction } from "../../../src/human-interface/prompt.js";

function applyAction(definition, state, action, context) {
  const variableIndex = buildVariableIndex(definition);
  const effectContext = { state, ...context, variableIndex };

  for (const effect of action.costs ?? []) {
    const result = applyEffect(state, effect, effectContext);
    if (!result.ok) {
      throw new Error(`Action cost failed: ${result.reason ?? "unknown"}`);
    }
  }

  for (const effect of action.effects ?? []) {
    const result = applyEffect(state, effect, effectContext);
    if (!result.ok) {
      throw new Error(`Action effect failed: ${result.reason ?? "unknown"}`);
    }
  }
}

export async function runHumanLoopOnce({
  definition,
  state,
  io,
  context = {},
  previousState,
  promptLabel,
  advanceOptions,
} = {}) {
  if (!definition || !state) {
    throw new Error("Human loop requires a definition and state.");
  }
  if (!io) {
    throw new Error("Human loop requires IO bindings.");
  }

  const actionContext = {
    playerId: state.turn?.currentPlayer ?? null,
    phase: state.turn?.phase ?? null,
    ...context,
  };
  const legalActions = listLegalActions(definition, state, actionContext);

  io.writeLine(
    renderState({
      state,
      previousState,
      viewerPlayerId: actionContext.playerId,
    }),
  );

  if (legalActions.length === 0) {
    const noLegalActions = definition.turn?.noLegalActions;
    const policy = noLegalActions?.policy;
    const reason = noLegalActions?.reason ?? "no-legal-actions";

    if (policy === "error") {
      throw new Error(`No legal actions: ${reason}`);
    }

    if (policy === "pass") {
      const advanceResult = advanceTurnPhase(definition, state, advanceOptions ?? {});
      if (!advanceResult.ok) {
        throw new Error(`Scheduler failed: ${advanceResult.reason ?? "unknown"}`);
      }

      return {
        action: null,
        index: null,
        legalActions,
        context: actionContext,
        advanceResult,
        passed: true,
      };
    }

    return {
      action: null,
      index: null,
      legalActions,
      context: actionContext,
      terminated: true,
      terminationReason: policy === "terminate" ? "no-legal-actions" : "stalemate",
      terminationDetail: policy === "terminate" ? reason : undefined,
    };
  }

  const result = await promptForAction({
    legalActions,
    io,
    promptLabel,
  });

  const validation = validateActionChoice(definition, state, result.action.id, actionContext);
  if (!validation.ok) {
    throw new Error(`Selected action invalid: ${validation.reason ?? "unknown"}`);
  }

  applyAction(definition, state, result.action, actionContext);

  const triggerResult = applyTriggers(definition, state, "after_action", actionContext);
  if (!triggerResult.ok) {
    throw new Error(`After-action triggers failed: ${triggerResult.reason ?? "unknown"}`);
  }

  const advanceResult = advanceTurnPhase(definition, state, advanceOptions ?? {});
  if (!advanceResult.ok) {
    throw new Error(`Scheduler failed: ${advanceResult.reason ?? "unknown"}`);
  }

  return {
    action: result.action,
    index: result.index,
    legalActions,
    context: actionContext,
    advanceResult,
  };
}
