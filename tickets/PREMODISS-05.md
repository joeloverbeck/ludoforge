# PREMODISS-05 — Persistence Store Update for Ensemble Snapshots

**Status**: Open
**Depends on**: PREMODISS-01
**Blocks**: PREMODISS-06

## Summary

Update serialization/deserialization to handle ensemble model state.

## Files to touch

- `src/data-persistence/preference-model-store.js` — update validation and envelope structure

## Out of scope

- Model state logic (PREMODISS-01)
- Scoring (PREMODISS-02)
- Active learning (PREMODISS-03)
- Fitness (PREMODISS-04)
- JSONL infrastructure (`jsonl.js` — unchanged)
- Any file not listed above

## Acceptance criteria

- Snapshot envelope accepts `models: Array<{weights, bias, sampleCount}>` instead of top-level `weights`/`bias`
- Accepts `ensemble: { size, method }` metadata
- Validation rejects records missing `models` array
- Validation rejects records where any model entry is missing `weights` or `bias`
- `serializePreferenceModelSnapshotRecord()` produces deterministic output (stable stringify)
- Round-trip: write → read produces deeply equal records

## Tests that must pass

- `test/unit/data-persistence/preference-model-store.test.mjs` (updated)
