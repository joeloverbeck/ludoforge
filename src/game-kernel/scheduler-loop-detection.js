const loopHistoryByState = new WeakMap();

export function snapshotLoopState(state) {
  return JSON.stringify({
    variables: state.variables,
    tokens: state.tokens,
    zones: state.zones,
    turn: {
      currentPlayer: state.turn.currentPlayer,
      phase: state.turn.phase ?? null,
      turn: state.turn.turn,
      round: state.turn.round,
      turnOrder: state.turn.turnOrder ?? null,
    },
  });
}

export function getLoopHistory(state) {
  let history = loopHistoryByState.get(state);
  if (!history) {
    history = { snapshots: new Set(), order: [] };
    loopHistoryByState.set(state, history);
  }
  return history;
}

export function seedLoopHistory(state, limit) {
  const history = getLoopHistory(state);
  if (history.order.length > 0) {
    return;
  }
  const snapshot = snapshotLoopState(state);
  history.snapshots.add(snapshot);
  history.order.push(snapshot);
  if (history.order.length > limit) {
    const oldest = history.order.shift();
    history.snapshots.delete(oldest);
  }
}

export function recordLoopState(state, limit) {
  const history = getLoopHistory(state);
  const snapshot = snapshotLoopState(state);
  if (history.snapshots.has(snapshot)) {
    return { looped: true, snapshot };
  }
  history.snapshots.add(snapshot);
  history.order.push(snapshot);
  if (history.order.length > limit) {
    const oldest = history.order.shift();
    history.snapshots.delete(oldest);
  }
  return { looped: false, snapshot };
}
