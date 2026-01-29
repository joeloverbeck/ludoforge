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

  function validateEffect(effect, path, options = {}) {
    if (!effect || typeof effect !== "object") {
      return;
    }
    if (effect.target) {
      validateRef(effect.target, joinPath(path, "target"), {
        allowMeta: false,
        actionBindingIds: options.actionBindingIds,
      });
    }
    validateZoneRef(effect.toZone, joinPath(path, "toZone"));

    if (effect.kind === "move_spatial") {
      validateZoneRef(effect.zone, joinPath(path, "zone"));
    }

    if (effect.kind === "repeat") {
      const subEffects = Array.isArray(effect.effects) ? effect.effects : [];
      subEffects.forEach((subEffect, idx) => {
        validateEffect(subEffect, joinPath(path, `effects/${idx}`), options);
      });
    }
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
