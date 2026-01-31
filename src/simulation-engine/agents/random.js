/**
 * Pick a random arg value from a domain array.
 * @param {Array} domain
 * @param {number} count
 * @param {boolean} unique
 * @param {object} rng
 * @returns {*}
 */
function pickRandomArgs(domain, count, unique, rng) {
  if (!Array.isArray(domain) || domain.length === 0) {
    return count === 1 ? undefined : [];
  }
  if (count === 1) {
    const index = rng?.nextInt
      ? rng.nextInt(domain.length)
      : Math.floor(Math.random() * domain.length);
    return domain[index];
  }
  const pool = [...domain];
  const picks = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const index = rng?.nextInt
      ? rng.nextInt(pool.length)
      : Math.floor(Math.random() * pool.length);
    picks.push(pool[index]);
    if (unique) {
      pool.splice(index, 1);
    }
  }
  return picks;
}

export function createRandomPolicy() {
  return {
    selectAction({ legalActions, legalMoves, rng }) {
      const moves = legalMoves ?? legalActions;
      if (!moves || moves.length === 0) {
        return undefined;
      }

      const index = rng?.nextInt
        ? rng.nextInt(moves.length)
        : Math.floor(Math.random() * moves.length);

      if (legalMoves) {
        const move = legalMoves[index];
        const action = move.action;
        const params = action.params ?? [];
        const domains = move.domains;
        const args = {};
        for (const param of params) {
          const domain = domains[param.id];
          const count = param.count ?? 1;
          const unique = param.unique ?? (count > 1);
          args[param.id] = pickRandomArgs(domain, count, unique, rng);
        }
        return { actionId: action.id, args };
      }

      return { actionId: legalActions[index]?.id, args: {} };
    },
  };
}
