# DSLSEMREF-001: Add DSL semantic integration test coverage

## Summary
Create a focused integration test file that exercises the exported DSL semantic API across the refactor boundaries described in `specs/dsl-semantic-refactor.md`.

## Status
Completed (2026-01-28)

## File list (expected to touch)
- test/integration/dsl-semantic.test.mjs

## Out of scope
- No changes to `src/` or any production code unless the new integration coverage exposes a mismatch with `specs/dsl-semantic-refactor.md` or existing behavior (in that case, apply the smallest fix required).
- No changes to existing unit or e2e tests.
- No changes to DSL rules, messages, or issue paths.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/dsl-semantic.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- `collectSemanticIssues(definition)` returns issue objects with the same `path`, `message`, and `rule` semantics as before.
- `validateSemanticDefinition(definition)` still returns `{ valid, issues }` and `valid === (issues.length === 0)`.
- Integration tests assert rules without relying on fragile issue ordering.

## Notes
- Cover the scenarios listed in the spec (bounds+initial, ref+usage, meta refs, unsatisfiable precondition, action analysis, turn policy guardrails).
- Use fixtures embedded in the test file unless a shared fixture helper already exists.

## Outcome
- Added `test/integration/dsl-semantic.test.mjs` with coverage for the refactor scenarios and rule invariants; no production code changes were required.
