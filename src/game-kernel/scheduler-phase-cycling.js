export function resolvePhases(definition) {
  const phases = definition.turn.phases ?? [];
  if (phases.length === 0) {
    return [null];
  }
  return phases;
}

export function resolvePhaseAdvance(definition, state) {
  const phases = resolvePhases(definition);
  const currentPhase = state.turn.phase ?? null;
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = currentIndex >= 0 ? currentIndex : 0;

  if (phaseIndex < phases.length - 1) {
    return {
      cycling: true,
      result: {
        nextPhase: phases[phaseIndex + 1],
        nextPlayer: state.turn.currentPlayer,
        nextTurn: state.turn.turn,
        nextRound: state.turn.round,
        _actedThisRound: state.turn._actedThisRound,
      },
    };
  }

  return { cycling: false, phases };
}

export function advanceRoundTracking(state, playerCount) {
  const acted = state.turn._actedThisRound ?? new Set();
  acted.add(state.turn.currentPlayer);

  if (acted.size >= playerCount) {
    return {
      nextRound: state.turn.round + 1,
      nextActed: new Set(),
    };
  }

  return {
    nextRound: state.turn.round,
    nextActed: acted,
  };
}
