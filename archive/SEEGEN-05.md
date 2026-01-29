# SEEGEN-05: Runner integration — resolve seeding from config

## Summary

Add `src/evolution-runner/seed-resolver.js` that dispatches to folder seeder or grammar generator based on `config.seeding.mode`. Modify runner to call seed resolver for new runs. Add `writeSeedReport()` to artifact writer. Create integration tests for descriptor-aware seeding, folder seeding, and mixed seeding.

## Files touched

- `src/evolution-runner/seed-resolver.js` — **created** (dispatches by `config.seeding.mode`)
- `src/evolution-runner/runner.js` — **modified** (call seed resolver when no pre-loaded population)
- `src/evolution-runner/artifact-writer.js` — **modified** (added `writeSeedReport()`)
- `test/unit/evolution-runner/seed-resolver.test.mjs` — **created** (7 tests)
- `test/integration/seed-coverage.test.mjs` — **created** (2 tests)
- `test/integration/seed-from-folder.test.mjs` — **created** (4 tests)
- `test/integration/seed-mixed.test.mjs` — **created** (3 tests)

## Out of scope

- CLI argument changes (SEEGEN-06)
- Doc updates (SEEGEN-07)
- Resume behavior changes (seeding only applies to new runs)

## Acceptance criteria

### Tests that must pass
- `resolveSeedPopulation({ config, rngSeed, evaluator })` returns `{ genomes, report }` ✅
- `mode: "generate"` calls `generateSeedPopulation()` (SEEGEN-03) ✅
- `mode: "folder"` calls `loadFolderSeeds()` (SEEGEN-04) ✅
- `mode: "mixed"` loads folder seeds up to `floor(populationSize * folderFraction)`, fills remainder via generator ✅
- `seed-report.json` written to run directory alongside `run.json` ✅
- Runner still accepts explicit `population` option (for resume and programmatic use), bypassing seeding ✅
- **Integration: seed-coverage.test.mjs**: 2-descriptor × 2-bin grid, `populationSize >= 4`, underfilled-first produces >= 1 genome per bin ✅
- **Integration: seed-from-folder.test.mjs**: fixture folder → deterministic IDs, deterministic selection when folder > populationSize, onInvalid error/skip behavior ✅
- **Integration: seed-mixed.test.mjs**: `folderFraction: 0.5`, `populationSize: 10` → 5 from folder + 5 generated ✅
- `npm run test:unit` passes (601/601) ✅
- `npm run test:integration` passes (51/51) ✅
- `tsc -p tsconfig.json` passes ✅

### Invariants
- Core/runner separation preserved: seed-resolver is runner-level, it calls core modules ✅
- Determinism: same config + seed = same initial population ✅
- Existing runner behavior unchanged for resume flows ✅
- seed-report.json artifact is JSON with the full report object ✅

## Outcome

Completed. The seed-resolver dispatch layer routes `config.seeding.mode` to the appropriate seeder:
- `"generate"` → `generateSeedPopulation()` from SEEGEN-03
- `"folder"` → `loadFolderSeeds()` from SEEGEN-04
- `"mixed"` → folder seeds up to `floor(populationSize * folderFraction)`, remainder generated

The runner now conditionally resolves population: explicit `options.population` (backward compat) > `config.seeding` > error. The `writeSeedReport()` function persists the seed report as `seed-report.json` in the run directory.
