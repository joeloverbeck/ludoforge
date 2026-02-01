# REMHUMINTHELOO-003: Candidate pool resolution

**Status**: Completed
**Diff size**: M
**Depends on**: none

## What

New pure function `resolveCandidatePool()` implementing configurable candidate source selection and focus strategies.

## Files to touch

- `src/evolution-runner/candidate-pool.js` (NEW) — `resolveCandidatePool({ source, focus, maxCandidates, evaluated, elites, shortlist, rng })`
- `test/unit/evolution-runner/candidate-pool.test.mjs` (NEW)

## Out of scope

Wiring into feedback provider. OOD detection. Active learning changes.

## Assumption corrections (discovered during implementation)

1. **`parentsAndOffspring` focus strategy deferred**: The codebase tracks no `parentId` or lineage metadata on genomes. The `evolution-applicator.js` produces offspring from parents but does not tag them with parent references. Implementing this strategy would require either (a) adding lineage tracking to genome objects (a breaking change out of scope for this ticket) or (b) passing a separate `parentIds`/`offspringIds` set, which no caller currently provides. **Resolution**: Accept `parentsAndOffspring` in the type signature but throw a clear "not yet implemented" error if invoked, since the required data does not exist. This keeps the API forward-compatible without blocking the ticket.

2. **Data shapes**: All candidate items (`evaluated`, `elites`, `shortlist`) are `{ genome, fitness }` objects, matching the shape produced by `selectElitesForMining()` and `runGenerationLoop()`. The function operates on these shapes directly.

3. **`focus.strategy="none"`**: The spec (section 1.6) lists `none` as a valid strategy. The original acceptance criteria omitted it. Added as implicit pass-through (no filtering).

## Acceptance criteria

- Tests: `source="shortlist"` returns shortlist; falls back to elites when empty
- Tests: `source="elites"` returns all elites
- Tests: `source="evaluated"` returns evaluated genomes
- Tests: `source="mixed"` returns elites + seeded random sample of non-elite evaluated
- Tests: `focus.strategy="topQuantile"` filters by fitness
- Tests: `focus.strategy="parentsAndOffspring"` throws descriptive error (deferred — no lineage data available)
- Tests: `focus.strategy="none"` passes pool through unchanged
- Tests: truncation to `maxCandidates` is seeded-deterministic
- Invariant: pure function, no I/O
- Invariant: `tsc -p tsconfig.json` passes

## Outcome

**What was actually changed vs originally planned:**

- Created `src/evolution-runner/candidate-pool.js` with `resolveCandidatePool()` — as planned.
- Created `test/unit/evolution-runner/candidate-pool.test.mjs` with 18 tests across 5 suites — as planned.
- **Deviation**: `focus.strategy="parentsAndOffspring"` throws a descriptive error instead of filtering, because genomes carry no lineage metadata. The original ticket assumed this data existed. The API accepts the strategy value for forward compatibility; a future ticket adding genome lineage tracking can implement the actual logic.
- **Addition**: Tests for `focus.strategy="none"` (omitted from original criteria but required by the spec).
- **Addition**: Immutability test verifying input arrays are not mutated.
- **Addition**: Combined pipeline test (source + focus + truncation in sequence).
- All 18 tests pass. `tsc -p tsconfig.json` passes clean.
