# PREMODISS-05 — Persistence Store Update for Ensemble Snapshots

**Status**: Completed
**Depends on**: PREMODISS-01
**Blocks**: PREMODISS-06

## Summary

Update serialization/deserialization to handle ensemble model state.

## Files to touch

- `src/data-persistence/preference-model-store.js` — update validation and envelope structure
- `src/evolution-runner/runner.js` — update `defaultPreferenceModelSnapshot()` to produce ensemble-format records

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

## Outcome

All acceptance criteria met. Changes:

- **`src/data-persistence/preference-model-store.js`**: Added `assertModelsArray()` validator. Replaced `assertRequiredObject(record, "weights", ...)` and `assertOptionalNumber(record, "bias", ...)` with `assertModelsArray(record, ...)` and `assertRequiredObject(record, "ensemble", ...)` in both `toPreferenceModelSnapshotEnvelope` and `parsePreferenceModelSnapshotEnvelope`.
- **`src/evolution-runner/runner.js`**: Updated `defaultPreferenceModelSnapshot()` to emit `models` array and `ensemble` metadata instead of top-level `weights`.
- **`test/unit/data-persistence/preference-model-store.test.mjs`**: Updated all fixtures to ensemble format. Added 3 new test cases: rejects missing `models` array, rejects model entries missing `weights`/`bias`, rejects missing `ensemble` metadata.
- **`test/unit/evolution-runner/artifact-writer.test.mjs`**: Updated snapshot fixtures to ensemble format.
- **`test/unit/evolution-runner/resume-loader.test.mjs`**: Updated snapshot fixtures to ensemble format.

The original ticket scoped only `preference-model-store.js`, but `defaultPreferenceModelSnapshot()` in `runner.js` also needed updating since it produces records consumed by the store. Test fixtures in `artifact-writer.test.mjs` and `resume-loader.test.mjs` required corresponding updates.

All 788 unit tests pass. TypeScript type check passes clean.
