import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";

const LOG_ADAPTER_VERSION = "0.1.0";

const schemaJson = JSON.parse(
  readFileSync(
    new URL("../../schemas/simulation-engine/simulation-result.schema.json", import.meta.url)
  )
);
const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validateSimulationResult = ajv.compile(schemaJson);

class LogAdapterError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "LogAdapterError";
    this.code = code;
    if (details != null) {
      this.details = details;
    }
  }
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function defaultStateHasher(state) {
  return JSON.stringify({
    variables: state.variables,
    tokens: state.tokens,
    zones: state.zones,
    turn: {
      currentPlayer: state.turn?.currentPlayer ?? null,
      phase: state.turn?.phase ?? null,
    },
  });
}

function validateInput(input) {
  if (!isRecord(input)) {
    return {
      ok: false,
      error: new LogAdapterError("invalid_input", "Adapter input must be an object."),
    };
  }
  if (input.version !== LOG_ADAPTER_VERSION) {
    return {
      ok: false,
      error: new LogAdapterError("invalid_version", "Unsupported log adapter version.", {
        version: input.version,
      }),
    };
  }
  if (!isRecord(input.log)) {
    return {
      ok: false,
      error: new LogAdapterError("invalid_input", "Adapter input must include a log object."),
    };
  }
  if (!isRecord(input.log.definition)) {
    return {
      ok: false,
      error: new LogAdapterError("missing_definition", "Log definition is required."),
    };
  }
  if (!Array.isArray(input.log.results)) {
    return {
      ok: false,
      error: new LogAdapterError("missing_results", "Log results must be an array."),
    };
  }
  return { ok: true, log: input.log };
}

function buildTrajectorySummary(result, index) {
  if (!validateSimulationResult(result)) {
    return {
      ok: false,
      error: new LogAdapterError(
        "invalid_result",
        "Simulation result failed schema validation.",
        {
          index,
          errors: validateSimulationResult.errors,
        }
      ),
    };
  }
  if (!isRecord(result)) {
    return {
      ok: false,
      error: new LogAdapterError("invalid_result", "Simulation result must be an object.", {
        index,
      }),
    };
  }
  if (!isRecord(result.trajectory) || !Array.isArray(result.trajectory.steps)) {
    return {
      ok: false,
      error: new LogAdapterError("invalid_result", "Simulation result must include steps.", {
        index,
      }),
    };
  }
  if (typeof result.terminated !== "boolean") {
    return {
      ok: false,
      error: new LogAdapterError("invalid_result", "Simulation result must include terminated.", {
        index,
      }),
    };
  }
  if (!isRecord(result.outcome)) {
    return {
      ok: false,
      error: new LogAdapterError("invalid_result", "Simulation result must include outcome.", {
        index,
      }),
    };
  }

  const steps = result.trajectory.steps;
  const actionCounts = {};
  const stateHashes = new Set();
  let turnCount = 0;

  for (const step of steps) {
    if (!isRecord(step) || !isRecord(step.state)) {
      return {
        ok: false,
        error: new LogAdapterError("invalid_result", "Trajectory steps must include state.", {
          index,
        }),
      };
    }
    if (typeof step.turn === "number") {
      turnCount = Math.max(turnCount, step.turn);
    }
    if (typeof step.actionId === "string") {
      actionCounts[step.actionId] = (actionCounts[step.actionId] ?? 0) + 1;
    }
    stateHashes.add(defaultStateHasher(step.state));
  }

  const summary = {
    stepCount: steps.length,
    turnCount,
    terminalOutcome: result.outcome,
    terminationReason: result.terminationReason,
    terminated: result.terminated,
    actionCounts: Object.keys(actionCounts).length > 0 ? actionCounts : undefined,
    uniqueStateCount: stateHashes.size,
    keySteps: steps.map((step) => ({
      turn: step.turn,
      phase: step.phase ?? null,
      playerId: step.playerId ?? null,
      actionId: step.actionId,
      legalActionCount: step.legalActionCount,
      affectedPlayerIds: Array.isArray(step.affectedPlayerIds) ? [...step.affectedPlayerIds] : [],
      affectedGlobal: typeof step.affectedGlobal === "boolean" ? step.affectedGlobal : false,
    })),
  };

  return { ok: true, summary };
}

function adaptSimulationLog(input) {
  const validation = validateInput(input);
  if (!validation.ok) {
    return validation;
  }

  const log = validation.log;
  const trajectorySummaries = [];

  for (let index = 0; index < log.results.length; index += 1) {
    const result = log.results[index];
    const summaryResult = buildTrajectorySummary(result, index);
    if (!summaryResult.ok) {
      return summaryResult;
    }
    trajectorySummaries.push(summaryResult.summary);
  }

  return {
    ok: true,
    value: {
      input: {
        definition: log.definition,
        simulations: log.results,
        logMetadata: log.metadata,
      },
      trajectorySummaries,
    },
  };
}

export { LOG_ADAPTER_VERSION, LogAdapterError, adaptSimulationLog };
