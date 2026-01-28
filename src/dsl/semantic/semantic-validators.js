export function createSemanticValidators({
  validateRef,
  validateZoneRef,
  validateTokenTypeRef,
  joinPath,
}) {
  function validateSelector(selector, path) {
    if (!selector || typeof selector !== "object") {
      return;
    }
    validateZoneRef(selector.zone, joinPath(path, "zone"));
    validateTokenTypeRef(selector.tokenType, joinPath(path, "tokenType"));
    if (selector.where) {
      validateExpr(selector.where, joinPath(path, "where"));
    }
  }

  function validateEffect(effect, path) {
    if (!effect || typeof effect !== "object") {
      return;
    }
    if (effect.target) {
      validateRef(effect.target, joinPath(path, "target"), { allowMeta: false });
    }
    validateZoneRef(effect.toZone, joinPath(path, "toZone"));
  }

  function validateExpr(expr, path) {
    if (!expr || typeof expr !== "object") {
      return;
    }
    switch (expr.kind) {
      case "and":
      case "or":
        if (expr.left) {
          validateExpr(expr.left, joinPath(path, "left"));
        }
        if (expr.right) {
          validateExpr(expr.right, joinPath(path, "right"));
        }
        break;
      case "not":
        if (expr.value) {
          validateExpr(expr.value, joinPath(path, "value"));
        }
        break;
      case "cmp":
        if (expr.left) {
          validateExpr(expr.left, joinPath(path, "left"));
        }
        if (expr.right) {
          validateExpr(expr.right, joinPath(path, "right"));
        }
        break;
      case "ref":
        if (expr.ref) {
          validateRef(expr.ref, joinPath(path, "ref"), { allowMeta: true });
        }
        break;
      default:
        break;
    }
  }

  return {
    validateSelector,
    validateEffect,
    validateExpr,
  };
}
