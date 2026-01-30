# ACTSELTURSTRPRI-07: Update DSL semantic validation for new primitives

## What

Update the DSL semantic checks (if any exist beyond JSON Schema) to validate the new Wave 1 primitives: `start_round`/`end_round` trigger events, `conditional` effects, `move.toPlayer`, `priority_queue` scheduler with `orderBy`, and `token_holder` scheduler with `holderOf`. Ensure that:
- `priority_queue` requires `orderBy` with a valid per-player variable reference
- `token_holder` requires `holderOf` with a valid token type and zone reference
- `conditional` effect's `condition` references valid variables/zones
- `move.toPlayer` is only used with per-player zones

## Files to touch

- `src/dsl/validate.js` (or wherever semantic validation lives) — add checks for new scheduler fields, conditional effect structure, move toPlayer constraints
- `src/dsl/validate.d.ts` — update if types are declared
- `schemas/dsl/game-definition.v1.json` — add `if/then` conditional schema rules for scheduler-specific required fields (e.g., `priority_queue` requires `orderBy`)

## Out of scope

- Runtime validation in game kernel (handled by individual tickets)
- Wave 2/3 primitives
- Mutation operator validation

## Acceptance criteria

- Test: `priority_queue` scheduler without `orderBy` fails validation
- Test: `priority_queue` with `orderBy` referencing non-existent variable fails validation
- Test: `token_holder` without `holderOf` fails validation
- Test: `token_holder` with `holderOf` referencing non-existent token type fails validation
- Test: Valid definitions with all new primitives pass validation
- Test: `conditional` effect with empty `then` array passes validation (no-op is valid)
- Invariant: All existing valid definitions continue to pass validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 through ACTSELTURSTRPRI-06 (all new primitives defined)
