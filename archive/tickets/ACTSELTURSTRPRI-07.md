# ACTSELTURSTRPRI-07: Update DSL semantic validation for new primitives

**Status: COMPLETED**

## What

Update the DSL semantic checks to validate the Wave 1 primitives that already exist in the JSON Schema: `start_round`/`end_round` trigger events, `conditional` effects, `move.toPlayer`, `priority_queue` scheduler with `orderBy`, and `token_holder` scheduler with `tokenType`/`zone`. Ensure that:
- `priority_queue` requires `orderBy` (enforced via JSON Schema `allOf` conditional) with a valid variable reference (enforced via semantic check)
- `token_holder` requires `tokenType` and `zone` (enforced via JSON Schema `allOf` conditional) with valid token type and zone references (enforced via semantic check)
- `conditional` effect's `condition`, `then`, and `else` branches have their references validated recursively
- `move.toPlayer` is only used with per_player-scoped zones

## Corrected assumptions (vs. original ticket)

- The ticket originally referenced `holderOf` — the actual schema uses `tokenType` + `zone` fields for `token_holder`
- The ticket referenced `src/dsl/validate.js` — semantic validation lives in `src/dsl/semantic.js` and `src/dsl/semantic/`
- The ticket referenced `src/dsl/validate.d.ts` — the relevant types file is `src/dsl/semantic.d.ts` (no changes needed)
- All Wave 1 schema primitives (`priority_queue`, `token_holder`, `conditional`, `move.toPlayer`, `start_round`, `end_round`) were already present in `schemas/dsl/game-definition.v1.json` and `src/dsl/types.ts` from prior tickets
- The schema already had a conditional `allOf` for `token_holder` requiring `tokenType` + `zone`, but was missing the equivalent for `priority_queue` requiring `orderBy`

## Files touched

- `schemas/dsl/game-definition.v1.json` — added `allOf` conditional requiring `orderBy` for `priority_queue` scheduler
- `src/dsl/semantic.js` — added scheduler reference validation (`priority_queue.orderBy.variable`, `token_holder.tokenType`, `token_holder.zone`)
- `src/dsl/semantic/semantic-validators.js` — added `conditional` effect recursion (validates `condition`, `then`, `else` branches); added `move.toPlayer` per_player zone scope check
- `src/dsl/semantic/id-index.js` — added `zoneById` map to the index for zone scope lookups
- `test/unit/dsl/semantic.test.mjs` — added 15 new tests

## Out of scope

- Runtime validation in game kernel (handled by individual tickets)
- Wave 2/3 primitives
- Mutation operator validation

## Acceptance criteria

- ✅ Test: `priority_queue` scheduler without `orderBy` fails validation (JSON Schema `allOf`)
- ✅ Test: `priority_queue` with `orderBy` referencing non-existent variable fails validation
- ✅ Test: `token_holder` without `tokenType`/`zone` fails validation (JSON Schema `allOf`)
- ✅ Test: `token_holder` with non-existent token type fails validation
- ✅ Test: `token_holder` with non-existent zone fails validation
- ✅ Test: Valid definitions with all new primitives pass validation
- ✅ Test: `conditional` effect with empty `then` array passes validation (no-op is valid)
- ✅ Test: `conditional` effect condition/then/else branches validate references
- ✅ Test: `move.toPlayer` with global zone fails validation
- ✅ Test: `move.toPlayer` with per_player zone passes validation
- ✅ Invariant: All existing valid definitions continue to pass validation
- ✅ Invariant: `tsc -p tsconfig.json` passes
- ✅ Invariant: `npm run test:unit` passes (1144/1144)

## Dependencies

- ACTSELTURSTRPRI-01 through ACTSELTURSTRPRI-06 (all new primitives defined)

## Outcome

**What changed vs. originally planned:**

The original ticket assumed several things that didn't match the codebase:
- Referenced `holderOf` field (actual: `tokenType` + `zone`)
- Referenced `validate.js` / `validate.d.ts` (actual: `semantic.js` + `semantic/` subdirectory)
- Assumed schema changes needed for the primitives themselves (all already existed from prior tickets)

**Actual changes:**
1. **Schema** (`game-definition.v1.json`): Added one `allOf` conditional — `priority_queue` now requires `orderBy` at the structural level (matching the existing `token_holder` → `tokenType`+`zone` pattern)
2. **Semantic validation** (`semantic.js`): Added reference checks for scheduler fields — validates that `orderBy.variable`, `tokenType`, and `zone` point to real definitions
3. **Effect validation** (`semantic-validators.js`): Added recursive validation into `conditional` effect branches (`condition`, `then`, `else`); added `move.toPlayer` scope check ensuring the target zone is `per_player`
4. **ID index** (`id-index.js`): Added `zoneById` map to support zone scope lookups
5. **Tests**: 15 new tests covering all acceptance criteria, plus regression (all 1144 unit tests pass)
