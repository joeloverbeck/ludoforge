import {
  pickInt,
  pickWeighted,
  pickFrom,
  generateIntVariable,
  generateEffect,
  generatePrecondition,
  generateDecPrecondition,
  generateTerminationCondition,
  generateTokenType,
  generateZone,
  generateTrigger,
  andExpr,
} from "./primitives.js";

const DEFAULT_LIMITS = {
  minVariables: 1,
  maxVariables: 5,
  minActions: 1,
  maxActions: 5,
  minTokenTypes: 0,
  maxTokenTypes: 2,
  minTriggers: 0,
  maxTriggers: 1,
};

const DEFAULT_WEIGHTS = { inc: 1, dec: 1, set: 1 };

function resolveLimits(grammar) {
  const limits = grammar?.limits;
  return {
    minVariables: limits?.minVariables ?? DEFAULT_LIMITS.minVariables,
    maxVariables: limits?.maxVariables ?? DEFAULT_LIMITS.maxVariables,
    minActions: limits?.minActions ?? DEFAULT_LIMITS.minActions,
    maxActions: limits?.maxActions ?? DEFAULT_LIMITS.maxActions,
    minTokenTypes: limits?.minTokenTypes ?? DEFAULT_LIMITS.minTokenTypes,
    maxTokenTypes: limits?.maxTokenTypes ?? DEFAULT_LIMITS.maxTokenTypes,
    minTriggers: limits?.minTriggers ?? DEFAULT_LIMITS.minTriggers,
    maxTriggers: limits?.maxTriggers ?? DEFAULT_LIMITS.maxTriggers,
  };
}

function resolveWeights(grammar) {
  const weights = grammar?.weights;
  if (!weights || typeof weights !== "object") {
    return DEFAULT_WEIGHTS;
  }
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  if (total <= 0) {
    return DEFAULT_WEIGHTS;
  }
  return weights;
}

function generateVariables(rng, count) {
  const variables = [];
  for (let i = 0; i < count; i++) {
    variables.push(generateIntVariable({ rng, id: `var_${i}` }));
  }
  return variables;
}

function assignVariablesToActions(rng, variables, actionCount) {
  /** @type {Map<number, string[]>} */
  const assignments = new Map();
  for (let i = 0; i < actionCount; i++) {
    assignments.set(i, []);
  }
  for (let i = 0; i < variables.length; i++) {
    const actionIdx = i % actionCount;
    assignments.get(actionIdx).push(variables[i].id);
  }
  for (let i = 0; i < actionCount; i++) {
    if (assignments.get(i).length === 0) {
      const randomVar = pickFrom(rng, variables);
      assignments.get(i).push(randomVar.id);
    }
  }
  return assignments;
}

function buildVariableMap(variables) {
  const map = new Map();
  for (const v of variables) {
    map.set(v.id, v);
  }
  return map;
}

function generateActions(rng, variables, actionCount, weights) {
  const assignments = assignVariablesToActions(rng, variables, actionCount);
  const variableMap = buildVariableMap(variables);
  const actions = [];

  for (let i = 0; i < actionCount; i++) {
    const assignedVarIds = assignments.get(i);
    const effects = [];
    const effectKinds = [];

    for (const varId of assignedVarIds) {
      const kind = pickWeighted(rng, weights);
      const variableDef = variableMap.get(varId);
      effects.push(generateEffect({ rng, kind, variableId: varId, variableDef }));
      effectKinds.push(kind);
    }

    const action = {
      id: `action_${i}`,
      actor: "player",
      effects,
    };

    const preconditionParts = [];
    for (let j = 0; j < assignedVarIds.length; j++) {
      const varId = assignedVarIds[j];
      const kind = effectKinds[j];
      const variableDef = variableMap.get(varId);
      if (kind === "inc") {
        preconditionParts.push(
          generatePrecondition({ variableId: varId, variableDef })
        );
      } else if (kind === "dec") {
        preconditionParts.push(
          generateDecPrecondition({ variableId: varId, variableDef })
        );
      }
    }

    if (preconditionParts.length === 1) {
      action.preconditions = preconditionParts[0];
    } else if (preconditionParts.length > 1) {
      action.preconditions = preconditionParts.reduce((acc, part) =>
        andExpr(acc, part)
      );
    }

    actions.push(action);
  }

  return actions;
}

function generateTerminations(rng, variables) {
  const variableMap = buildVariableMap(variables);
  const conditions = variables.map((v) =>
    generateTerminationCondition({
      variableId: v.id,
      variableDef: variableMap.get(v.id),
    })
  );
  const maxTurns = pickInt(rng, 10, 100);
  return { conditions, maxTurns };
}

/**
 * Generate a schema-valid, semantically-valid GameDefinition from a grammar config.
 *
 * @param {{ rng: { next(): number, nextInt(max: number): number }, grammar?: object }} opts
 * @returns {object} GameDefinition
 */
function generateTokenTypes(rng, count) {
  const tokenTypes = [];
  for (let i = 0; i < count; i++) {
    tokenTypes.push(generateTokenType({ rng, id: `token_${i}` }));
  }
  return tokenTypes;
}

function generateZones(rng, tokenTypes) {
  return tokenTypes.map((tt, i) =>
    generateZone({ rng, id: `zone_${i}`, tokenTypeId: tt.id })
  );
}

function generateTriggers(rng, variables, count) {
  if (variables.length === 0 || count === 0) {
    return [];
  }
  const triggers = [];
  for (let i = 0; i < count; i++) {
    triggers.push(generateTrigger({ rng, variables }));
  }
  return triggers;
}

export function generateGameDefinition({ rng, grammar }) {
  const limits = resolveLimits(grammar);
  const weights = resolveWeights(grammar);

  const variableCount = pickInt(rng, limits.minVariables, limits.maxVariables);
  const actionCount = pickInt(rng, limits.minActions, limits.maxActions);
  const tokenTypeCount = pickInt(rng, limits.minTokenTypes, limits.maxTokenTypes);
  const triggerCount = pickInt(rng, limits.minTriggers, limits.maxTriggers);

  const variables = generateVariables(rng, variableCount);
  const actions = generateActions(rng, variables, actionCount, weights);
  const termination = generateTerminations(rng, variables);
  const tokenTypes = generateTokenTypes(rng, tokenTypeCount);
  const zones = generateZones(rng, tokenTypes);
  const triggers = generateTriggers(rng, variables, triggerCount);

  const state = { variables };
  if (tokenTypes.length > 0) {
    state.tokenTypes = tokenTypes;
  }
  if (zones.length > 0) {
    state.zones = zones;
  }

  const definition = {
    version: "1.0",
    players: { count: pickInt(rng, 2, 4) },
    state,
    actions,
    turn: { scheduler: "round_robin" },
    termination,
  };

  if (triggers.length > 0) {
    definition.triggers = triggers;
  }

  return definition;
}
