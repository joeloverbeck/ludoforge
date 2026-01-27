# VALSAF-004: Dead rules and "no free lunch" checks

Status: Completed (2026-01-27)

## Goal
Add semantic validation to detect unused declarations and obviously unbounded beneficial effects.

## Updated assumptions
- Semantic validation already reports unused variables and token types when they are never referenced by any rule, action, selector, trigger, or termination expression.
- The missing coverage is unused zones and a basic "free lunch" heuristic for actions; triggers/step effects do not have costs, so this ticket focuses on actions only.

## File list (expected touches)
- src/dsl/semantic.js
- src/dsl/semantic.d.ts
- test/dsl/semantic.test.mjs
- test/dsl/fixtures.mjs

## Out of scope
- Simulation-based dominance/non-triviality detection.
- Runtime enforcement in the game-kernel.
- Structural termination requirements (VALSAF-001).
- Free lunch detection for triggers/step effects beyond simple action heuristics.

## Tasks
- Detect unused zones referenced nowhere in rules, actions, selectors, triggers, or termination.
- Add heuristics for "free lunch" actions: beneficial effects (spawn, positive increments) must include at least one of costs or limits (preconditions/targets).
- Add targeted tests that exercise both detections.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/semantic.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- No dead rules: declared variables, token types, and zones must be referenced by rules or actions.
- No free lunch: beneficial action effects must include costs or limits (preconditions/targets).

## Outcome
- Confirmed unused variable/token detection already existed; added unused zone tracking instead of re-implementing existing checks.
- Implemented a free lunch heuristic scoped to action effects that spawn or positively increment without costs/limits, and updated the minimal example to include a precondition so it remains valid.
