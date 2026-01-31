import { getRandomIndex, pickDifferentValue } from "../random.js";
import { tweakIntValue } from "../value-tweaks.js";

const COMPARATORS = [">=", "<=", ">", "<", "=="];

function swapComparator(expr, rng) {
  if (expr?.kind !== "cmp") return expr;
  const newOp = pickDifferentValue(COMPARATORS, expr.op, rng);
  return { ...expr, op: newOp };
}

function swapVarRef(expr, variables, rng) {
  if (expr?.kind !== "cmp") return expr;
  const left = expr.left;
  if (!left || left.kind !== "ref" || left.ref?.kind !== "var") return expr;

  const intVars = variables.filter((v) => v.type?.kind === "int");
  if (intVars.length <= 1) return expr;

  const newVar = pickDifferentValue(
    intVars.map((v) => v.id),
    left.ref.id,
    rng,
  );
  return {
    ...expr,
    left: { ...left, ref: { ...left.ref, id: newVar } },
  };
}

function adjustConstant(expr, variables, rng) {
  if (expr?.kind !== "cmp") return expr;
  const right = expr.right;
  if (!right || right.kind !== "value" || typeof right.value !== "number") return expr;

  const left = expr.left;
  if (!left || left.kind !== "ref" || left.ref?.kind !== "var") return expr;

  const variable = variables.find((v) => v.id === left.ref.id);
  if (!variable || variable.type?.kind !== "int") return expr;

  const min = typeof variable.type.min === "number" ? variable.type.min : 0;
  const max = typeof variable.type.max === "number" ? variable.type.max : 10;
  const newValue = tweakIntValue(right.value, min, max, rng);

  return { ...expr, right: { ...right, value: newValue } };
}

function wrapWithNot(expr) {
  return { kind: "not", operand: expr };
}

function unwrapNot(expr) {
  if (expr?.kind === "not" && expr.operand) {
    return expr.operand;
  }
  return expr;
}

const SUB_MUTATIONS = [
  (expr, _vars, rng) => swapComparator(expr, rng),
  (expr, vars, rng) => swapVarRef(expr, vars, rng),
  (expr, vars, rng) => adjustConstant(expr, vars, rng),
  (expr) => wrapWithNot(expr),
  (expr) => unwrapNot(expr),
];

export const terminationConditionMutateMutation = {
  name: "termination-condition-mutate",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const conditions = Array.isArray(definition?.termination?.conditions)
      ? definition.termination.conditions
      : [];
    const variables = Array.isArray(definition?.state?.variables) ? definition.state.variables : [];

    if (conditions.length === 0) {
      return { ...genome, definition };
    }

    const targetIdx = getRandomIndex(conditions.length, rng);
    if (targetIdx < 0) return { ...genome, definition };

    const tc = conditions[targetIdx];
    if (!tc.condition) return { ...genome, definition };

    const subIdx = getRandomIndex(SUB_MUTATIONS.length, rng);
    const subMutation = SUB_MUTATIONS[Math.max(0, subIdx)];
    const newConditionExpr = subMutation(tc.condition, variables, rng);

    definition.termination.conditions = conditions.map((c, i) =>
      i === targetIdx ? { ...c, condition: newConditionExpr } : c,
    );

    return { ...genome, definition };
  },
};
