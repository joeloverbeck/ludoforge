/**
 * Color assignment utilities for token types and players in the TUI.
 */

const TOKEN_COLORS = ["cyan", "yellow", "magenta", "green", "red", "blue", "white"];

const PLAYER_COLORS = ["green", "red", "blue", "yellow", "cyan", "magenta"];

/**
 * Build a map from token type id → color name.
 * Colors cycle through TOKEN_COLORS in declaration order.
 *
 * @param {Array<{ id: string }>} tokenTypes
 * @returns {Record<string, string>}
 */
export function buildTokenColorMap(tokenTypes) {
  /** @type {Record<string, string>} */
  const map = {};
  for (let i = 0; i < tokenTypes.length; i++) {
    map[tokenTypes[i].id] = TOKEN_COLORS[i % TOKEN_COLORS.length];
  }
  return map;
}

/**
 * Return a color name for the given player index (0-based).
 *
 * @param {number} index
 * @returns {string}
 */
export function playerColor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export { TOKEN_COLORS, PLAYER_COLORS };
