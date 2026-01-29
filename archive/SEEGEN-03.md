# SEEGEN-03: Coverage-targeting seed population generator

**Status**: Completed

## Summary

Create `src/seed-generation/generate-seed-population.js` exporting `generateSeedPopulation(options)` that orchestrates a generate→evaluate→bin→accept/reject loop. Implements three coverage strategies: `uniform-bins`, `underfilled-first`, `random`. Respects `maxAttempts` and `fallback`. Returns `{ genomes, report }`.

## Files created

- `src/seed-generation/coverage-policy.js` — strategy logic: `computeTotalBinCount`, `computeTargetPerBin`, `shouldAcceptCandidate`
- `src/seed-generation/generate-seed-population.js` — orchestrator: generate→evaluate→bin→accept/reject loop
- `test/unit/seed-generation/coverage-policy.test.mjs` — 18 unit tests
- `test/unit/seed-generation/generate-seed-population.test.mjs` — 13 unit tests

## Outcome

All acceptance criteria met:
- Three coverage strategies implemented: `uniform-bins`, `underfilled-first`, `random`
- Deterministic output from identical inputs via seeded RNG
- `maxAttempts` budget shared between main and fallback phases via streak-based mode switching
- Fallback `accept-any-valid` fills remainder after coverage policy exhaustion
- Throws when population cannot be filled
- Report includes `attempts`, `accepted`, `rejectedByReason`, `binCounts`, `coverageTargetSummary`
- No file IO in source modules
- `npm run test:unit` passes (582 tests, 0 failures)
- `tsc -p tsconfig.json` passes
