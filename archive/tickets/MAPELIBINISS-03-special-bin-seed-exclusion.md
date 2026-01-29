# MAPELIBINISS-03 — Exclude special bins from seed coverage targets

**Status**: ✅ COMPLETED

**Goal**: Seed generation must use the same binning logic (already shared imports) but must not count special-bin niches toward coverage targets. Special-bin placements are always accepted and reported separately.

**Dependencies**: MAPELIBINISS-02 (binning must produce special tokens).

## Files to touch

- `src/seed-generation/generate-seed-population.js`:
  - Add helper: `function hasSpecialBin(nicheId) { return /:(unknown|under|over)(\||$)/.test(nicheId); }`
  - After computing `nicheId` (line 103), check `hasSpecialBin(nicheId)`. If true: always accept the genome, increment a `specialBinCounts` map, but do NOT increment `binCounts` or reset `coverageRejectStreak`.
  - Add `specialBinCounts` (as plain object) to the returned `report`.
- `test/unit/seed-generation/generate-seed-population.test.mjs` — Add tests (see acceptance criteria).

## Out of scope

- `coverage-policy.js` — `computeTotalBinCount` already returns `product(d.bins)` which counts only in-range bins. `shouldAcceptCandidate` treats nicheId as opaque string. Neither needs changes.
- `map-elites.js`, `feature-vector.js`, `create-evaluator.js`.
- Schema files, architecture docs.

## Acceptance criteria

### Tests

- A genome whose descriptors produce a niche with "unknown" is always accepted regardless of coverage strategy.
- Special-bin genomes appear in `report.specialBinCounts`, not in `report.binCounts`.
- In-range bin counting and coverage targeting are unaffected.
- With `uniform-bins` strategy, a full in-range bin still rejects in-range candidates even if special-bin genomes were accepted.

### Invariants

- `report.coverageTargetSummary.totalBinCount` equals `product(d.bins)` (in-range only).
- Seed-generation uses `getDescriptorCoordinates` + `getNicheId` from `map-elites.js` (same functions as MAP-Elites placement — consistency invariant).
- Coverage strategies work correctly for in-range niches.
- `tsc -p tsconfig.json` passes.
- `npm run test:unit` passes.

## Outcome

### What was changed

**`src/seed-generation/generate-seed-population.js`** (minimal edits):
1. Added exported `hasSpecialBin(nicheId)` function using regex `/:(unknown|under|over)(\||$)/`.
2. Added `specialBinCounts` Map alongside existing `binCounts`.
3. After computing `nicheId`, added a special-bin check: if the niche contains a special token, the genome is always accepted and tracked in `specialBinCounts` (not `binCounts`), without resetting `coverageRejectStreak`.
4. Added `specialBinCounts` (as plain object) to the returned `report`.

**`test/unit/seed-generation/generate-seed-population.test.mjs`** (10 new test cases):
- `hasSpecialBin` helper: 4 tests (unknown, under, over tokens; in-range returns false).
- Special bin exclusion from coverage: 6 tests covering all acceptance criteria.

### Versus original plan

The ticket's assumptions were accurate — no corrections needed. The implementation matched the ticket specification exactly. No changes to `coverage-policy.js`, `map-elites.js`, or any schema/doc files. Public API extended (new `hasSpecialBin` export, new `report.specialBinCounts` field) but no breaking changes.

### Verification

- `tsc -p tsconfig.json`: passes (no errors)
- `npm run test:unit`: 713 tests, 0 failures
