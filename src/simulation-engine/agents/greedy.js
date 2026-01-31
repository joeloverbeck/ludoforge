/**
 * Enumerate all argument combinations for an action's params given domains.
 * Returns an array of args objects. For no-param actions returns [{}].
 * @param {object[]} params
 * @param {Record<string, Array>} domains
 * @returns {Array<Record<string, any>>}
 */
function enumerateCombinations(params, domains) {
  if (params.length === 0) {
    return [{}];
  }

  let combos = [{}];
  for (const param of params) {
    const domain = domains[param.id] ?? [];
    const count = param.count ?? 1;

    if (count === 1) {
      const next = [];
      for (const combo of combos) {
        for (const value of domain) {
          next.push({ ...combo, [param.id]: value });
        }
      }
      combos = next;
    } else {
      const next = [];
      for (const combo of combos) {
        next.push({ ...combo, [param.id]: domain.slice(0, count) });
      }
      combos = next;
    }

    if (combos.length === 0) {
      return [{}];
    }
  }
  return combos;
}

export function createGreedyPolicy(options = {}) {
  const scoreAction = options.scoreAction;
  return {
    selectAction(input) {
      const { legalActions, legalMoves } = input;
      const moves = legalMoves ?? legalActions;
      if (!moves || moves.length === 0) {
        return undefined;
      }

      if (legalMoves) {
        if (typeof scoreAction !== "function") {
          const first = legalMoves[0];
          const params = first.action.params ?? [];
          const args = {};
          for (const param of params) {
            const domain = first.domains[param.id] ?? [];
            const count = param.count ?? 1;
            args[param.id] = count === 1 ? domain[0] : domain.slice(0, count);
          }
          return { actionId: first.action.id, args };
        }

        let bestActionId = legalMoves[0].action.id;
        let bestArgs = {};
        let bestScore = Number.NEGATIVE_INFINITY;

        for (const move of legalMoves) {
          const params = move.action.params ?? [];
          const combos = enumerateCombinations(params, move.domains);
          for (const args of combos) {
            const score = scoreAction({ ...input, action: move.action, args });
            if (score == null) {
              continue;
            }
            if (score > bestScore) {
              bestScore = score;
              bestActionId = move.action.id;
              bestArgs = args;
            }
          }
        }
        return { actionId: bestActionId, args: bestArgs };
      }

      if (typeof scoreAction !== "function") {
        return { actionId: legalActions[0]?.id, args: {} };
      }
      let bestActionId = legalActions[0]?.id;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const action of legalActions) {
        const score = scoreAction({ ...input, action });
        if (score == null) {
          continue;
        }
        if (score > bestScore) {
          bestScore = score;
          bestActionId = action.id;
        }
      }
      return { actionId: bestActionId, args: {} };
    },
  };
}
