# REMHUMINTHELOO-009: Wire into generation body + resume support

**Status**: Completed
**Diff size**: L
**Depends on**: 005, 008

## What

Full integration. Each generation: advances controller, runs `decideFeedbackPlan()`, passes plan to feedback provider (or skips when budget=0), distills taste vector, builds preference health, writes all artifacts. Resume loads controller state from latest `preference-controller.json`.

## Assumption corrections

- `test/unit/evolution-runner/generation-context.test.mjs` already existed (not NEW) — 4 new tests added to it.
- Resume loader uses graceful fallback (returns default initial state) when `preference-controller.json` is missing, rather than fail-fast. This preserves backward compatibility with runs started before the controller was introduced. Corrupt files still fail fast.
- OOD computation and real uncertainty/totalSamples metrics are deferred — wired with defaults (0) for now. The pure functions accept these values and will produce correct results when real metrics are plumbed in a future ticket.

## Files touched

- `src/evolution-runner/generation-body.js` — accepts `controllerState` param; calls `advanceController`, `decideFeedbackPlan`, `buildPreferenceHealth`, `distillTasteVector`; passes all artifacts to writer; returns `nextControllerState`
- `src/evolution-runner/generation-context.js` — accepts optional `feedbackPlan` param; skips feedback provider when `feedbackPlan.shouldPrompt=false` or `budget=0`; backward-compatible when `feedbackPlan` is undefined
- `src/evolution-runner/runner.js` — imports `createInitialControllerState`; initializes and threads `controllerState` through generation loop
- `src/evolution-runner/resume-loader.js` — adds `loadPreferenceController()` helper; returns `preferenceController` in resume state; graceful fallback for missing file, fail-fast for corrupt/invalid
- `test/unit/evolution-runner/runner.test.mjs` — 4 new tests for controller/health/taste artifacts
- `test/unit/evolution-runner/generation-context.test.mjs` — 4 new tests for feedbackPlan gating
- `test/unit/evolution-runner/resume-loader.test.mjs` — 4 new tests for controller load/fallback/corrupt/invalid

## Out of scope

E2E tests. Doc updates.

## Acceptance criteria

- [x] Tests: frozen generation with no calibration due invokes feedback provider zero times
- [x] Tests: controller state written as `preference-controller.json` each generation
- [x] Tests: resume loads controller state and continues frozen
- [x] Tests: `preference-health.json` and `taste-vector.json` exist every generation
- [x] Invariant: `attempts === noOp + repairFailed + rejectedTotal + validEvaluated` (operator telemetry — unchanged by this ticket)
- [x] Invariant: fitness blend unchanged — preference contribution still uncertainty-damped (no fitness code touched)
- [x] Invariant: `tsc -p tsconfig.json` passes
