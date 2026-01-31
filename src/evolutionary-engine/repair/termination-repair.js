import { normalizeArray } from "./utils.js";

const VALID_PLAYER_SELECTORS = new Set(["all", "active"]);

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
