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
- `mineMotifs` is a pure function (deterministic with seeded RNG)
- Motif signatures are canonical (same pattern always produces same signature string)
- Store operations are append-only (consistent with other JSONL stores)
- No mutation of input LTS structure

## Dependencies
- Depends on: MOTINEVO-11
- Blocks: MOTINEVO-13
