/**
 * Simultaneous-mode player ordering utilities.
 * @module simulation-engine/simultaneous-order
 */

/**
 * Build an array [1, 2, ..., count] of player IDs.
 * @param {object} definition
 * @returns {number[]}
 */
export function buildPlayerOrder(definition) {
  const players = [];
  for (let pid = 1; pid <= definition.players.count; pid += 1) {
    players.push(pid);
  }
  return players;
}

/**
 * Fisher-Yates shuffle (returns a new array).
 * @param {number[]} players
 * @param {object} [rng]
 * @returns {number[]}
 */
export function shufflePlayers(players, rng) {
  const result = players.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = rng?.nextInt
      ? rng.nextInt(i + 1)
      : Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Determine resolution order for simultaneous turns.
 * @param {object} definition
 * @param {object} [rng]
 * @returns {number[]}
 */
export function resolveSimultaneousOrder(definition, rng) {
  const resolution = definition.turn?.resolution?.order ?? "by_player_id";
  const players = buildPlayerOrder(definition);
  if (resolution === "random") {
    return shufflePlayers(players, rng);
  }
  return players;
}
