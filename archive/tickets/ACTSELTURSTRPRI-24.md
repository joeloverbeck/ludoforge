# ACTSELTURSTRPRI-24: Add expression-based effect amounts (Wave 3)

**Status: COMPLETED**

## What

Currently, effect `amount` fields (on `inc`, `dec`) accept only literal numbers. Extend them to accept expressions (`Expr`), so effect magnitudes can scale dynamically. For example, `{ kind: "inc", target: scoreRef, amount: { kind: "ref", ref: { kind: "var", id: "pip_value" } } }` increments score by the token's pip value.

Schema: `amount` becomes `number | Expr` (union). The effect application resolves the value at runtime via the existing `evaluateValue()` in `expression-eval.js`.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — change `amount` field on `inc`/`dec` effects to accept `number | Expr`
- `src/dsl/types.ts` — update `inc`/`dec` variants in Effect union to accept `amount: number | Expr`
- `src/game-kernel/expression-eval.js` — export the existing `evaluateValue()` function so it can be called from variable-effects
- `src/game-kernel/variable-effects.js` — in `inc`/`dec` handlers, resolve `amount` via `evaluateValue()` if it's an expression object before applying

**Corrected assumptions** (vs original ticket):
- `src/game-kernel/effects.js` is a barrel re-export file — no changes needed there
- No new `resolveValue` helper needed; `expression-eval.js` already has `evaluateValue()` which resolves `Expr` nodes (value, ref, arith) to scalars
- The `Ref` type is already representable inside `Expr` via `{ kind: "ref", ref: <Ref> }`, so the union is `number | Expr` (not `number | Expr | Ref`)

## Out of scope

- Expression-based `value` on `set` effects (could add later)
- Expression-based precondition thresholds (already supported via Expr)
- Arithmetic operators in expressions (ACTSELTURSTRPRI-23, already completed)

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

- ACTSELTURSTRPRI-23 (expression arithmetic) — **completed**

## Outcome

**What changed vs originally planned:**

The original ticket listed `src/game-kernel/effects.js` as a file to modify and proposed adding a new `resolveValue(amount, state, context)` helper there. In reality, `effects.js` is a barrel re-export — no changes were needed. Instead:

- **`expression-eval.js`**: Exported the existing `evaluateValue()` function (was module-private).
- **`variable-effects.js`**: Added a local `resolveAmount()` helper that handles `null → 0`, `number → pass-through`, and `Expr object → evaluateValue()`. Updated `inc`/`dec` case branches and the `appliedEffect.amount` recording to use this resolver.
- **Schema + types**: `amount` field on `inc`/`dec` changed from `{ "type": "number" }` to `{ "oneOf": [{ "type": "number" }, { "$ref": "#/$defs/Expr" }] }` and the TS type changed from `number` to `number | Expr`.

The ticket also assumed the union was `number | Expr | Ref`. Since `Ref` is already expressible as `{ kind: "ref", ref: <Ref> }` inside `Expr`, the actual union is `number | Expr`.

All 11 new tests pass. All 1431 unit tests pass. `tsc` passes.
