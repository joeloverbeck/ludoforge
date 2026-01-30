# ACTSELTURSTRPRI-03: Add `conditional` effect kind

## What

Add a new effect kind `conditional` to the DSL. It evaluates a condition expression; if true, applies `then` effects; if false, applies optional `else` effects. Schema: `{ kind: "conditional", condition: Expr, then: Effect[], else?: Effect[] }`. Implement `applyConditional` in the effect application system that delegates to the existing expression evaluator and recursively applies child effects.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `conditional` to Effect oneOf with `condition` (Expr), `then` (Effect[]), `else` (Effect[]) fields
- `src/dsl/types.ts` — add `{ kind: "conditional"; condition: Expr; then: Effect[]; else?: Effect[] }` to `Effect` union
- `src/game-kernel/effect-application.js` — add `case "conditional"` handler that evaluates `effect.condition` using the existing expression evaluator, then applies `effect.then` or `effect.else` effects via recursive `applyEffect` calls
- `src/game-kernel/effect-application.d.ts` — update if effect types are declared

## Out of scope

- `choose` effect (Wave 2)
- `set_turn_order` effect (Wave 2)
- `shuffle` effect (Wave 2)
- Mutation operators using conditional effects
- Extending the expression evaluator with new operators

## Acceptance criteria

- Test: `conditional` with true condition applies `then` effects
- Test: `conditional` with false condition applies `else` effects
- Test: `conditional` with false condition and no `else` block does nothing
- Test: Nested `conditional` effects work correctly (conditional inside conditional)
- Test: `conditional` effects inside triggers fire correctly
- Test: `conditional` with `zone_query` condition works (e.g., "if zone has > 0 tokens, do X")
- Invariant: Schema validates game definitions using `conditional` effects
- Invariant: Invalid `conditional` (missing `condition` or `then`) fails schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (uses existing expression evaluator)
