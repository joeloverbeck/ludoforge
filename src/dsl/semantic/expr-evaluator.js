export function evaluateCmp(domain, op, literal) {
  if (!domain || typeof op !== "string") {
    return { possible: true, alwaysTrue: false };
  }
  if (domain.kind === "int") {
    const min = domain.min;
    const max = domain.max;
    if (typeof literal !== "number") {
      if (op === "==") {
        return { possible: false, alwaysTrue: false };
      }
      if (op === "!=") {
        return { possible: true, alwaysTrue: true };
      }
      return { possible: true, alwaysTrue: false };
    }
    switch (op) {
      case "==": {
        const possible = literal >= min && literal <= max;
        return { possible, alwaysTrue: possible && min === max && min === literal };
      }
      case "!=": {
        const alwaysTrue = literal < min || literal > max;
        const possible = !alwaysTrue && !(min === max && min === literal);
        return { possible, alwaysTrue };
      }
      case "<":
        return { possible: min < literal, alwaysTrue: max < literal };
      case "<=":
        return { possible: min <= literal, alwaysTrue: max <= literal };
      case ">":
        return { possible: max > literal, alwaysTrue: min > literal };
      case ">=":
        return { possible: max >= literal, alwaysTrue: min >= literal };
      default:
        return { possible: true, alwaysTrue: false };
    }
  }
  if (domain.kind === "bool") {
    if (typeof literal !== "boolean") {
      if (op === "==") {
        return { possible: false, alwaysTrue: false };
      }
      if (op === "!=") {
        return { possible: true, alwaysTrue: true };
      }
      return { possible: true, alwaysTrue: false };
    }
    if (op === "==") {
      return { possible: true, alwaysTrue: false };
    }
    if (op === "!=") {
      return { possible: true, alwaysTrue: false };
    }
    return { possible: true, alwaysTrue: false };
  }
  if (domain.kind === "enum") {
    if (typeof literal !== "string") {
      if (op === "==") {
        return { possible: false, alwaysTrue: false };
      }
      if (op === "!=") {
        return { possible: true, alwaysTrue: true };
      }
      return { possible: true, alwaysTrue: false };
    }
    const includes = domain.values.includes(literal);
    if (op === "==") {
      return { possible: includes, alwaysTrue: includes && domain.values.length === 1 };
    }
    if (op === "!=") {
      return {
        possible: domain.values.length > (includes ? 1 : 0),
        alwaysTrue: !includes,
      };
    }
    return { possible: true, alwaysTrue: false };
  }
  return { possible: true, alwaysTrue: false };
}

export function evaluateExpr(expr, context) {
  if (!expr || typeof expr !== "object") {
    return { possible: true, alwaysTrue: false };
  }
  const domainForRef = context?.domainForRef;
  const domainContext = context?.domainContext;

  switch (expr.kind) {
    case "value":
      if (typeof expr.value === "boolean") {
        return { possible: expr.value, alwaysTrue: expr.value };
      }
      return { possible: true, alwaysTrue: false };
    case "ref": {
      const domain = typeof domainForRef === "function" ? domainForRef(expr.ref, domainContext) : null;
      if (domain?.kind === "bool") {
        return { possible: true, alwaysTrue: false };
      }
      return { possible: true, alwaysTrue: false };
    }
    case "not": {
      const inner = evaluateExpr(expr.value, context);
      return { possible: !inner.alwaysTrue, alwaysTrue: inner.possible === false };
    }
    case "and": {
      const left = evaluateExpr(expr.left, context);
      const right = evaluateExpr(expr.right, context);
      return { possible: left.possible && right.possible, alwaysTrue: left.alwaysTrue && right.alwaysTrue };
    }
    case "or": {
      const left = evaluateExpr(expr.left, context);
      const right = evaluateExpr(expr.right, context);
      return { possible: left.possible || right.possible, alwaysTrue: left.alwaysTrue || right.alwaysTrue };
    }
    case "cmp": {
      const left = expr.left;
      const right = expr.right;
      const op = expr.op;
      if (!left || !right || typeof op !== "string") {
        return { possible: true, alwaysTrue: false };
      }
      if (left.kind === "value" && right.kind === "value") {
        const leftValue = left.value;
        const rightValue = right.value;
        if (op === "==" || op === "!=") {
          const result = op === "==" ? leftValue === rightValue : leftValue !== rightValue;
          return { possible: result, alwaysTrue: result };
        }
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          switch (op) {
            case "<":
              return { possible: leftValue < rightValue, alwaysTrue: leftValue < rightValue };
            case "<=":
              return { possible: leftValue <= rightValue, alwaysTrue: leftValue <= rightValue };
            case ">":
              return { possible: leftValue > rightValue, alwaysTrue: leftValue > rightValue };
            case ">=":
              return { possible: leftValue >= rightValue, alwaysTrue: leftValue >= rightValue };
            default:
              return { possible: true, alwaysTrue: false };
          }
        }
        return { possible: true, alwaysTrue: false };
      }
      if (left.kind === "ref" && left.ref && right.kind === "value") {
        const domain =
          typeof domainForRef === "function" ? domainForRef(left.ref, domainContext) : null;
        return evaluateCmp(domain, op, right.value);
      }
      if (left.kind === "value" && right.kind === "ref" && right.ref) {
        const inverse = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "==": "==", "!=": "!=" };
        const invertedOp = inverse[op] ?? op;
        const domain =
          typeof domainForRef === "function" ? domainForRef(right.ref, domainContext) : null;
        return evaluateCmp(domain, invertedOp, left.value);
      }
      return { possible: true, alwaysTrue: false };
    }
    default:
      return { possible: true, alwaysTrue: false };
  }
}
