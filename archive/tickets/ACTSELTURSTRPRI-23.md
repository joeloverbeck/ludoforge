# ACTSELTURSTRPRI-23: Add expression arithmetic (modulo operator) (Wave 3)

**Status**: Completed

## What

Extend the `Expr` expression evaluator to support arithmetic operators, specifically modulo (`%`). This enables impulse-movement mechanics where units act on specific impulses based on their speed attribute (`impulse_counter % speed == 0`).

Add a new expression kind `arith`: `{ kind: "arith", op: "%", left: Expr, right: Expr }` that evaluates to a numeric value. Also support `+`, `-`, `*`, `/` for general utility. This value can then be used in `cmp` comparisons via the existing `evaluateValue()` dispatch.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — extend `Expr` oneOf with `arith` variant
- `src/dsl/types.ts` — add `arith` expression variant to `Expr` type
- `src/game-kernel/expression-eval.js` — add `arith` case to `evaluateValue()` and `evaluateExpr()` for arithmetic evaluation; handle division-by-zero and modulo-by-zero
- `src/dsl/semantic/expr-evaluator.js` — add `arith` case returning `{ possible: true, alwaysTrue: false }` (conservative)

**Corrected assumptions**: `evaluateExpr` lives in `src/game-kernel/expression-eval.js`, not `effects.js`. Preconditions are evaluated in `src/game-kernel/actions.js`, not `preconditions.js`.

## Out of scope

- Floating point arithmetic (integer only)
- Complex expression trees beyond 2 levels of nesting
- Expression-based effect amounts (separate concern)

## Acceptance criteria

- Test: `impulse_counter % speed == 0` evaluates correctly for various values
- Test: Modulo by zero returns `undefined` (treated as falsy in boolean context)
- Test: Division by zero returns `undefined`
- Test: Arithmetic in preconditions works (action legal only when condition met)
- Test: Nested arithmetic (`(a + b) % c`) works
- Test: All five operators (`+`, `-`, `*`, `/`, `%`) produce correct results
- Invariant: Existing `cmp` expressions continue to work unchanged
- Invariant: Schema validates arithmetic expressions
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (extends existing expression system)

## Outcome

**Changed vs planned**: The ticket originally referenced `src/game-kernel/effects.js` and `src/game-kernel/preconditions.js` — these files don't exist. The actual files are `expression-eval.js` (expression evaluator) and `actions.js` (precondition evaluation). The ticket was corrected before implementation.

**Actual changes**:
- `schemas/dsl/game-definition.v1.json` — added `arith` variant to `Expr` oneOf
- `src/dsl/types.ts` — added `arith` union member to `Expr` type
- `src/game-kernel/expression-eval.js` — added `evaluateArith()` helper and `arith` cases in both `evaluateValue()` and `evaluateExpr()`
- `src/dsl/semantic/expr-evaluator.js` — added `arith` case (conservative: `{ possible: true, alwaysTrue: false }`)
- `docs/architecture/simulation-engine.md` — documented arithmetic expression support
- `test/unit/game-kernel/expression-arith.test.mjs` — 20 new tests covering all operators, edge cases, impulse patterns, and nesting

**Design decisions**:
- Modulo uses `((left % right) + right) % right` for consistent non-negative results
- Division uses `Math.trunc()` for integer truncation toward zero
- Division/modulo by zero return `undefined` (falsy in boolean context, `false` in comparisons)
- `arith` in boolean context: nonzero is truthy, zero is falsy
