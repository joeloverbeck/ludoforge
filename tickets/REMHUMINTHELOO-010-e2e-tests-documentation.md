# REMHUMINTHELOO-010: E2E tests and documentation updates

**Status**: Open
**Diff size**: L
**Depends on**: 009

## What

Add/update E2E tests for the full freeze/unfreeze lifecycle. Update `docs/architecture/human-feedback.md` and `docs/architecture/evolution-runner.md`.

## Files to touch

- `test/e2e/adaptive-human-budget.e2e.test.mjs` — budget=0 scenarios
- `test/e2e/human-loop.e2e.test.mjs` — freeze lifecycle test
- `test/e2e/active-learning.e2e.test.mjs` — candidate pool source modes
- `docs/architecture/human-feedback.md` — rewrite for `preferenceLearning`
- `docs/architecture/evolution-runner.md` — update generation loop, new artifacts, controller state

## Out of scope

Performance optimization. Decision tree distillation. UI changes.

## Acceptance criteria

- Tests: E2E run reaches frozen state with consecutive zero-prompt generations
- Tests: calibration prompts fire during frozen state
- Tests: drift triggers unfreeze
- Tests: resume restores frozen state
- Tests: all 3 new artifacts in every generation directory
- Tests: `npm run test:unit && npm run test:integration && npm run test:e2e` all pass
- Invariant: docs accurately describe the new system
