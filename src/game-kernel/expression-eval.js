import { resolveRefValue } from "./ref-resolution.js";

function evaluateArith(left, right, op) {
  if (typeof left !== "number" || typeof right !== "number") {
    return undefined;
  }
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? undefined : Math.trunc(left / right);
    case "%":
      return right === 0 ? undefined : ((left % right) + right) % right;
    default:
      return undefined;
  }
}

export function evaluateValue(expr, context) {
  if (!expr || typeof expr !== "object") {
    return undefined;
  }
  switch (expr.kind) {
    case "value":
      return expr.value;
    case "ref":
      return resolveRefValue(expr.ref, context);
    case "arith": {
      const left = evaluateValue(expr.left, context);
      const right = evaluateValue(expr.right, context);
      return evaluateArith(left, right, expr.op);
    }
    case "cmp":
    case "and":
    case "or":
    case "not":
      return evaluateExpr(expr, context);
    default:
      return undefined;
  }
}

function compareValues(left, right, op) {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case "<":
      return typeof left === "number" && typeof right === "number" && left < right;
    case "<=":
      return typeof left === "number" && typeof right === "number" && left <= right;
    case ">":
      return typeof left === "number" && typeof right === "number" && left > right;
    case ">=":
      return typeof left === "number" && typeof right === "number" && left >= right;
    default:
      return false;
  }
}

export function evaluateExpr(expr, context) {
  if (!expr || typeof expr !== "object") {
    return false;
  }
  switch (expr.kind) {
    case "and":
      return Boolean(evaluateExpr(expr.left, context)) && Boolean(evaluateExpr(expr.right, context));
    case "or":
      return Boolean(evaluateExpr(expr.left, context)) || Boolean(evaluateExpr(expr.right, context));
    case "not":
      return !Boolean(evaluateExpr(expr.value, context));
    case "cmp": {
      const left = evaluateValue(expr.left, context);
      const right = evaluateValue(expr.right, context);
      return compareValues(left, right, expr.op ?? "==");
    }
    case "value":
      return Boolean(expr.value);
    case "ref":
      return Boolean(resolveRefValue(expr.ref, context));
    case "arith": {
      const result = evaluateValue(expr, context);
      return result !== undefined && result !== 0;
    }
    default:
      return false;
  }
}
