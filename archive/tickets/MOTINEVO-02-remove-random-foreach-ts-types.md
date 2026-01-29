# MOTINEVO-02: Remove random/foreach from DSL TypeScript types

**Status: COMPLETED**

## Description
Remove the `random` and `foreach` variants from the Effect union type in the DSL TypeScript type definitions. This aligns the TS types with the schema changes made in MOTINEVO-01, ensuring that any code attempting to create `{ kind: "random" }` or `{ kind: "foreach" }` effects produces a compile-time type error.

## Files to Touch
- `src/dsl/types.ts`

## Out of Scope
- JSON Schema (`schemas/dsl/game-definition.v1.json`) — done in MOTINEVO-01
- Mutation operator code — handled in MOTINEVO-03
- Engine code (`src/game-kernel/`, `src/simulation-engine/`)

## Acceptance Criteria

### Tests That Must Pass
- `tsc --noEmit` passes cleanly with no type errors
- Creating a value typed as `{ kind: "random" }` and assigning it to the Effect type is a type error
- Creating a value typed as `{ kind: "foreach" }` and assigning it to the Effect type is a type error
- `npm run test:unit` passes

### Invariants That Must Remain True
- All other Effect kind variants remain in the union type
- No runtime behaviour changes (types are used for checking only)
- JSDoc annotations referencing Effect types remain consistent

## Dependencies
- Depends on: MOTINEVO-01
- Blocks: none

## Outcome

### What was changed
1. **`src/dsl/types.ts`** — Removed the two union members from the `Effect` type:
   - `{ kind: "random"; target: Ref; value?: ScalarValue; amount?: number; toZone?: string }`
   - `{ kind: "foreach"; target: Ref; value?: ScalarValue; amount?: number; toZone?: string }`

2. **`test/unit/dsl/types.test.ts`** — Updated compile-time type tests:
   - Changed the existing `effect` variable from `kind: "foreach"` to `kind: "hide"` (valid kind).
   - Added two `@ts-expect-error` negative tests proving that `{ kind: "random" }` and `{ kind: "foreach" }` are now compile-time errors when assigned to the `Effect` type.

### Discrepancies vs plan
- None. The ticket's assumptions were accurate. The only additional work was updating `types.test.ts` which used `foreach` as a positive test and needed to become a negative test.

### Verification
- `tsc -p tsconfig.json` exits cleanly (0 errors).
- `npm run test:unit` passes all 339 tests.
- Schema-level rejection tests for `random`/`foreach` (added in MOTINEVO-01) continue to pass.
