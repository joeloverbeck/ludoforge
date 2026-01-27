export function createEventStream() {
  return [];
}

export function recordStateUpdate(events, state, context = {}) {
  if (!events) {
    return;
  }
  events.push({
    type: "state_update",
    turn: { ...state.turn },
    context,
  });
}

export function recordTermination(events, result) {
  if (!events) {
    return;
  }
  events.push({
    type: "termination",
    reason: result.reason,
    conditionIndex: result.conditionIndex,
    outcomes: result.outcomes,
    scores: result.scores,
  });
}
