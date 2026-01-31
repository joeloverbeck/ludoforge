/**
 * Safely extract turn, round, phase, and active player from game state.
 *
 * @param {object | null | undefined} gameState
 * @returns {{ turn: number, round: number, phase: string, activePlayerId: number | null }}
 */
export function extractTurnInfo(gameState) {
  const turnObj = gameState?.turn;
  return {
    turn: turnObj?.turn ?? 0,
    round: turnObj?.round ?? 0,
    phase: turnObj?.phase ?? "main",
    activePlayerId: turnObj?.currentPlayer ?? null,
  };
}
