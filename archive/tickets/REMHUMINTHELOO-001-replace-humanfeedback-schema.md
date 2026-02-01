# REMHUMINTHELOO-001: Replace `humanFeedback` schema with `preferenceLearning`

**Status**: Completed
**Diff size**: M
**Depends on**: none

## What

Remove `HumanFeedbackConfig` from `runner-config.schema.json`. Add `PreferenceLearningConfig` with full sub-definitions: `budget` (baseMaxPerGen min 0), `activeLearning` (with `candidatePool`), `controller` (freeze/calibration/drift/ood). Update `configs/evolution-runner.json` default. Update the top-level `required` array (replace `"humanFeedback"` with `"preferenceLearning"`).

## Files to touch

- `schemas/evolution-runner/runner-config.schema.json` — replace `HumanFeedbackConfig` def, update `required` and `properties`
- `configs/evolution-runner.json` — replace `humanFeedback` block with `preferenceLearning`
- `test/unit/evolution-runner/config.test.mjs` — update validation tests
- `src/evolution-runner/config.d.ts` — rename `humanFeedback` property to `preferenceLearning` (type declaration)
- `src/cli/execute-and-report.js` — update `config.humanFeedback` property access to `config.preferenceLearning`
- `src/evolution-runner/runner-initializer.js` — update `config.humanFeedback` property access to `config.preferenceLearning`

## Out of scope

No runtime logic changes beyond renaming the config property access. No adaptive budget changes. No new modules. No freeze/unfreeze controller. No feedback plan logic. No new artifacts (those belong to later tickets in the spec).

## Acceptance criteria

- Tests: config.test.mjs validates new shape and rejects old `humanFeedback` shape
- Tests: `budget.baseMaxPerGen: 0` is accepted
- Tests: all `candidatePool.source` enum values accepted
- Tests: `controller.freeze/calibration/drift` sub-objects validate
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `configs/evolution-runner.json` validates against updated schema

## Outcome

### What changed vs originally planned

The ticket originally assumed only 3 files needed touching (schema, config, test). In practice, the property rename from `humanFeedback` to `preferenceLearning` cascaded to:

**Schema & config (as planned):**
- `schemas/evolution-runner/runner-config.schema.json` — replaced `HumanFeedbackConfig` with `PreferenceLearningConfig` and 8 supporting sub-definitions
- `configs/evolution-runner.json` — replaced `humanFeedback` block with full `preferenceLearning` block

**JS source (not originally in scope):**
- `src/evolution-runner/config.d.ts` — property rename
- `src/cli/execute-and-report.js` — property access rename (2 occurrences)
- `src/evolution-runner/runner-initializer.js` — property access rename

**Test files (broader than planned):**
- `test/unit/evolution-runner/config.test.mjs` — updated baseConfig + 13 new preferenceLearning validation tests
- `test/unit/evolution-runner/schema.test.mjs` — updated baseConfig + adapted adaptive budget tests
- `test/unit/evolution-runner/runner.test.mjs` — property rename
- `test/unit/cli/ludoforge-evolve.test.mjs` — full config shape in factory function
- `test/integration/runner-initializer.test.mjs` — property rename + test descriptions
- `test/integration/execute-and-report.test.mjs` — property rename
- `test/integration/cli-runner-paths.test.mjs` — full config shape in factory function
- `test/e2e/adaptive-human-budget.e2e.test.mjs` — property rename

**Additional file (discovered during implementation):**
- `experiments/default.json` — updated to new schema shape

### Test results
- Unit: 2247/2247 pass
- Integration: 252/252 pass
- E2E: 120/120 pass
- tsc: clean
