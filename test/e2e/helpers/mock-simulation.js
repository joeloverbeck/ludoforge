import { createInitialState } from "../../../src/game-kernel/index.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";

const DEFAULT_MAX_TURNS = 5;
const DEFAULT_TERMINAL_TURNS = 2;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTurns(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

function buildOutcomes(definition, mode) {
  const outcomes = {};
  for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
    if (mode === "cutoff") {
      outcomes[playerId] = "draw";
    } else if (playerId === 1) {
      outcomes[playerId] = "win";
    } else {
      outcomes[playerId] = "lose";
    }
  }
  return outcomes;
}

function pickActionId(actionIds, rng) {
  if (actionIds.length === 0) {
    return `mock-action-${rng.nextInt(1000)}`;
  }
  return actionIds[rng.nextInt(actionIds.length)];
}

function buildSteps(definition, stepCount, rng) {
  const actionIds = (definition.actions ?? [])
    .map((action) => action?.id)
    .filter((id) => typeof id === "string" && id.length > 0);
  const baseState = createInitialState(definition);
  const steps = [];

  for (let index = 0; index < stepCount; index += 1) {
    const actionId = pickActionId(actionIds, rng);
    const stepState = clone(baseState);
    stepState.turn.turn = index + 1;
    stepState.turn.currentPlayer = ((index % definition.players.count) || 0) + 1;

    steps.push({
      turn: stepState.turn.turn,
      phase: stepState.turn.phase ?? null,
      playerId: stepState.turn.currentPlayer ?? null,
      actionId,
      legalActionCount: actionIds.length,
      state: stepState,
    });
  }

  return steps;
}

export function createMockSimulation({
  seed = 0,
  maxTurns = DEFAULT_MAX_TURNS,
  terminalTurns = DEFAULT_TERMINAL_TURNS,
} = {}) {
  const normalizedMaxTurns = normalizeTurns(maxTurns, "maxTurns");
  const normalizedTerminalTurns = normalizeTurns(terminalTurns, "terminalTurns");

  function run({ definition, mode = "terminal", maxTurns: overrideMaxTurns, turns } = {}) {
    if (!definition || typeof definition !== "object") {
      throw new Error("Mock simulation requires a game definition.");
    }

    const effectiveMaxTurns = Number.isInteger(overrideMaxTurns)
      ? normalizeTurns(overrideMaxTurns, "maxTurns")
      : normalizedMaxTurns;
    const rng = createSeededRng(seed);

    let stepCount;
    if (Number.isInteger(turns)) {
      stepCount = normalizeTurns(turns, "turns");
    } else if (mode === "cutoff") {
      stepCount = effectiveMaxTurns;
    } else {
      stepCount = normalizedTerminalTurns;
    }

    stepCount = Math.min(stepCount, effectiveMaxTurns);

    const steps = buildSteps(definition, stepCount, rng);
    const terminationReason = mode === "cutoff" ? "max-turns" : "condition";
    const outcome = {
      terminated: true,
      reason: terminationReason,
      outcomes: buildOutcomes(definition, mode),
    };

    return {
      trajectory: { steps, events: [] },
      outcome,
      terminationReason,
    };
  }

  return { run };
}
