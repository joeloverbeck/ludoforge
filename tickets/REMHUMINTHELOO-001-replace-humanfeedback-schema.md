# REMHUMINTHELOO-001: Replace `humanFeedback` schema with `preferenceLearning`

**Status**: Open
**Diff size**: M
**Depends on**: none

## What

Remove `HumanFeedbackConfig` from `runner-config.schema.json`. Add `PreferenceLearningConfig` with full sub-definitions: `budget` (baseMaxPerGen min 0), `activeLearning` (with `candidatePool`), `controller` (freeze/calibration/drift/ood). Update `configs/evolution-runner.json` default. Update the top-level `required` array (replace `"humanFeedback"` with `"preferenceLearning"`).

## Files to touch

- `schemas/evolution-runner/runner-config.schema.json` — replace `HumanFeedbackConfig` def, update `required` and `properties`
- `configs/evolution-runner.json` — replace `humanFeedback` block with `preferenceLearning`
- `test/unit/evolution-runner/config.test.mjs` — update validation tests

## Out of scope

Any `.js` source file changes. No runtime logic. No adaptive budget changes. No new modules.

## Acceptance criteria

- Tests: config.test.mjs validates new shape and rejects old `humanFeedback` shape
- Tests: `budget.baseMaxPerGen: 0` is accepted
- Tests: all `candidatePool.source` enum values accepted
- Tests: `controller.freeze/calibration/drift` sub-objects validate
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `configs/evolution-runner.json` validates against updated schema
