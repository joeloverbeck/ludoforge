/**
 * Detect overlapping termination conditions with different outcomes on the same variable.
 * @param {Array} conditions - terminationConditions array
 * @param {Map<string, object>} variableById
 * @param {Function} pushIssue
 */
export function detectOverlappingTerminations(conditions, variableById, pushIssue) {
  if (!Array.isArray(conditions) || conditions.length < 2) {
    return;
  }

  const cmpEntries = [];
  conditions.forEach((entry, index) => {
    if (!entry?.condition || entry.condition.kind !== "cmp") {
      return;
    }
    const cond = entry.condition;
    const varId =
      cond.left?.kind === "ref" && cond.left.ref?.kind === "var" && typeof cond.left.ref.id === "string"
        ? cond.left.ref.id
        : null;
    if (!varId) {
      return;
    }
    if (cond.right?.kind !== "value" || typeof cond.right.value !== "number") {
      return;
    }
    cmpEntries.push({
      index,
      varId,
      op: cond.op,
      threshold: cond.right.value,
      outcome: entry.outcome?.type,
    });
  });

  for (let i = 0; i < cmpEntries.length; i++) {
    for (let j = i + 1; j < cmpEntries.length; j++) {
      const a = cmpEntries[i];
      const b = cmpEntries[j];

      if (a.varId !== b.varId) {
        continue;
      }
      if (a.outcome === b.outcome) {
        continue;
      }

      const variable = variableById.get(a.varId);
      const min = variable?.type?.kind === "int" ? (variable.type.min ?? -Infinity) : -Infinity;
      const max = variable?.type?.kind === "int" ? (variable.type.max ?? Infinity) : Infinity;

      if (rangesOverlap(a.op, a.threshold, b.op, b.threshold, min, max)) {
        pushIssue(
          `/termination/conditions/${b.index}`,
          `Termination conditions ${a.index} (${a.op} ${a.threshold} → ${a.outcome}) and ${b.index} (${b.op} ${b.threshold} → ${b.outcome}) on variable "${a.varId}" can both be true simultaneously`,
          "termination-overlap"
        );
      }
    }
  }
}

/**
 * Check if two comparison ranges can both be satisfied by the same integer in [min, max].
 */
function rangesOverlap(opA, thA, opB, thB, min, max) {
  const setA = expandRange(opA, thA, min, max);
  const setB = expandRange(opB, thB, min, max);

  for (const v of setA) {
    if (setB.has(v)) {
      return true;
    }
  }
  return false;
}

/**
 * Expand a comparison to the set of integer values it satisfies within [min, max].
 * For large ranges this is bounded by the variable bounds.
 */
function expandRange(op, threshold, min, max) {
  const result = new Set();
  for (let v = min; v <= max; v++) {
    if (satisfies(op, v, threshold)) {
      result.add(v);
    }
  }
  return result;
}

function satisfies(op, value, threshold) {
  switch (op) {
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case ">": return value > threshold;
    case "<": return value < threshold;
    case "==": return value === threshold;
    case "!=": return value !== threshold;
    default: return false;
  }
}
