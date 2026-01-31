import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";
import { evaluateExpr } from "../../../dsl/semantic/expr-evaluator.js";
import { buildExprEvalContext } from "../../repair/expr-eval-context.js";

export const preconditionNegationMutation = {
  name: "precondition-negation",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const exprEvalContext = buildExprEvalContext(definition);
    const targets = collectActionTargets(definition)
      .filter((target) => target.action?.preconditions)
      .filter((target) => {
        const negated = { kind: "not", value: target.action.preconditions };
        return evaluateExpr(negated, exprEvalContext).possible !== false;
      });
    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const action = target.action;
    definition.actions[target.index] = {
      ...action,
      preconditions: { kind: "not", value: action.preconditions },
    };

    return { ...genome, definition };
  },
};
