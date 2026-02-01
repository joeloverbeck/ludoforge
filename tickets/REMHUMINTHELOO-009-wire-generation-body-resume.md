# REMHUMINTHELOO-009: Wire into generation body + resume support

**Status**: Open
**Diff size**: L
**Depends on**: 005, 008

## What

Full integration. Each generation: computes OOD + uncertainty, advances controller, runs `decideFeedbackPlan()`, passes plan to feedback provider (or skips when budget=0), distills taste vector, builds preference health, writes all artifacts. Resume loads controller state from latest `preference-controller.json`.

## Files to touch

- `src/evolution-runner/generation-body.js` — add controller state param; call new functions; pass new artifacts to writer
- `src/evolution-runner/generation-context.js` — accept feedback plan budget; skip provider when budget=0
- `src/evolution-runner/runner.js` — thread `controllerState` through generation loop
- `src/evolution-runner/resume-loader.js` — load `preference-controller.json`; fail fast if missing/corrupt
- `test/unit/evolution-runner/runner.test.mjs` — update for controller threading
- `test/unit/evolution-runner/generation-context.test.mjs` (NEW if needed) — budget=0 skips feedback

## Out of scope

E2E tests. Doc updates.

## Acceptance criteria

- Tests: frozen generation with no calibration due invokes feedback provider zero times
- Tests: controller state written as `preference-controller.json` each generation
- Tests: resume loads controller state and continues frozen
- Tests: `preference-health.json` and `taste-vector.json` exist every generation
- Invariant: `attempts === noOp + repairFailed + rejectedTotal + validEvaluated` (operator telemetry)
- Invariant: fitness blend unchanged — preference contribution still uncertainty-damped
- Invariant: `tsc -p tsconfig.json` passes
