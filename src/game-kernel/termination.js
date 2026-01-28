import { recordTermination } from "./events.js";

function buildVariableIndex(definition) {
  const index = new Map();
  for (const variable of definition.state.variables) {
    index.set(variable.id, variable);
  }
  return index;
}

function resolveVarValue(state, variable, playerId) {
  if (variable.scope === "global") {
    return state.variables.global[variable.id];
  }
  if (playerId == null) {
    return undefined;
  }
  return state.variables.perPlayer[playerId]?.[variable.id];
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

function evaluateExpr(expr, context) {
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

function resolveOutcomePlayers(outcome, activePlayerId, playerCount) {
  if (!outcome?.players || outcome.players === "all") {
    return Array.from({ length: playerCount }, (_, idx) => idx + 1);
  }
  if (outcome.players === "active") {
    if (activePlayerId == null) {
      return Array.from({ length: playerCount }, (_, idx) => idx + 1);
    }
    return [activePlayerId];
  }
  if (Array.isArray(outcome.players)) {
    return outcome.players.filter((id) => Number.isInteger(id));
  }
  return Array.from({ length: playerCount }, (_, idx) => idx + 1);
}

function resolveDefaultOutcome(type) {
  if (type === "win") {
    return "lose";
  }
  if (type === "lose") {
    return "win";
  }
  return "draw";
}

export function computeScoresAtState(definition, state) {
  const scoringExpr = definition.termination?.scoring?.perPlayer;
  if (!scoringExpr) {
    return undefined;
  }
  const variableIndex = buildVariableIndex(definition);
  const scores = {};
  for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
    scores[playerId] = evaluateValue(scoringExpr, {
      state,
      playerId,
      variableIndex,
    });
  }
  return scores;
}

export function evaluateTermination(definition, state, options = {}) {
  const variableIndex = buildVariableIndex(definition);
  const activePlayerId = options.activePlayerId ?? state.turn?.currentPlayer;
  const conditions = definition.termination?.conditions ?? [];
  let matched = null;

  for (let index = 0; index < conditions.length; index += 1) {
    const condition = conditions[index];
    if (
      evaluateExpr(condition?.condition, {
        state,
        playerId: activePlayerId,
        variableIndex,
      })
    ) {
      matched = { index, outcome: condition.outcome, reason: "condition" };
      break;
    }
  }

  if (!matched && options.maxTurnsReached) {
    matched = {
      index: undefined,
      outcome: { type: "draw", players: "all" },
      reason: "max-turns",
    };
  }

  if (!matched) {
    return { terminated: false };
  }

  const outcome = matched.outcome ?? { type: "draw", players: "all" };
  const players = resolveOutcomePlayers(outcome, activePlayerId, definition.players.count);
  const outcomes = {};
  const defaultOutcome = resolveDefaultOutcome(outcome.type);

  for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
    outcomes[playerId] = defaultOutcome;
  }

  for (const playerId of players) {
    if (playerId >= 1 && playerId <= definition.players.count) {
      outcomes[playerId] = outcome.type;
    }
  }

  const scores = computeScoresAtState(definition, state);

  const result = {
    terminated: true,
    reason: matched.reason,
    conditionIndex: matched.index,
    outcomes,
    scores,
  };

  if (options.events) {
    recordTermination(options.events, result);
  }

  return result;
}
