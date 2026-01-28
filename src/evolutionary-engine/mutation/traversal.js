function updateExpr(expr, { onTokenRef, onZoneRef }) {
  if (!expr || typeof expr !== "object") {
    return;
  }
  switch (expr.kind) {
    case "and":
    case "or":
    case "cmp":
      updateExpr(expr.left, { onTokenRef, onZoneRef });
      updateExpr(expr.right, { onTokenRef, onZoneRef });
      break;
    case "not":
      updateExpr(expr.value, { onTokenRef, onZoneRef });
      break;
    case "ref":
      if (expr.ref) {
        if (onTokenRef) {
          onTokenRef(expr.ref);
        }
        if (onZoneRef) {
          onZoneRef(expr.ref);
        }
      }
      break;
    default:
      break;
  }
}

function updateSelector(selector, { onTokenType, onZone, onTokenRef, onZoneRef }) {
  if (!selector || typeof selector !== "object") {
    return;
  }
  if (typeof selector.tokenType === "string") {
    onTokenType?.(selector);
  }
  if (typeof selector.zone === "string") {
    onZone?.(selector);
  }
  if (selector.where) {
    updateExpr(selector.where, { onTokenRef, onZoneRef });
  }
}

function updateEffect(effect, { onTokenRef, onZoneRef, onZoneTo }) {
  if (!effect || typeof effect !== "object") {
    return;
  }
  if (effect.target) {
    if (onTokenRef) {
      onTokenRef(effect.target);
    }
    if (onZoneRef) {
      onZoneRef(effect.target);
    }
  }
  if (typeof effect.toZone === "string" && onZoneTo) {
    onZoneTo(effect);
  }
}

function updateAction(action, handlers) {
  if (!action || typeof action !== "object") {
    return;
  }
  if (action.preconditions) {
    updateExpr(action.preconditions, handlers);
  }
  if (Array.isArray(action.costs)) {
    action.costs.forEach((effect) => updateEffect(effect, handlers));
  }
  if (Array.isArray(action.effects)) {
    action.effects.forEach((effect) => updateEffect(effect, handlers));
  }
  if (Array.isArray(action.targets)) {
    action.targets.forEach((target) => {
      updateSelector(target?.selector, handlers);
    });
  }
}

function updateTriggers(list, handlers) {
  if (!Array.isArray(list)) {
    return;
  }
  list.forEach((trigger) => {
    if (trigger?.condition) {
      updateExpr(trigger.condition, handlers);
    }
    if (Array.isArray(trigger?.effects)) {
      trigger.effects.forEach((effect) => updateEffect(effect, handlers));
    }
  });
}

export {
  updateAction,
  updateEffect,
  updateExpr,
  updateSelector,
  updateTriggers,
};
