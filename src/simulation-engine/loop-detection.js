/**
 * Loop detection helpers for the simulation loop.
 * @module simulation-engine/loop-detection
 */

/**
 * Default state hasher — serialises the parts of state relevant
 * to repeated-position detection.
 * @param {import("../game-kernel/index.js").GameState} state
 * @returns {string}
 */
export function defaultStateHasher(state) {
  return JSON.stringify({
    variables: state.variables,
    tokens: state.tokens,
    zones: state.zones,
    turn: {
      currentPlayer: state.turn.currentPlayer,
      phase: state.turn.phase ?? null,
    },
  });
}

/**
 * Record a state hash and return whether the state has been seen
 * more than `tracker.maxRepeatedStates` times.
 * @param {object} state
 * @param {object|null} tracker
 * @returns {{ repeated: boolean }}
 */
export function recordLoopHash(state, tracker) {
  if (!tracker) {
    return { repeated: false };
  }
  const hash = tracker.hasher(state);
  const next = (tracker.counts.get(hash) ?? 0) + 1;
  tracker.counts.set(hash, next);
  if (tracker.maxRepeatedStates != null && next > tracker.maxRepeatedStates) {
    return { repeated: true };
  }
  return { repeated: false };
}
