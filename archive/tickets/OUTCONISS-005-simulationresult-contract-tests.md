# OUTCONISS-005 SimulationResult Contract Shape Tests

## Status
Completed (2026-01-28)

## Context
Add unit tests that fail loudly when SimulationResult drifts from the canonical contract, especially around terminationReason, terminated, and outcome fields.

## Scope
- Add a unit test that validates SimulationResult shape across the termination variants that runSimulation can emit.
- Add a unit test that validates RolloutResult shape for the max-steps cutoff (the only path that produces max-steps today).
- Assert outcome never carries a reason field.
- Assert terminated is consistent with cutoff vs terminal reasons.

## File list
- test/unit/simulation-engine/simulation-result-contract.test.mjs
- test/unit/simulation-engine/fixtures.mjs (only if new fixtures are required)

## Out of scope
- No changes to docs.
- No changes to evaluation analytics tests.
- No changes to production simulation logic beyond what is needed to produce the documented fields.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/simulation-engine/simulation-result-contract.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- terminationReason is always one of the documented enum values for the result type.
- terminated is true for condition/stalemate/no-legal-actions and false for max-turns/loop-detected.
- terminated is false for max-steps (rollout-only cutoff today).
- outcome is per-player only and contains no reason field.

## Outcome
- Added a dedicated contract test covering simulation termination variants plus rollout max-steps.
- No production code changes were needed; scope was clarified to treat max-steps as rollout-only for now.
