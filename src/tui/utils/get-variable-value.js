/**
 * Read a variable value from the game state.
 *
 * @param {object | null | undefined} gameState
 * @param {string} varId
 * @param {'global' | number} scope  — "global" or a numeric player id
 * @returns {*}  The variable value, or undefined if not found.
 */
export function getVariableValue(gameState, varId, scope) {
  if (scope === "global") {
    return gameState?.variables?.global?.[varId];
  }
  return gameState?.variables?.perPlayer?.[scope]?.[varId];
}
