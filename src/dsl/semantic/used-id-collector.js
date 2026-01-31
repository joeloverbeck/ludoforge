/**
 * Pure function that walks a GameDefinition and returns all referenced
 * zone, token-type, and variable IDs.
 *
 * Same walking logic as the ref-validator / semantic-validators pipeline
 * but without issue reporting — used for pruning and metrics.
 */

function collectRefsFromRef(ref, used) {
  if (!ref || typeof ref !== "object") return;
  const kind = ref.kind;
  const id = ref.id;
  if (typeof id !== "string") return;

  if (kind === "var") {
    used.variableIds.add(id);
  } else if (kind === "token") {
    used.tokenTypeIds.add(id);
  } else if (kind === "zone" || kind === "zone_query") {
    used.zoneIds.add(id);
    if (kind === "zone_query" && typeof ref.tokenType === "string") {
      used.tokenTypeIds.add(ref.tokenType);
    }
  }
}

function collectRefsFromExpr(expr, used) {
  if (!expr || typeof expr !== "object") return;

  switch (expr.kind) {
    case "and":
    case "or":
    case "cmp":
      collectRefsFromExpr(expr.left, used);
      collectRefsFromExpr(expr.right, used);
      break;
    case "not":
      collectRefsFromExpr(expr.value, used);
      break;
    case "ref":
      collectRefsFromRef(expr.ref, used);
      break;
    default:
      break;
  }
}

function collectRefsFromEffect(effect, used) {
  if (!effect || typeof effect !== "object") return;

  if (effect.target) {
    collectRefsFromRef(effect.target, used);
  }
  if (typeof effect.toZone === "string") {
    used.zoneIds.add(effect.toZone);
  }
  if (typeof effect.fromZone === "string") {
    used.zoneIds.add(effect.fromZone);
  }
  if (effect.kind === "move_spatial" && typeof effect.zone === "string") {
    used.zoneIds.add(effect.zone);
  }
  if (effect.kind === "repeat" && Array.isArray(effect.effects)) {
    for (const sub of effect.effects) {
      collectRefsFromEffect(sub, used);
    }
  }
  if (effect.kind === "conditional") {
    collectRefsFromExpr(effect.condition, used);
    for (const sub of Array.isArray(effect.then) ? effect.then : []) {
      collectRefsFromEffect(sub, used);
    }
    for (const sub of Array.isArray(effect.else) ? effect.else : []) {
      collectRefsFromEffect(sub, used);
    }
  }
  if (effect.kind === "rng_choose" && Array.isArray(effect.options)) {
    for (const optionEffects of effect.options) {
      if (Array.isArray(optionEffects)) {
        for (const sub of optionEffects) {
          collectRefsFromEffect(sub, used);
        }
      }
    }
  }
  if (effect.kind === "set_turn_order" && typeof effect.variable === "string") {
    used.variableIds.add(effect.variable);
  }
}

function collectRefsFromEffects(effects, used) {
  if (!Array.isArray(effects)) return;
  for (const effect of effects) {
    collectRefsFromEffect(effect, used);
  }
}

function collectRefsFromSelector(selector, used) {
  if (!selector || typeof selector !== "object") return;
  if (typeof selector.zone === "string") {
    used.zoneIds.add(selector.zone);
  }
  if (typeof selector.tokenType === "string") {
    used.tokenTypeIds.add(selector.tokenType);
  }
  if (selector.where) {
    collectRefsFromExpr(selector.where, used);
  }
}

function collectRefsFromActions(actions, used) {
  if (!Array.isArray(actions)) return;
  for (const action of actions) {
    if (!action || typeof action !== "object") continue;

    collectRefsFromEffects(action.effects, used);
    collectRefsFromEffects(action.costs, used);

    if (action.preconditions) {
      collectRefsFromExpr(action.preconditions, used);
    }

    if (Array.isArray(action.params)) {
      for (const param of action.params) {
        if (param?.domain?.selector) {
          collectRefsFromSelector(param.domain.selector, used);
        }
      }
    }

    if (Array.isArray(action.targets)) {
      for (const target of action.targets) {
        if (target?.selector) {
          collectRefsFromSelector(target.selector, used);
        }
      }
    }
  }
}

function collectRefsFromTriggers(triggers, used) {
  if (!Array.isArray(triggers)) return;
  for (const trigger of triggers) {
    if (!trigger || typeof trigger !== "object") continue;
    collectRefsFromEffects(trigger.effects, used);
    if (trigger.condition) {
      collectRefsFromExpr(trigger.condition, used);
    }
  }
}

function collectRefsFromTermination(termination, used) {
  if (!termination || typeof termination !== "object") return;

  const conditions = Array.isArray(termination.conditions)
    ? termination.conditions
    : [];
  for (const entry of conditions) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.condition) {
      collectRefsFromExpr(entry.condition, used);
    }
    if (entry.scoring) {
      collectRefsFromExpr(entry.scoring, used);
    }
  }

  if (termination.scoring) {
    collectRefsFromExpr(termination.scoring, used);
  }
}

function collectRefsFromTurn(turn, used) {
  if (!turn || typeof turn !== "object") return;

  collectRefsFromTriggers(turn.stepEffects, used);

  if (typeof turn.orderBy === "string") {
    used.variableIds.add(turn.orderBy);
  }
}

/**
 * Walks the entire definition and returns sets of all referenced IDs.
 *
 * @param {object} definition
 * @returns {{ usedZoneIds: Set<string>, usedTokenTypeIds: Set<string>, usedVariableIds: Set<string> }}
 */
export function collectUsedIds(definition) {
  const used = {
    zoneIds: new Set(),
    tokenTypeIds: new Set(),
    variableIds: new Set(),
  };

  if (!definition || typeof definition !== "object") {
    return {
      usedZoneIds: used.zoneIds,
      usedTokenTypeIds: used.tokenTypeIds,
      usedVariableIds: used.variableIds,
    };
  }

  collectRefsFromActions(definition.actions, used);
  collectRefsFromTriggers(definition.triggers, used);
  collectRefsFromTermination(definition.termination, used);
  collectRefsFromTurn(definition.turn, used);

  return {
    usedZoneIds: used.zoneIds,
    usedTokenTypeIds: used.tokenTypeIds,
    usedVariableIds: used.variableIds,
  };
}
