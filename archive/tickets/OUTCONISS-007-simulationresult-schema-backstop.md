# OUTCONISS-007 SimulationResult JSON Schema + Backstop Test

## Status
Completed (2026-01-28)

## Context
Create a formal JSON Schema for SimulationResult and a single contract-drift test that validates a produced result against it.

## Assumptions check
- Canonical SimulationResult contract already lives in `docs/architecture/simulation-engine.md`.
- Contract shape tests already exist in `test/unit/simulation-engine/simulation-result-contract.test.mjs` (OUTCONISS-005).
- Simulation runtime can emit `terminationReason = "max-steps"` (maxSteps cutoff), but `SimulationTerminationReason` type does not include it yet.

## Scope
- Add a SimulationResult JSON Schema under schemas/.
- Add a unit test that validates a real SimulationResult with Ajv (schema backstop).
- Align `SimulationTerminationReason` to include `max-steps` so types match the canonical contract.

## File list
- schemas/simulation-engine/simulation-result.schema.json
- test/unit/simulation-engine/simulation-result-schema.test.mjs

## Out of scope
- No changes to documentation.
- No changes to evaluation analytics tests.
- No changes to production simulation logic beyond wiring for the test if required.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/simulation-engine/simulation-result-schema.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Schema enforces the documented terminationReason enum and terminated semantics.
- Schema forbids outcome.reason and any additional termination fields not in the contract.

## Outcome
- Added a SimulationResult JSON Schema and a schema backstop test using Ajv.
- Expanded `SimulationTerminationReason` to include `max-steps` so types match the canonical contract.
- No production simulation logic changes were required beyond schema/test coverage.
