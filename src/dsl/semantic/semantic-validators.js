export function createSemanticValidators({
  validateRef,
  validateZoneRef,
  validateTokenTypeRef,
  validateVariableRef,
  joinPath,
  zoneById,
  pushIssue,
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
    validateZoneRef(effect.fromZone, joinPath(path, "fromZone"));

    if (effect.kind === "move_spatial") {
      validateZoneRef(effect.zone, joinPath(path, "zone"));
    }

    if (effect.kind === "repeat") {
      const subEffects = Array.isArray(effect.effects) ? effect.effects : [];
      subEffects.forEach((subEffect, idx) => {
        validateEffect(subEffect, joinPath(path, `effects/${idx}`), options);
      });
    }

    if (effect.kind === "conditional") {
      if (effect.condition) {
        validateExpr(effect.condition, joinPath(path, "condition"));
      }
      const thenEffects = Array.isArray(effect.then) ? effect.then : [];
      thenEffects.forEach((subEffect, idx) => {
        validateEffect(subEffect, joinPath(path, `then/${idx}`), options);
      });
      const elseEffects = Array.isArray(effect.else) ? effect.else : [];
      elseEffects.forEach((subEffect, idx) => {
        validateEffect(subEffect, joinPath(path, `else/${idx}`), options);
      });
    }

    if (effect.kind === "rng_choose" && Array.isArray(effect.options)) {
      effect.options.forEach((optionEffects, optIdx) => {
        if (Array.isArray(optionEffects)) {
          optionEffects.forEach((subEffect, subIdx) => {
            validateEffect(subEffect, joinPath(path, `options/${optIdx}/${subIdx}`), options);
          });
        }
      });
    }

    if (effect.kind === "set_turn_order" && typeof effect.variable === "string") {
      validateVariableRef(effect.variable, joinPath(path, "variable"));
    }

    if (effect.kind === "move" && typeof effect.toPlayer === "string" && typeof effect.toZone === "string") {
      const zone = zoneById?.get(effect.toZone);
      if (zone && zone.scope !== "per_player") {
        pushIssue?.(
          joinPath(path, "toPlayer"),
          `move.toPlayer requires a per_player zone, but zone "${effect.toZone}" has scope "${zone.scope}"`,
          "move-to-player-scope"
        );
      }
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
