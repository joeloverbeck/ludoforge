# ACTSELTURSTRPRI-24: Add expression-based effect amounts (Wave 3)

## What

Currently, effect `amount` fields (on `inc`, `dec`, `set`) accept only literal numbers. Extend them to accept expressions (`Expr`) or variable/attribute references (`Ref`), so effect magnitudes can scale dynamically. For example, `{ kind: "inc", target: scoreRef, amount: { kind: "ref", id: "pip_value" } }` increments score by the token's pip value.

Schema: `amount` becomes `number | Expr | Ref` (union). The effect application resolves the value at runtime.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — change `amount` field on `inc`/`dec` effects to accept number or Expr/Ref
- `src/dsl/types.ts` — update `inc`/`dec` variants in Effect union to accept `amount: number | Expr | Ref`
- `src/game-kernel/effect-application.js` — in `inc`/`dec` handlers, resolve `amount` if it's an expression or reference before applying
- `src/game-kernel/effects.js` — add/extend `resolveValue(amount, state, context)` helper

## Out of scope

- Expression-based `value` on `set` effects (could add later)
- Expression-based precondition thresholds (already supported via Expr)
- Arithmetic operators in expressions (ACTSELTURSTRPRI-23)

## Acceptance criteria

- Test: `inc` with literal amount (number) works as before
- Test: `inc` with variable ref amount reads per-player variable and uses its value
- Test: `inc` with token attribute ref reads attribute value
- Test: `dec` with expression amount evaluates expression and uses result
- Test: Amount resolving to non-integer fails gracefully or rounds
- Invariant: Backward-compatible — literal number amounts work unchanged
- Invariant: Schema validates both literal and expression amounts
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-23 (expression arithmetic, if amounts use complex expressions)
