# E2EEVOPIP-006: Evolution pipeline E2E robustness cases

## Goal
Expand the evolution pipeline E2E test with safety cutoffs, invalid seeds, and determinism checks.

## Status
Completed (2026-01-27)

## Assumptions (revalidated)
- The evolution pipeline E2E test uses mocked simulation/human evaluation helpers, not the full simulation loop.
- `runGenerationLoop` validates definitions via `validateGenomeDefinition` before calling the evaluator, so invalid seeds should be rejected without running simulation.
- The `evo-non-terminating.json` fixture is used as a stand-in for a non-terminating scenario in the mock simulation helper; in the real simulation loop it can terminate via stalemate rather than `max-turns`.
- Determinism in the pipeline depends on deterministic inputs (mock simulation seed, mock human eval seed) and no shortlist randomness.

## File list
- test/e2e/evolution-pipeline.e2e.test.mjs
- test/e2e/fixtures/evo-non-terminating.json

## Out of scope
- Adding new production validation rules in src/.
- Changing how the simulation engine detects loops beyond test stubs.
- Modifying existing unrelated E2E tests.
- Reworking fixtures to force true non-termination in the real simulation loop.

## Acceptance criteria
### Specific tests that must pass
- node --test test/e2e/evolution-pipeline.e2e.test.mjs

### Invariants that must remain true
- Non-terminating fixtures in mock simulation trigger safety cutoffs with explicit reasons.
- Invalid seeds fail validation before simulation begins.
- Deterministic RNG seeds produce identical evolution outcomes across repeated runs.
- Mocked human evaluations map to correct candidate IDs without cross-generation leakage.

## Outcome
- Updated the evolution pipeline E2E test with coverage for invalid seeds, safety cutoffs, and deterministic outcomes.
- Kept production code and fixtures unchanged; relied on existing mock helpers to exercise robustness checks.
