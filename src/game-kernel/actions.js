import { applyEffect, buildVariableIndex, evaluateExpr } from "./effects.js";
import { resolveActionTargets } from "./selectors.js";

const DEFAULT_BOUNDS_MODE = "reject";

function getPhase(context, state) {
  return context?.phase ?? state.turn?.phase ?? null;
}

function getAgent(state, playerId) {
  if (playerId == null) {
    return undefined;
  }
  return state.agents.find((agent) => agent.id === playerId);
}

function isActorAllowed(action, state, context) {
  const playerId = context.playerId;
  switch (action.actor) {
    case "any":
      return playerId != null;
    case "player":
      return playerId != null;
    case "role": {
      if (playerId == null) {
        return false;
      }
      const agent = getAgent(state, playerId);
      return Boolean(agent && action.actorRole && agent.role === action.actorRole);
    }
    case "environment":
      return playerId == null;
    default:
      return false;
  }
}

export function isActionLegal(definition, state, action, context = {}) {
  const variableIndex = buildVariableIndex(definition);
  const phase = getPhase(context, state);
  if (action.metadata?.phase && action.metadata.phase !== phase) {
    return false;
  }
  if (!isActorAllowed(action, state, context)) {
    return false;
  }
  if (action.preconditions) {
    const legal = evaluateExpr(action.preconditions, {
      state,
      playerId: context.playerId,
      variableIndex,
    });
    if (!legal) {
      return false;
    }
  }
  const targets = action.targets ?? [];
  if (targets.length > 0) {
    const bindings = resolveActionTargets(definition, state, action, {
      ...context,
      variableIndex,
    });
    for (const target of targets) {
      if (bindings[target.id] == null) {
        return false;
      }
    }
  }
  return true;
}

export function listLegalActions(definition, state, context = {}) {
  return definition.actions.filter((action) => isActionLegal(definition, state, action, context));
}

function checkActionBounds(definition, state, action, context, boundsMode) {
  const variableIndex = buildVariableIndex(definition);
  const workingState = structuredClone(state);
  const bindings = resolveActionTargets(definition, workingState, action, {
    ...context,
    variableIndex,
  });
  const workingContext = {
    ...context,
    state: workingState,
    variableIndex,
    bindings,
    definition,
  };

  const effects = [...(action.costs ?? []), ...(action.effects ?? [])];
  let clamped = false;

  for (const effect of effects) {
    const result = applyEffect(workingState, effect, workingContext, { boundsMode });
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    if (result.clamped) {
      clamped = true;
    }
  }

  return { ok: true, clamped };
}

export function validateActionChoice(definition, state, actionId, context = {}, options = {}) {
  const action = definition.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    return { ok: false, reason: "unknown-action" };
  }

  if (!isActionLegal(definition, state, action, context)) {
    return { ok: false, reason: "illegal-action" };
  }

  const boundsMode = options.bounds ?? DEFAULT_BOUNDS_MODE;
  const boundsResult = checkActionBounds(definition, state, action, context, boundsMode);
  if (!boundsResult.ok) {
    return boundsResult;
  }

  return { ok: true, clamped: boundsResult.clamped };
}
