import { normalizeArray, clampNumber } from "./utils.js";

const VALID_PLAYER_SELECTORS = new Set(["all", "active"]);

/**
 * Collect all variable ids targeted by set/inc/dec effects across the definition.
 * @param {object} definition
 * @returns {Set<string>}
 */
function collectModifiedVariableIds(definition) {
  const modified = new Set();

  function walkEffect(effect) {
    if (!effect || typeof effect !== "object") {
      return;
    }
    if (
      (effect.kind === "set" || effect.kind === "inc" || effect.kind === "dec") &&
      effect.target?.kind === "var" &&
      typeof effect.target.id === "string"
    ) {
      modified.add(effect.target.id);
    }
    for (const sub of normalizeArray(effect.effects)) {
      walkEffect(sub);
    }
    for (const sub of normalizeArray(effect.then)) {
      walkEffect(sub);
    }
    for (const sub of normalizeArray(effect.else)) {
      walkEffect(sub);
    }
    if (Array.isArray(effect.options)) {
      for (const optionEffects of effect.options) {
        for (const sub of normalizeArray(optionEffects)) {
          walkEffect(sub);
        }
      }
    }
  }

  for (const action of normalizeArray(definition?.actions)) {
    for (const effect of normalizeArray(action?.effects)) {
      walkEffect(effect);
    }
    for (const cost of normalizeArray(action?.costs)) {
      walkEffect(cost);
    }
  }
  for (const trigger of normalizeArray(definition?.triggers)) {
    for (const effect of normalizeArray(trigger?.effects)) {
      walkEffect(effect);
    }
  }
  for (const stepEffect of normalizeArray(definition?.turn?.stepEffects)) {
    for (const effect of normalizeArray(stepEffect?.effects)) {
      walkEffect(effect);
    }
  }

  return modified;
}

/**
 * Extract variable id from a cmp condition's left ref.
 * @param {object} condition
 * @returns {string | null}
 */
function extractConditionVarId(condition) {
  if (condition?.kind !== "cmp") {
    return null;
  }
  if (
    condition.left?.kind === "ref" &&
    condition.left.ref?.kind === "var" &&
    typeof condition.left.ref.id === "string"
  ) {
    return condition.left.ref.id;
  }
  return null;
}

/**
 * Remove termination conditions that reference variables never modified by any effect.
 * Keeps at least one condition even if all are unreachable.
 * @param {object} definition
 * @returns {object}
 */
export function repairUnreachableTerminations(definition) {
  const conditions = normalizeArray(definition?.termination?.conditions);
  if (conditions.length === 0) {
    return definition;
  }

  const modifiedVarIds = collectModifiedVariableIds(definition);
  const reachable = [];
  const unreachable = [];

  for (const entry of conditions) {
    const varId = extractConditionVarId(entry?.condition);
    if (varId && !modifiedVarIds.has(varId)) {
      unreachable.push(entry);
    } else {
      reachable.push(entry);
    }
  }

  if (unreachable.length === 0) {
    return definition;
  }

  const kept = reachable.length > 0 ? reachable : [conditions[0]];

  return {
    ...definition,
    termination: {
      ...definition.termination,
      conditions: kept,
    },
  };
}

function isValidPlayers(players) {
  if (typeof players === "string") {
    return VALID_PLAYER_SELECTORS.has(players);
  }
  if (Array.isArray(players)) {
    return players.every(
      (item) => Number.isInteger(item) && item >= 0,
    );
  }
  return false;
}

export function repairTerminationOutcomes(definition) {
  const conditions = normalizeArray(definition?.termination?.conditions);
  if (conditions.length === 0) {
    return definition;
  }

  const repairedConditions = conditions.map((entry) => {
    if (!entry || typeof entry !== "object" || !entry.outcome) {
      return entry;
    }
    if (isValidPlayers(entry.outcome.players)) {
      return entry;
    }
    return {
      ...entry,
      outcome: { ...entry.outcome, players: "active" },
    };
  });

  return {
    ...definition,
    termination: {
      ...definition.termination,
      conditions: repairedConditions,
    },
  };
}

/**
 * Build a variable-by-id map from the definition.
 * @param {object} definition
 * @returns {Map<string, object>}
 */
function buildVariableById(definition) {
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];
  return new Map(
    variables
      .filter((v) => typeof v?.id === "string")
      .map((v) => [v.id, v])
  );
}

/**
 * Extract variable id from a cmp condition's left-hand ref expression.
 * @param {object} expr
 * @returns {string | null}
 */
function extractVarRefId(expr) {
  if (expr?.kind === "ref" && expr.ref?.kind === "var" && typeof expr.ref.id === "string") {
    return expr.ref.id;
  }
  return null;
}

/**
 * Adjust termination thresholds that are immediately true at initial state.
 * For each cmp condition, if the variable's initial value already satisfies
 * the comparison, shift the threshold so that the condition starts false.
 * Returns entry unchanged when no valid adjustment exists (e.g. single-value range).
 * @param {object} definition
 * @returns {object}
 */
export function repairImmediatelyTrueTerminations(definition) {
  const conditions = normalizeArray(definition?.termination?.conditions);
  if (conditions.length === 0) {
    return definition;
  }

  const variableById = buildVariableById(definition);
  let changed = false;

  const repairedConditions = conditions.map((entry) => {
    if (!entry?.condition || entry.condition.kind !== "cmp") {
      return entry;
    }
    const cond = entry.condition;
    const varId = extractVarRefId(cond.left);
    if (!varId) {
      return entry;
    }
    const variable = variableById.get(varId);
    if (
      !variable ||
      variable.type?.kind !== "int" ||
      typeof variable.type.min !== "number" ||
      typeof variable.type.max !== "number"
    ) {
      return entry;
    }
    if (cond.right?.kind !== "value" || typeof cond.right.value !== "number") {
      return entry;
    }

    const { min, max } = variable.type;
    const initial = typeof variable.initial === "number" ? variable.initial : min;
    const op = cond.op;
    const threshold = cond.right.value;

    const immediatelyTrue =
      (op === ">=" && initial >= threshold) ||
      (op === "<=" && initial <= threshold) ||
      (op === ">" && initial > threshold) ||
      (op === "<" && initial < threshold) ||
      (op === "==" && initial === threshold);

    if (!immediatelyTrue) {
      return entry;
    }

    let newThreshold;
    if (op === ">=") {
      newThreshold = initial + 1;
      if (newThreshold > max) {
        changed = true;
        return null;
      }
    } else if (op === "<=") {
      newThreshold = initial - 1;
      if (newThreshold < min) {
        changed = true;
        return null;
      }
    } else if (op === ">") {
      newThreshold = initial;
    } else if (op === "<") {
      newThreshold = initial;
    } else if (op === "==") {
      if (initial + 1 <= max) {
        newThreshold = initial + 1;
      } else if (initial - 1 >= min) {
        newThreshold = initial - 1;
      } else {
        changed = true;
        return null;
      }
    } else {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      condition: {
        ...cond,
        right: { ...cond.right, value: newThreshold },
      },
    };
  });

  if (!changed) {
    return definition;
  }

  const survivingConditions = repairedConditions.filter((c) => c !== null);

  return {
    ...definition,
    termination: {
      ...definition.termination,
      conditions: survivingConditions,
    },
  };
}

/**
 * Clamp termination condition thresholds to referenced variable bounds.
 * @param {object} definition
 * @returns {object}
 */
export function repairTerminationThresholds(definition) {
  const conditions = normalizeArray(definition?.termination?.conditions);
  if (conditions.length === 0) {
    return definition;
  }

  const variableById = buildVariableById(definition);
  let changed = false;

  const repairedConditions = conditions.map((entry) => {
    if (!entry?.condition || entry.condition.kind !== "cmp") {
      return entry;
    }
    const cond = entry.condition;
    const varId = extractVarRefId(cond.left);
    if (!varId) {
      return entry;
    }
    const variable = variableById.get(varId);
    if (
      !variable ||
      variable.type?.kind !== "int" ||
      typeof variable.type.min !== "number" ||
      typeof variable.type.max !== "number"
    ) {
      return entry;
    }
    if (cond.right?.kind !== "value" || typeof cond.right.value !== "number") {
      return entry;
    }
    const clamped = clampNumber(cond.right.value, variable.type.min, variable.type.max);
    if (clamped === cond.right.value) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      condition: {
        ...cond,
        right: { ...cond.right, value: clamped },
      },
    };
  });

  if (!changed) {
    return definition;
  }

  return {
    ...definition,
    termination: {
      ...definition.termination,
      conditions: repairedConditions,
    },
  };
}
