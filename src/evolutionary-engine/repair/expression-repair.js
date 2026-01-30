/**
 * @param {object} expr
 * @param {Set<string>} variableIds
 * @returns {boolean}
 */
export function exprReferencesMissingVariable(expr, variableIds) {
  if (!expr || typeof expr !== "object") {
    return false;
  }
  switch (expr.kind) {
    case "and":
    case "or":
    case "cmp":
      return (
        exprReferencesMissingVariable(expr.left, variableIds) ||
        exprReferencesMissingVariable(expr.right, variableIds)
      );
    case "not":
      return exprReferencesMissingVariable(expr.value, variableIds);
    case "ref":
      if (expr.ref?.kind === "var" && typeof expr.ref.id === "string") {
        return !variableIds.has(expr.ref.id);
      }
      return false;
    default:
      return false;
  }
}
