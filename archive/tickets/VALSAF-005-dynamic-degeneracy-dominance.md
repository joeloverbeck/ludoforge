# VALSAF-005: Dynamic degeneracy and dominance checks

## Status
Completed (2026-01-27)

## Goal
Implement a lightweight degeneracy/dominance pass inside semantic validation using precondition satisfiability and
action metadata as a proxy for dynamic checks (full simulation comes later).

## File list (expected touches)
- src/dsl/semantic.js
- test/dsl/semantic.test.mjs
- test/dsl/fixtures.mjs
- test/fixtures/dsl/invalid/*.json

## Out of scope
- Runtime loop/recursion/step-limit safeguards in the game-kernel (VALSAF-006).
- Schema-level bounds/caps (VALSAF-002).
- Structural termination requirements (VALSAF-001).

## Tasks
- Add a heuristic degeneracy pass based on precondition satisfiability and action metadata (targets/costs/effects).
- Keep severity aligned with current semantic issue conventions (issues list only; no severity field).
- Add fixtures/tests that demonstrate a dominant action and a state with no meaningful choices.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/semantic.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Non-triviality: at least one meaningful choice per turn in typical states (approximated via satisfiable actions and targets).
- Dominance detection: obvious dominant actions are flagged based on always-available, no-cost, beneficial actions.

## Outcome
- Planned: simulation-based degeneracy/dominance validation.
- Actual: heuristic semantic checks using precondition satisfiability and always-available beneficial actions, with new fixtures/tests.
