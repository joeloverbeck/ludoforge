# NOLEGACT-001: Add meta refs to DSL schema and types

## Goal
Enable DSL expressions to reference simulation meta values via `Ref` variants for `legalActionCount` and `hasLegalActions`.

## Scope
- Extend JSON Schema to allow meta refs in expressions (not effect targets).
- Extend TypeScript DSL types to include the new meta ref variant for expressions.
- Add semantic validation coverage for allowed meta ids.

## File list
- `schemas/dsl/game-definition.v1.json`
- `src/dsl/types.ts`
- `src/dsl/semantic.js`
- `test/unit/dsl/schema.test.mjs`
- `test/unit/dsl/types.test.ts`
- `test/unit/dsl/semantic.test.mjs`

## Out of scope
- Simulation engine loop changes.
- Termination evaluation logic changes.
- `turn.noLegalActions` policy support.
- Analytics/degeneracy updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/dsl/schema.test.mjs`
- `node --test test/unit/dsl/semantic.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Existing ref kinds (`var`, `token`, `zone`, `player`) remain valid and unchanged.
- Meta refs are only allowed in expressions and cannot appear as effect targets or selectors.
- Schema continues to reject unknown ref kinds or meta ids outside the allowed set.

## Status
Completed — 2026-01-28

## Outcome
- Updated schema/types to add `meta` refs only for expressions and constrain ids to `legalActionCount`/`hasLegalActions`.
- Added semantic validation for allowed meta ids and disallowed meta refs in non-expression contexts.
- Added schema/types/semantic tests for meta refs and invalid ids; acceptance criteria corrected to rely on `npm run test:unit` for TypeScript type checks.
