# REMHUMINTHELOO-003: Candidate pool resolution

**Status**: Open
**Diff size**: M
**Depends on**: none

## What

New pure function `resolveCandidatePool()` implementing configurable candidate source selection and focus strategies.

## Files to touch

- `src/evolution-runner/candidate-pool.js` (NEW) — `resolveCandidatePool({ source, focus, maxCandidates, evaluated, elites, shortlist, rng })`
- `test/unit/evolution-runner/candidate-pool.test.mjs` (NEW)

## Out of scope

Wiring into feedback provider. OOD detection. Active learning changes.

## Acceptance criteria

- Tests: `source="shortlist"` returns shortlist; falls back to elites when empty
- Tests: `source="elites"` returns all elites
- Tests: `source="evaluated"` returns evaluated genomes
- Tests: `source="mixed"` returns elites + seeded random sample of non-elite evaluated
- Tests: `focus.strategy="topQuantile"` filters by fitness
- Tests: `focus.strategy="parentsAndOffspring"` prioritizes parents + newest offspring
- Tests: truncation to `maxCandidates` is seeded-deterministic
- Invariant: pure function, no I/O
- Invariant: `tsc -p tsconfig.json` passes
