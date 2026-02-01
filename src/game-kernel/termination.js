import { recordTermination } from "./events.js";
import { buildVariableIndex } from "./ref-resolution.js";
import { evaluateValue, evaluateExpr } from "./expression-eval.js";

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
        meta: options.meta,
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
