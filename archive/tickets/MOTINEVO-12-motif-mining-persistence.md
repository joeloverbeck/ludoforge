# MOTINEVO-12: Motif mining + motifs.jsonl persistence

## Description
Create two new modules:
1. `src/evaluation-analytics/motif-miner.js` — `mineMotifs(lts, config)` extracts recurring edge-label n-gram patterns from the LTS, returning motifs sorted by support descending then signature ascending.
2. `src/data-persistence/motif-store.js` — JSONL-based persistence for mined motifs, following the project's existing JSONL envelope pattern used by other stores.

## Files to Touch
- `src/evaluation-analytics/motif-miner.js` (new)
- `src/data-persistence/motif-store.js` (new)

## Out of Scope
- Evolution operator integration — handled in MOTINEVO-13
- Loop/runner integration — deferred to integration tickets

## Acceptance Criteria

### Tests That Must Pass
- **T4**: Given a fixed LTS and seed, `mineMotifs()` produces byte-identical output across runs
- Motifs are sorted by support (descending), then by signature (ascending) for stable ordering
- `minSupport` config is respected: motifs below threshold are excluded
- `maxMotifLength` config is respected: no motif exceeds max length
- `ngramSizes` config controls which n-gram sizes are mined
- motif-store round-trips correctly: write then read returns identical motif array
- motif-store follows project JSONL envelope pattern
- `npm run test:unit` passes

### Invariants That Must Remain True
- `mineMotifs` is a pure function (deterministic via sorted LTS input + stable output sorting — no RNG needed for n-gram mining)
- Motif signatures are canonical (same pattern always produces same signature string)
- Store operations are append-only (consistent with other JSONL stores)
- No mutation of input LTS structure

### Motif Record Fields
- `id` (string) — unique identifier (required metadata)
- `version` (string) — record version (required metadata)
- `createdAt` (string) — ISO timestamp (required metadata)
- `signature` (string) — canonical n-gram (labels joined with " → ")
- `ngramSize` (number) — size of the n-gram
- `support` (number) — frequency count
- `exampleOccurrences` (array) — `[{ fromNode: string, path: string[] }]`

## Dependencies
- Depends on: MOTINEVO-11
- Blocks: MOTINEVO-13

## Outcome
Implemented and all tests pass (469/469). Two new modules created:

- `src/evaluation-analytics/motif-miner.js` — Pure function `mineMotifs(lts, config)` that walks all paths in the LTS adjacency graph, collects n-grams of specified sizes, filters by minSupport and maxMotifLength, and returns motifs sorted by support desc / signature asc.
- `src/data-persistence/motif-store.js` — JSONL envelope store (`writeMotifJsonl`, `readMotifJsonl`, `serializeMotifRecord`) following the project's trajectory-log-store pattern with `type: "motif"` envelopes.
- 9 unit tests for motif-miner covering determinism, config filtering, sorting, immutability, and edge cases.
- 7 unit tests for motif-store covering round-trip, serialization determinism, validation, and envelope pattern compliance.

Note: Determinism comes from sorted LTS edges + stable output sorting, not from seeded RNG. The `seed` field in `MotifMiningConfig` schema is unused by the current n-gram extraction algorithm.
