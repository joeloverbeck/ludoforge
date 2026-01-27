# E2EHUMLOO-001: Add E2E test runner scaffolding
Status: Completed (2026-01-27)

## Summary
Add a minimal E2E smoke test under `test/e2e/` to validate the existing runner stays green and deterministic.

## File list (expected to touch)
- test/e2e/smoke.e2e.test.mjs

## Out of scope
- Implementing any human-loop fixtures or helpers.
- Changing production source files under `src/`.
- Adding new schema or game-definition logic.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `npm run test:e2e`

### Invariants that must remain true
- No changes to runtime behavior in `src/`.
- E2E runner continues to use Node's test runner (`node --test`) as already configured.
- Smoke test is deterministic and has no external IO.

## Outcome
Added a minimal E2E smoke test under `test/e2e/` and left `package.json` unchanged since the runner was already present.
