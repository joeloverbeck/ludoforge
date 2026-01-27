import { applyEffect, buildVariableIndex, evaluateExpr } from "./effects.js";

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
  if (!action.preconditions) {
    return true;
  }
  return evaluateExpr(action.preconditions, {
    state,
    playerId: context.playerId,
    variableIndex,
  });
}

export function listLegalActions(definition, state, context = {}) {
  return definition.actions.filter((action) => isActionLegal(definition, state, action, context));
}

function cloneStateVariables(state) {
  const perPlayer = {};
  for (const [playerId, variables] of Object.entries(state.variables.perPlayer)) {
    perPlayer[playerId] = { ...variables };
  }
  return {
    global: { ...state.variables.global },
    perPlayer,
  };
}

function checkActionBounds(definition, state, action, context, boundsMode) {
  const variableIndex = buildVariableIndex(definition);
  const workingState = {
    ...state,
    variables: cloneStateVariables(state),
  };
  const workingContext = {
    ...context,
    state: workingState,
    variableIndex,
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
