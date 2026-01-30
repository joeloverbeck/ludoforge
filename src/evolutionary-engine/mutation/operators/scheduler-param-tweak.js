import { getRandomIndex, pickDifferentValue } from "../random.js";

/**
 * Collects per-player integer variables from the definition.
 * @param {import("../../../../src/dsl/types.js").GameDefinition} definition
 * @returns {Array<{id: string}>}
 */
function collectPerPlayerIntVars(definition) {
  const vars = definition.state?.variables ?? [];
  return vars.filter(
    (v) => v.scope === "per_player" && v.type?.kind === "int",
  );
}

/**
 * Collects per-player zones from the definition.
 * @param {import("../../../../src/dsl/types.js").GameDefinition} definition
 * @returns {Array<{id: string, tokenType: string}>}
 */
function collectPerPlayerZones(definition) {
  const zones = definition.state?.zones ?? [];
  return zones.filter((z) => z.scope === "per_player");
}

/**
 * Tweaks parameters of a priority_queue scheduler.
 * Either flips direction or swaps variable to a different valid one.
 * Returns null if no tweak is possible.
 *
 * @param {object} turn
 * @param {object} definition
 * @param {object} rng
 * @returns {object | null}
 */
function tweakPriorityQueue(turn, definition, rng) {
  const orderBy = turn.orderBy;
  if (!orderBy) return null;

  const intVars = collectPerPlayerIntVars(definition);
  const canFlipDirection = true;
  const canSwapVariable = intVars.length > 1;

  const choices = [];
  if (canFlipDirection) choices.push("flip_direction");
  if (canSwapVariable) choices.push("swap_variable");

  if (choices.length === 0) return null;

  const choiceIdx = getRandomIndex(choices.length, rng);
  const choice = choices[Math.max(0, choiceIdx)];

  if (choice === "flip_direction") {
    const newDirection = orderBy.direction === "asc" ? "desc" : "asc";
    return {
      ...turn,
      orderBy: { ...orderBy, direction: newDirection },
    };
  }

  // swap_variable
  const currentVar = orderBy.variable;
  const varIds = intVars.map((v) => v.id);
  const newVar = pickDifferentValue(varIds, currentVar, rng);
  if (newVar === currentVar) return null;

  return {
    ...turn,
    orderBy: { ...orderBy, variable: newVar },
  };
}

/**
 * Tweaks parameters of a token_holder scheduler.
 * Either swaps tokenType or zone to a different valid one.
 * Returns null if no tweak is possible.
 *
 * @param {object} turn
 * @param {object} definition
 * @param {object} rng
 * @returns {object | null}
 */
function tweakTokenHolder(turn, definition, rng) {
  const ppZones = collectPerPlayerZones(definition);
  const tokenTypes = definition.state?.tokenTypes ?? [];
  const ppZoneTokenTypes = new Set(ppZones.map((z) => z.tokenType));
  const validTokenTypes = tokenTypes.filter((tt) =>
    ppZoneTokenTypes.has(tt.id),
  );

  const canSwapTokenType = validTokenTypes.length > 1;
  const matchingZones = ppZones.filter((z) => z.tokenType === turn.tokenType);
  const canSwapZone = matchingZones.length > 1;

  const choices = [];
  if (canSwapTokenType) choices.push("swap_token_type");
  if (canSwapZone) choices.push("swap_zone");

  if (choices.length === 0) return null;

  const choiceIdx = getRandomIndex(choices.length, rng);
  const choice = choices[Math.max(0, choiceIdx)];

  if (choice === "swap_token_type") {
    const ttIds = validTokenTypes.map((tt) => tt.id);
    const newTT = pickDifferentValue(ttIds, turn.tokenType, rng);
    if (newTT === turn.tokenType) return null;

    // Pick a zone that matches the new token type
    const zonesForNewTT = ppZones.filter((z) => z.tokenType === newTT);
    if (zonesForNewTT.length === 0) return null;
    const zIdx = getRandomIndex(zonesForNewTT.length, rng);
    const newZone = zonesForNewTT[Math.max(0, zIdx)];

    return {
      ...turn,
      tokenType: newTT,
      zone: newZone.id,
    };
  }

  // swap_zone
  const zoneIds = matchingZones.map((z) => z.id);
  const newZone = pickDifferentValue(zoneIds, turn.zone, rng);
  if (newZone === turn.zone) return null;

  return {
    ...turn,
    zone: newZone,
  };
}

export const schedulerParamTweakMutation = {
  name: "scheduler-param-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const turn = definition.turn ?? {};
    const scheduler = turn.scheduler ?? "round_robin";

    let tweaked = null;

    if (scheduler === "priority_queue") {
      tweaked = tweakPriorityQueue(turn, definition, rng);
    } else if (scheduler === "token_holder") {
      tweaked = tweakTokenHolder(turn, definition, rng);
    }
    // round_robin and anything else: no-op

    if (tweaked === null) {
      return { ...genome, definition };
    }

    definition.turn = tweaked;
    return { ...genome, definition };
  },
};
