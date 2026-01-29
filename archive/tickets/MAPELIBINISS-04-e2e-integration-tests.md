# MAPELIBINISS-04 — E2E and integration test updates ✅ COMPLETED

**Goal**: Verify all E2E tests pass with the new binning. Add integration tests for the full pipeline (non-finite metric -> "unknown" niche) and seed-generation/MAP-Elites consistency.

**Dependencies**: MAPELIBINISS-01, MAPELIBINISS-02, MAPELIBINISS-03.

## Files to touch

- `test/e2e/evolution-pipeline.e2e.test.mjs` — Verify passes. Update any hardcoded niche ID expectations if they assumed clamped edge bins.
- `test/e2e/active-learning.e2e.test.mjs` — Verify passes. Diversity quota checks by nicheId should still work since niche IDs are still strings.
- `test/e2e/map-elites-diversity.e2e.test.mjs` — Verify passes. Add a test case: one genome with a non-finite descriptor lands in a distinct "unknown" niche (not in bin 0).
- `test/e2e/preference-model-update.e2e.test.mjs` — Verify feature vector serialization determinism holds with the new `{ vector, nonFiniteKeys }` return shape.
- `test/integration/` (new file: `map-elites-binning.integration.test.mjs`) — Two integration tests:
  1. Given metrics with one NaN value, run through `assembleFeatureVector` -> descriptor extraction -> `binDescriptorValue` -> `getDescriptorCoordinates` -> `getNicheId`. Verify niche ID contains `:unknown` for that descriptor.
  2. For a genome with known descriptor values, verify seed-generation computed nicheId matches MAP-Elites placement nicheId exactly (consistency invariant).

## Out of scope

- Runtime code changes (all code changes in tickets 01-03).
- Unit tests (already in tickets 01-03).
- Schema and doc changes.

## Acceptance criteria

- `npm run test:e2e` passes.
- `npm run test:integration` passes.
- New integration test confirms: NaN metric -> niche with `:unknown` token.
- New integration test confirms: seed-generation nicheId matches MAP-Elites placement nicheId for identical inputs.
- No E2E test expectations hardcode old clamp-to-edge behavior.

## Assumptions reassessed

- **Ticket said** `test/integration/map-elites-binning.integration.test.mjs` — **Actual** file named `test/integration/map-elites-binning.test.mjs` to match existing integration test naming convention (no `.integration.` infix).
- All E2E tests (evolution-pipeline, active-learning, map-elites-diversity, preference-model-update) passed without modification — no hardcoded old-clamp expectations found.
- `preference-model-update.e2e.test.mjs` already destructures `{ vector }` from `assembleFeatureVector`, compatible with the `{ vector, nonFiniteKeys }` return shape.

## Outcome

**What was actually changed vs originally planned:**

- Added 1 new E2E test to `test/e2e/map-elites-diversity.e2e.test.mjs`: "genome with NaN descriptor occupies a distinct 'unknown' niche, not bin 0".
- Created `test/integration/map-elites-binning.test.mjs` (named without `.integration.` infix to match project conventions) with 2 integration tests:
  1. NaN metric flows through full pipeline (`assembleFeatureVector` -> descriptor extraction -> binning -> niche id) and produces `:unknown` token.
  2. Seed-generation nicheId matches MAP-Elites placement nicheId for identical inputs.
- No E2E test modifications were needed — all 4 existing E2E suites passed as-is with no hardcoded old-clamp expectations.
- No runtime code changes.
