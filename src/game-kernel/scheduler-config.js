export const DEFAULT_MAX_TRIGGER_DEPTH = 8;
export const DEFAULT_MAX_STEPS_PER_TURN = 1000;
export const DEFAULT_STATE_HISTORY_LIMIT = 256;

export function resolveMaxTurns(definition, options) {
  if (typeof options.maxTurns === "number") {
    return options.maxTurns;
  }
  if (typeof definition.termination?.maxTurns === "number") {
    return definition.termination.maxTurns;
  }
  return undefined;
}

export function resolveMaxStepsPerTurn(options) {
  if (typeof options.maxStepsPerTurn === "number") {
    return options.maxStepsPerTurn;
  }
  return DEFAULT_MAX_STEPS_PER_TURN;
}

export function resolveMaxTriggerDepth(options) {
  if (typeof options.maxTriggerDepth === "number") {
    return options.maxTriggerDepth;
  }
  return DEFAULT_MAX_TRIGGER_DEPTH;
}

export function resolveStateHistoryLimit(options) {
  if (typeof options.stateHistoryLimit === "number") {
    return options.stateHistoryLimit;
  }
  return DEFAULT_STATE_HISTORY_LIMIT;
}
