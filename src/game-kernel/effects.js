function resolveVarValue(state, variable, playerId) {
  if (variable.scope === "global") {
    return state.variables.global[variable.id];
  }
  if (playerId == null) {
    return undefined;
  }
  return state.variables.perPlayer[playerId]?.[variable.id];
}

function writeVarValue(state, variable, playerId, value) {
  if (variable.scope === "global") {
    state.variables.global[variable.id] = value;
    return;
  }
  if (playerId == null) {
    return;
  }
  state.variables.perPlayer[playerId][variable.id] = value;
}

function evaluateValue(expr, context) {
  if (!expr || typeof expr !== "object") {
    return undefined;
  }
  switch (expr.kind) {
    case "value":
      return expr.value;
    case "ref":
      return resolveRefValue(expr.ref, context);
    case "cmp":
    case "and":
    case "or":
    case "not":
      return evaluateExpr(expr, context);
    default:
      return undefined;
  }
}

function compareValues(left, right, op) {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case "<":
      return typeof left === "number" && typeof right === "number" && left < right;
    case "<=":
      return typeof left === "number" && typeof right === "number" && left <= right;
    case ">":
      return typeof left === "number" && typeof right === "number" && left > right;
    case ">=":
      return typeof left === "number" && typeof right === "number" && left >= right;
    default:
      return false;
  }
}

export function evaluateExpr(expr, context) {
  if (!expr || typeof expr !== "object") {
    return false;
  }
  switch (expr.kind) {
    case "and":
      return Boolean(evaluateExpr(expr.left, context)) && Boolean(evaluateExpr(expr.right, context));
    case "or":
      return Boolean(evaluateExpr(expr.left, context)) || Boolean(evaluateExpr(expr.right, context));
    case "not":
      return !Boolean(evaluateExpr(expr.value, context));
    case "cmp": {
      const left = evaluateValue(expr.left, context);
      const right = evaluateValue(expr.right, context);
      return compareValues(left, right, expr.op ?? "==");
    }
    case "value":
      return Boolean(expr.value);
    case "ref":
      return Boolean(resolveRefValue(expr.ref, context));
    default:
      return false;
  }
}

function resolveRefValue(ref, context) {
  if (!ref || typeof ref !== "object") {
    return undefined;
  }
  if (ref.kind === "var") {
    const variable = context.variableIndex.get(ref.id);
    if (!variable) {
      return undefined;
    }
    return resolveVarValue(context.state, variable, context.playerId);
  }
  return undefined;
}

export function buildVariableIndex(definition) {
  const index = new Map();
  for (const variable of definition.state.variables) {
    index.set(variable.id, variable);
  }
  return index;
}

function clampValue(value, min, max) {
  let next = value;
  if (typeof min === "number" && next < min) {
    next = min;
  }
  if (typeof max === "number" && next > max) {
    next = max;
  }
  return next;
}

function applyVariableEffect(state, variable, effect, context, options) {
  const current = resolveVarValue(state, variable, context.playerId);
  let next = current;
  let clamped = false;

  switch (effect.kind) {
    case "set":
      next = effect.value ?? current;
      break;
    case "inc": {
      const amount = effect.amount ?? 0;
      if (typeof current !== "number" || typeof amount !== "number") {
        return { ok: false, reason: "non-numeric-target" };
      }
      next = current + amount;
      break;
    }
    case "dec": {
      const amount = effect.amount ?? 0;
      if (typeof current !== "number" || typeof amount !== "number") {
        return { ok: false, reason: "non-numeric-target" };
      }
      next = current - amount;
      break;
    }
    default:
      return { ok: true };
  }

  const boundsMode = options?.boundsMode;
  if (boundsMode && variable.type.kind === "int" && typeof next === "number") {
    const min = variable.type.min;
    const max = variable.type.max;
    if (boundsMode === "reject") {
      if (typeof min === "number" && next < min) {
        return { ok: false, reason: "bounds" };
      }
      if (typeof max === "number" && next > max) {
        return { ok: false, reason: "bounds" };
      }
    } else {
      const clampedValue = clampValue(next, min, max);
      if (clampedValue !== next) {
        next = clampedValue;
        clamped = true;
      }
    }
  }

  writeVarValue(state, variable, context.playerId, next);
  return { ok: true, clamped };
}

export function applyEffect(state, effect, context, options) {
  if (!effect || typeof effect !== "object") {
    return { ok: true };
  }
  if (!effect.target || effect.target.kind !== "var") {
    return { ok: true };
  }
  const variable = context.variableIndex.get(effect.target.id);
  if (!variable) {
    return { ok: false, reason: "unknown-variable" };
  }
  return applyVariableEffect(state, variable, effect, context, options);
}
