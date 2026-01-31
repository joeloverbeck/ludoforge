import { getRandomIndex } from "../random.js";

/**
 * Rewrite all variable references in an expression tree.
 * Replaces references to `removedId` with `replacementId`.
 * Returns null if the subtree is unrewritable (no replacement available).
 */
function rewriteExpr(expr, removedId, replacementId) {
  if (!expr || typeof expr !== "object") return expr;

  if (expr.kind === "ref" && expr.ref?.kind === "var" && expr.ref.id === removedId) {
    if (!replacementId) {
      return { kind: "value", value: false };
    }
    return { ...expr, ref: { ...expr.ref, id: replacementId } };
  }

  if (expr.kind === "cmp") {
    return {
      ...expr,
      left: rewriteExpr(expr.left, removedId, replacementId),
      right: rewriteExpr(expr.right, removedId, replacementId),
    };
  }

  if (expr.kind === "and" || expr.kind === "or") {
    return {
      ...expr,
      operands: (expr.operands ?? []).map((o) => rewriteExpr(o, removedId, replacementId)),
    };
  }

  if (expr.kind === "not") {
    return { ...expr, operand: rewriteExpr(expr.operand, removedId, replacementId) };
  }

  return expr;
}

function rewriteEffect(effect, removedId, replacementId) {
  if (!effect || typeof effect !== "object") return effect;

  const result = { ...effect };

  if (result.target?.kind === "var" && result.target.id === removedId) {
    if (!replacementId) return null;
    result.target = { ...result.target, id: replacementId };
  }

  if (result.condition) {
    result.condition = rewriteExpr(result.condition, removedId, replacementId);
  }

  if (Array.isArray(result.then)) {
    result.then = result.then
      .map((e) => rewriteEffect(e, removedId, replacementId))
      .filter(Boolean);
  }
  if (Array.isArray(result.else)) {
    result.else = result.else
      .map((e) => rewriteEffect(e, removedId, replacementId))
      .filter(Boolean);
  }
  if (Array.isArray(result.effects)) {
    result.effects = result.effects
      .map((e) => rewriteEffect(e, removedId, replacementId))
      .filter(Boolean);
  }

  return result;
}

function rewriteEffects(effects, removedId, replacementId) {
  if (!Array.isArray(effects)) return effects;
  return effects
    .map((e) => rewriteEffect(e, removedId, replacementId))
    .filter(Boolean);
}

export const variableRemoveMutation = {
  name: "variable-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const variables = Array.isArray(definition?.state?.variables) ? definition.state.variables : [];

    if (variables.length <= 1) {
      return { ...genome, definition };
    }

    const removeIdx = getRandomIndex(variables.length, rng);
    if (removeIdx < 0) return { ...genome, definition };

    const removedVar = variables[removeIdx];
    const removedId = removedVar.id;

    // Find a compatible replacement variable.
    const remaining = variables.filter((_, i) => i !== removeIdx);
    const sameType = remaining.filter((v) => v.type?.kind === removedVar.type?.kind);
    const replacement = sameType.length > 0
      ? sameType[getRandomIndex(sameType.length, rng)]
      : remaining[0];
    const replacementId = replacement?.id ?? null;

    definition.state.variables = remaining;

    // Rewrite actions.
    if (Array.isArray(definition.actions)) {
      definition.actions = definition.actions.map((action) => {
        const result = { ...action };
        if (Array.isArray(result.effects)) {
          result.effects = rewriteEffects(result.effects, removedId, replacementId);
        }
        if (Array.isArray(result.costs)) {
          result.costs = rewriteEffects(result.costs, removedId, replacementId);
        }
        if (result.precondition) {
          result.precondition = rewriteExpr(result.precondition, removedId, replacementId);
        }
        return result;
      });
    }

    // Rewrite triggers.
    if (Array.isArray(definition.triggers)) {
      definition.triggers = definition.triggers.map((trigger) => {
        const result = { ...trigger };
        if (result.condition) {
          result.condition = rewriteExpr(result.condition, removedId, replacementId);
        }
        if (Array.isArray(result.effects)) {
          result.effects = rewriteEffects(result.effects, removedId, replacementId);
        }
        return result;
      });
    }

    // Rewrite termination conditions.
    if (Array.isArray(definition.termination?.conditions)) {
      definition.termination.conditions = definition.termination.conditions.map((tc) => {
        const result = { ...tc };
        if (result.condition) {
          result.condition = rewriteExpr(result.condition, removedId, replacementId);
        }
        return result;
      });
    }

    // Rewrite turn.orderBy.variable.
    if (definition.turn?.orderBy?.variable === removedId) {
      definition.turn = {
        ...definition.turn,
        orderBy: {
          ...definition.turn.orderBy,
          variable: replacementId ?? remaining[0]?.id ?? removedId,
        },
      };
    }

    return { ...genome, definition };
  },
};
