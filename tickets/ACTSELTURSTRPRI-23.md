# ACTSELTURSTRPRI-23: Add expression arithmetic (modulo operator) (Wave 3)

## What

Extend the `Expr` expression evaluator to support arithmetic operators, specifically modulo (`%`). This enables impulse-movement mechanics where units act on specific impulses based on their speed attribute (`impulse_counter % speed == 0`).

Add a new expression kind `arith` (or extend `cmp`): `{ kind: "arith", op: "%", left: Expr, right: Expr }` that evaluates to a numeric value. This value can then be used in `cmp` comparisons.

Alternatively, extend `cmp` to accept nested arithmetic expressions.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — extend `Expr` definition to support arithmetic expressions
- `src/dsl/types.ts` — add arithmetic expression variant to `Expr` type
- `src/game-kernel/effects.js` (or wherever `evaluateExpr` lives) — add `%` (modulo) operator evaluation; potentially also `+`, `-`, `*`, `/` for general utility
- `src/game-kernel/preconditions.js` (or wherever preconditions are evaluated) — ensure arithmetic expressions work in preconditions

## Out of scope

- Floating point arithmetic (integer only)
- Complex expression trees beyond 2 levels of nesting
- Expression-based effect amounts (separate concern)

## Acceptance criteria

- Test: `impulse_counter % speed == 0` evaluates correctly for various values
- Test: Modulo by zero returns error or false
- Test: Arithmetic in preconditions works (action legal only when condition met)
- Test: Nested arithmetic (`(a + b) % c`) works if supported
- Invariant: Existing `cmp` expressions continue to work unchanged
- Invariant: Schema validates arithmetic expressions
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (extends existing expression system)
