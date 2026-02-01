/**
 * Detect duplicate actions (identical except for id).
 * @param {Array} actions
 * @param {Function} pushIssue
 */
export function detectDuplicateActions(actions, pushIssue) {
  if (!Array.isArray(actions) || actions.length < 2) {
    return;
  }

  const seen = new Map();
  actions.forEach((action, index) => {
    if (!action || typeof action !== "object") {
      return;
    }
    const { id: _id, ...rest } = action;
    const key = JSON.stringify(rest);
    if (seen.has(key)) {
      const prevIndex = seen.get(key);
      pushIssue(
        `/actions/${index}`,
        `Action "${action.id ?? index}" is a duplicate of action at index ${prevIndex}`,
        "duplicate-action"
      );
    } else {
      seen.set(key, index);
    }
  });
}
