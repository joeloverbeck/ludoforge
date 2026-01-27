# VALSAF-003: Action legality and valid references

## Status
Completed - 2026-01-27

## Goal
Validate that action preconditions and effects only reference valid entities and are satisfiable in at least one legal state.

## File list (expected touches)
- src/dsl/semantic.js
- test/dsl/semantic.test.mjs
- test/dsl/fixtures.mjs

## Out of scope
- Runtime enforcement in the game-kernel (execution-time guards).
- Dynamic simulation-based dominance or non-triviality checks.
- Bounded-state constraints (handled in VALSAF-002).

## Tasks
- Confirm existing reference validation covers action preconditions, targets, effects, and termination rules.
- Add satisfiability checks that ensure each action precondition can be true in at least one state consistent with declared bounds.
- Add tests for invalid references and unsatisfiable preconditions.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/semantic.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Action legality: preconditions are satisfiable and reference only valid state.
- No illegal operations: effects cannot reference unknown entities or invalid zones.

## Assumptions (reassessed)
- The semantic validator already reports unknown variables/zones/token types referenced by expressions, effects, selectors, and termination conditions.
- The validator currently does not check action preconditions for logical satisfiability.
- Satisfiability should be a static bounds-based check (e.g., int min/max, enum values, boolean domains), not a simulation or reachability proof.

## Scope update
- Add a static satisfiability pass that flags preconditions that can never be true given declared bounds and literal comparisons.
- Treat any case that cannot be proven impossible as satisfiable (avoid false positives).

## Outcome
- Added bounds-based satisfiability checks for action preconditions, focusing on constant booleans and literal comparisons against declared domains.
- Reference validation was confirmed as already covered by existing semantic checks and tests.
