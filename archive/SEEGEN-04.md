# SEEGEN-04: Folder seeding (runner-level, disk IO)

## Summary

Create `src/evolution-runner/folder-seeder.js` that reads game definition JSON files from a folder, wraps them as genomes with deterministic IDs (hash of canonical JSON), and handles selection when folder count exceeds `populationSize`. This is runner-level code — disk IO is expected.

## Files to touch

- `src/evolution-runner/folder-seeder.js` — **create**
- `src/evolution-runner/folder-seeder.d.ts` — **create**
- `test/unit/evolution-runner/folder-seeder.test.mjs` — **create**
- `test/unit/evolution-runner/fixtures/seed-definitions/` — **create** fixture directory with 5 bare definition JSON files

## Out of scope

- Grammar generator (SEEGEN-02)
- Coverage targeting (SEEGEN-03)
- Mixed-mode logic (SEEGEN-05)
- Runner integration (SEEGEN-05)
- Validation/repair of loaded definitions (existing evaluation pipeline handles that downstream)

## Acceptance criteria

### Tests that must pass
- `loadFolderSeeds({ folderPath, populationSize, rngSeed, onInvalid })` returns `{ genomes, report }`
- Each file is treated as a raw `GameDefinition` (not a `{ id, definition }` wrapper)
- Genome `id` is derived deterministically from canonical JSON serialization of the definition (full SHA-256 hex digest, matching `hashGenome()` pattern)
- Same folder + same `rngSeed` = same output (determinism)
- Folder with more files than `populationSize`: files sorted lexicographically, shuffled with seeded RNG, first N taken
- Folder with fewer files than `populationSize`: all genomes returned (caller fills remainder)
- `onInvalid: "error"` throws on JSON parse failure
- `onInvalid: "skip"` silently skips unparseable files
- Report includes: `filesFound`, `filesLoaded`, `filesSkipped`, `genomesReturned`
- `npm run test:unit` passes
- `tsc -p tsconfig.json` passes

### Invariants
- This module lives in `src/evolution-runner/` (runner layer, IO allowed)
- Does NOT validate definitions against DSL schema (that's the evaluator's job)
- Deterministic ID generation: same definition content always produces same ID

## Outcome

**Completed.** All acceptance criteria met.

### Files created
| File | Purpose |
|------|---------|
| `src/evolution-runner/folder-seeder.js` | Main module: `loadFolderSeeds()` |
| `src/evolution-runner/folder-seeder.d.ts` | TypeScript declarations |
| `test/unit/evolution-runner/folder-seeder.test.mjs` | 12 unit tests |
| `test/unit/evolution-runner/fixtures/seed-definitions/alpha.json` | 2-player progress/advance fixture |
| `test/unit/evolution-runner/fixtures/seed-definitions/beta.json` | 2-player score/collect fixture |
| `test/unit/evolution-runner/fixtures/seed-definitions/gamma.json` | 3-player health/attack fixture |
| `test/unit/evolution-runner/fixtures/seed-definitions/delta.json` | 2-player gold/trade fixture |
| `test/unit/evolution-runner/fixtures/seed-definitions/epsilon.json` | 4-player energy/charge fixture |

### Corrections from original ticket
1. Added `.d.ts` file (every module in `src/evolution-runner/` has one)
2. Clarified SHA-256: uses full 64-char hex digest (not a truncated prefix), matching existing `hashGenome()` pattern

### Verification
- 12/12 tests pass
- 594/594 full unit suite passes (0 regressions)
- `tsc -p tsconfig.json` clean
