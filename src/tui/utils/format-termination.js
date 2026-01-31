/**
 * Format a DSL expression tree into a human-readable string.
 *
 * @param {object} expr
 * @returns {string}
 */
export function formatExpr(expr) {
  if (!expr || typeof expr !== "object") return "<?>";

  switch (expr.kind) {
    case "value":
      return String(expr.value);
    case "ref": {
      const r = expr.ref;
      if (!r) return "<?>";
      const base = r.id ?? "<?>";
      return r.attribute ? `${base}.${r.attribute}` : base;
    }
    case "cmp":
      return `${formatExpr(expr.left)} ${expr.op} ${formatExpr(expr.right)}`;
    case "and":
      return `(${formatExpr(expr.left)} AND ${formatExpr(expr.right)})`;
    case "or":
      return `(${formatExpr(expr.left)} OR ${formatExpr(expr.right)})`;
    case "not":
      return `NOT (${formatExpr(expr.value)})`;
    case "arith":
      return `(${formatExpr(expr.left)} ${expr.op} ${formatExpr(expr.right)})`;
    default:
      return "<?>";
  }
}

/**
 * Convert a termination outcome to a human-readable label.
 *
 * @param {object} outcome
 * @returns {string}
 */
function formatOutcome(outcome) {
  if (!outcome) return "<?>";
  const t = outcome.type;

  if (t === "draw") return "draw";

  if (Array.isArray(outcome.players)) {
    const list = outcome.players.join(", ");
    return `players ${list} ${t}`;
  }

  if (outcome.players === "all") return `all players ${t}`;
  if (outcome.players === "active") return `active player ${t === "win" ? "wins" : "loses"}`;

  return `${t}`;
}

/**
 * Format a full termination block into an array of display strings.
 *
 * @param {object | null | undefined} termination
 * @returns {string[]}
 */
export function formatTerminationConditions(termination) {
  if (!termination) return [];

  /** @type {string[]} */
  const lines = [];

  const conditions = termination.conditions;
  if (Array.isArray(conditions)) {
    for (const c of conditions) {
      lines.push(`${formatExpr(c.condition)} → ${formatOutcome(c.outcome)}`);
    }
  }

  if (typeof termination.maxTurns === "number") {
    lines.push(`Max ${termination.maxTurns} turns (draw)`);
  }

  if (termination.scoring?.perPlayer) {
    lines.push(`Scoring: ${formatExpr(termination.scoring.perPlayer)} per player`);
  }

  return lines;
}
