# REMHUMINTHELOO-010: E2E tests and documentation updates

**Status**: Completed
**Diff size**: M (revised down from L — code implementation already done, only tests + docs needed)
**Depends on**: 009

## Assumption Corrections

The original ticket assumed the E2E test files listed below would need new tests
for the freeze/unfreeze lifecycle. After reassessment:

- **Code is fully implemented**: `preference-controller.js`, `feedback-plan.js`,
  `preference-health.js`, `taste-vector.js`, `candidate-pool.js`, and all artifact
  writing in `artifact-writer.js` are complete with unit test coverage (70+ assertions).
- **Existing E2E tests cover different concerns**:
  - `adaptive-human-budget.e2e.test.mjs` — tests budget adjustment via `computeAdaptiveBudget()`, not the freeze/unfreeze lifecycle.
  - `human-loop.e2e.test.mjs` — tests game-kernel-level prompting and action application, not preference learning.
  - `active-learning.e2e.test.mjs` — tests BALD pair selection and model updates, not candidate pool source modes.
- **Docs are stale**: Both `human-feedback.md` and `evolution-runner.md` still reference the old `humanFeedback` config block and state "minimum budget is always 1."
- **No new source files needed**: All logic exists. Only E2E coverage and doc updates are required.

## Revised Scope

1. **New E2E test file**: `test/e2e/freeze-lifecycle.e2e.test.mjs` — covers freeze/unfreeze controller lifecycle, zero-prompt generations, calibration during freeze, drift unfreeze, and artifact presence.
2. **Doc updates**: Rewrite stale sections of `human-feedback.md` and `evolution-runner.md` to reflect the `preferenceLearning` config, controller state, and zero-budget generations.
3. **No code changes** to source files.

## Files to touch

- `test/e2e/freeze-lifecycle.e2e.test.mjs` — **new** freeze/unfreeze lifecycle E2E test
- `docs/architecture/human-feedback.md` — rewrite CLI Integration and Adaptive Sampling Budget sections
- `docs/architecture/evolution-runner.md` — update Human Feedback Integration and Adaptive Sampling Budget sections

## Out of scope

Performance optimization. Decision tree distillation. UI changes. Source code changes.

## Acceptance criteria

- Tests: E2E validates freeze state reached after consecutive stable generations
- Tests: E2E validates frozen generations produce budget=0 (no prompts)
- Tests: E2E validates calibration fires during frozen state
- Tests: E2E validates drift triggers unfreeze
- Tests: E2E validates all 3 new artifacts (preference-controller.json, preference-health.json, taste-vector.json) present per generation
- Tests: `npm run test:unit && npm run test:integration && npm run test:e2e` all pass
- Docs: `human-feedback.md` accurately describes `preferenceLearning` config
- Docs: `evolution-runner.md` accurately describes controller state, zero-budget, and new artifacts

## Outcome

### What was actually changed vs originally planned

**Originally planned**: Add/update E2E tests in 3 existing files + rewrite 2 architecture docs.

**Actually done**:
- Created 1 new E2E test file (`test/e2e/freeze-lifecycle.e2e.test.mjs`) with 3 tests instead of modifying 3 existing files — the existing files test different concerns and should not be conflated.
- Updated 2 architecture docs (`human-feedback.md`, `evolution-runner.md`) — replaced stale `humanFeedback` references with `preferenceLearning`, removed "minimum budget is always 1" claim, added documentation for freeze/unfreeze controller, preference health, taste vector, and candidate pool resolution.
- No source code changes were needed — all implementation was already complete from tickets 001–009.

### New/modified tests

| File | Tests | Rationale |
|------|-------|-----------|
| `test/e2e/freeze-lifecycle.e2e.test.mjs` (new) | 3 | Covers: (1) full controller lifecycle with artifact structure validation, (2) zero-budget enforcement during frozen state, (3) artifact presence even without feedback enabled |

### Test results

- Unit: 2393 pass, 0 fail
- Integration: 252 pass, 0 fail
- E2E: 131 pass, 0 fail (3 new)
- TypeScript: clean
