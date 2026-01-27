# VALSAF-006: Runtime safety guards

## Goal
Add runtime safeguards to prevent infinite loops, runaway recursion, and unbounded per-turn effects.

## Assumptions (revised)
- `advanceTurnPhase` currently applies `start_phase`/`end_phase` triggers once per call and has no loop history tracking.
- `applyTriggers` only detects no-op trigger loops via a pre/post snapshot and does not guard re-entry depth or step counts.
- Max-turn enforcement already exists in `advanceTurnPhase` via `termination.maxTurns` or an override.
- Existing coverage for runtime safety is limited to `test/game-kernel/scheduler.test.mjs`.

## File list (expected touches)
- src/game-kernel/scheduler.js
- src/game-kernel/triggers.js
- src/game-kernel/scheduler.d.ts
- src/game-kernel/triggers.d.ts
- test/game-kernel/scheduler.test.mjs

## Out of scope
- DSL validation changes (schema/semantic/structural checks).
- Simulation-based degeneracy or dominance detection.
- Any persistence or UI work.

## Tasks
- Track repeated game state snapshots in the scheduler and return a draw failsafe when a loop is detected.
- Add trigger guard rails for re-entry depth and per-step effect limits.
- Add a max step limit per scheduler advance to cap auto-effects in `start_phase`/`end_phase` triggers.
- Add tests that cover each guard and its error/flag behavior.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/game-kernel/scheduler.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Runtime safety: repeated state loops are detected and halted with a failsafe outcome.
- Trigger recursion is bounded and cannot cause infinite re-entry.
- Each turn has a maximum step limit that stops infinite auto-effects.

## Status
Completed.

## Outcome
- Implemented state loop tracking in the scheduler with a draw failsafe result (rather than altering termination logic).
- Added trigger guard rails for max depth and per-step effect limits, exercised via scheduler calls/tests.
