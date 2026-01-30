import { getRandomIndex } from "../random.js";

const SCHEDULER_TYPES = ["round_robin", "priority_queue", "token_holder"];

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
 * Returns the set of scheduler types that are valid swap targets given the
 * current definition (i.e. the definition has the required supporting data).
 * Excludes the current scheduler from candidates.
 */
function getValidSwapTargets(definition, currentScheduler) {
  const candidates = [];

  for (const scheduler of SCHEDULER_TYPES) {
    if (scheduler === currentScheduler) continue;

    if (scheduler === "priority_queue") {
      if (collectPerPlayerIntVars(definition).length > 0) {
        candidates.push(scheduler);
      }
    } else if (scheduler === "token_holder") {
      const ppZones = collectPerPlayerZones(definition);
      const tokenTypes = definition.state?.tokenTypes ?? [];
      if (ppZones.length > 0 && tokenTypes.length > 0) {
        const ppZoneTokenTypes = new Set(ppZones.map((z) => z.tokenType));
        const hasMatchingTokenType = tokenTypes.some((tt) =>
          ppZoneTokenTypes.has(tt.id),
        );
        if (hasMatchingTokenType) {
          candidates.push(scheduler);
        }
      }
    } else {
      candidates.push(scheduler);
    }
  }

  return candidates;
}

/**
 * Builds the turn object fields specific to the chosen scheduler.
 */
function buildSchedulerFields(scheduler, definition, rng) {
  if (scheduler === "priority_queue") {
    const intVars = collectPerPlayerIntVars(definition);
    const idx = getRandomIndex(intVars.length, rng);
    const chosen = intVars[Math.max(0, idx)];
    const directions = ["asc", "desc"];
    const dirIdx = getRandomIndex(directions.length, rng);
    return {
      orderBy: {
        variable: chosen.id,
        direction: directions[Math.max(0, dirIdx)],
      },
    };
  }

  if (scheduler === "token_holder") {
    const ppZones = collectPerPlayerZones(definition);
    const tokenTypes = definition.state?.tokenTypes ?? [];
    const ppZoneTokenTypes = new Set(ppZones.map((z) => z.tokenType));
    const validTokenTypes = tokenTypes.filter((tt) =>
      ppZoneTokenTypes.has(tt.id),
    );
    const ttIdx = getRandomIndex(validTokenTypes.length, rng);
    const chosenTT = validTokenTypes[Math.max(0, ttIdx)];
    const matchingZones = ppZones.filter(
      (z) => z.tokenType === chosenTT.id,
    );
    const zIdx = getRandomIndex(matchingZones.length, rng);
    const chosenZone = matchingZones[Math.max(0, zIdx)];
    return {
      tokenType: chosenTT.id,
      zone: chosenZone.id,
    };
  }

  return {};
}

/**
 * Removes scheduler-specific fields that are no longer relevant.
 */
function stripSchedulerFields(turn) {
  const { orderBy, tokenType, zone, ...rest } = turn;
  return rest;
}

export const schedulerSwapMutation = {
  name: "scheduler-swap",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const turn = definition.turn ?? {};
    const currentScheduler = turn.scheduler ?? "round_robin";
    const candidates = getValidSwapTargets(definition, currentScheduler);

    if (candidates.length === 0) {
      return { ...genome, definition };
    }

    const idx = getRandomIndex(candidates.length, rng);
    const newScheduler = candidates[Math.max(0, idx)];
    const stripped = stripSchedulerFields(turn);
    const extraFields = buildSchedulerFields(newScheduler, definition, rng);

    definition.turn = {
      ...stripped,
      scheduler: newScheduler,
      ...extraFields,
    };

    return { ...genome, definition };
  },
};
