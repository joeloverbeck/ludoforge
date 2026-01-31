import { applyEffect, buildVariableIndex, evaluateExpr } from "./effects.js";
import { autoBindParams, resolveParamDomains } from "./selectors.js";

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

function checkCostFeasibility(definition, state, action, context, variableIndex) {
  const costs = action.costs;
  if (!Array.isArray(costs) || costs.length === 0) {
    return true;
  }
  const workingState = structuredClone(state);
  const bindings = autoBindParams(action.params ?? [], workingState, {
    ...context,
    variableIndex,
  });
  const effectContext = {
    ...context,
    state: workingState,
    variableIndex,
    bindings,
    definition,
  };
  for (const cost of costs) {
    const result = applyEffect(workingState, cost, effectContext, { boundsMode: "reject" });
    if (!result.ok) {
      return false;
    }
  }
  return true;
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
  const params = action.params ?? [];
  if (params.length > 0) {
    const domains = resolveParamDomains(params, state, {
      ...context,
      variableIndex,
    });
    for (const param of params) {
      const domain = domains[param.id];
      if (!Array.isArray(domain) || domain.length === 0) {
        return false;
      }
    }
  }
  if (!checkCostFeasibility(definition, state, action, context, variableIndex)) {
    return false;
  }
  return true;
}

export function listLegalActions(definition, state, context = {}) {
  return definition.actions.filter((action) => isActionLegal(definition, state, action, context));
}

function checkActionBounds(definition, state, action, context, boundsMode, explicitBindings) {
  const variableIndex = buildVariableIndex(definition);
  const workingState = structuredClone(state);
  const bindings = explicitBindings
    ? { ...(context.bindings ?? {}), ...explicitBindings }
    : autoBindParams(action.params ?? [], workingState, {
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
      return { ok: false, reason: result.reason, effectKind: effect.kind, targetId: effect.target?.id ?? null };
    }
    if (result.clamped) {
      clamped = true;
    }
  }

  return { ok: true, clamped };
}

/**
 * Filter legal actions to only those whose effects pass bounds checking.
 *
 * @param {object} definition
 * @param {object} state
 * @param {object[]} legalActions
 * @param {object} context
 * @returns {object[]}
 */
export function filterBoundsCompliant(definition, state, legalActions, context) {
  return legalActions.filter((action) => {
    const result = checkActionBounds(definition, state, action, context, "reject");
    return result.ok;
  });
}

/**
 * Validate an action choice, optionally with explicit args for parameterized actions.
 *
 * @param {object} definition - Game definition
 * @param {object} state - Current game state
 * @param {string} actionId - The chosen action id
 * @param {object} [context] - Action context (playerId, phase, etc.)
 * @param {object} [options] - Options: bounds mode, args for parameterized validation
 * @param {Record<string, string|number|Array<string|number>>} [options.args] - Chosen arg values keyed by param id
 * @returns {{ ok: boolean, reason?: string, clamped?: boolean }}
 */
export function validateActionChoice(definition, state, actionId, context = {}, options = {}) {
  const action = definition.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    return { ok: false, reason: "unknown-action" };
  }

  if (!isActionLegal(definition, state, action, context)) {
    return { ok: false, reason: "illegal-action" };
  }

  const params = action.params ?? [];
  const args = options.args;

  if (params.length > 0 && args != null) {
    const variableIndex = buildVariableIndex(definition);
    const domains = resolveParamDomains(params, state, {
      ...context,
      variableIndex,
    });

    for (const param of params) {
      const domain = domains[param.id];
      const argValue = args[param.id];

      if (argValue == null) {
        return { ok: false, reason: "missing-arg", paramId: param.id };
      }

      const count = param.count ?? 1;
      const unique = param.unique ?? (count > 1);

      if (count > 1) {
        if (!Array.isArray(argValue)) {
          return { ok: false, reason: "invalid-arg-type", paramId: param.id };
        }
        if (argValue.length !== count) {
          return { ok: false, reason: "wrong-arg-count", paramId: param.id };
        }
        for (const v of argValue) {
          if (!domain.includes(v)) {
            return { ok: false, reason: "arg-not-in-domain", paramId: param.id, value: v };
          }
        }
        if (unique) {
          const seen = new Set();
          for (const v of argValue) {
            if (seen.has(v)) {
              return { ok: false, reason: "duplicate-arg", paramId: param.id, value: v };
            }
            seen.add(v);
          }
        }
      } else {
        if (!domain.includes(argValue)) {
          return { ok: false, reason: "arg-not-in-domain", paramId: param.id, value: argValue };
        }
      }
    }
  }

  const boundsMode = options.bounds ?? DEFAULT_BOUNDS_MODE;
  const boundsResult = checkActionBounds(definition, state, action, context, boundsMode, args);
  if (!boundsResult.ok) {
    return { ok: false, reason: boundsResult.reason, actionId: action.id, effectKind: boundsResult.effectKind, targetId: boundsResult.targetId };
  }

  return { ok: true, clamped: boundsResult.clamped };
}
