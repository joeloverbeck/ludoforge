# PRELEA-002: Persist preference model snapshots

## Context
Preference learning needs versioned model snapshots to support rollback and A/B evaluation. The spec calls out `training_window`, `hyperparams`, `metrics`, and optional `context_tag` as minimum snapshot metadata.

## Assumptions validated
- No existing preference model snapshot store or record type exists.
- Data-persistence stores use JSONL envelopes with a `type` and `payload` and enforce `id`, `version`, `createdAt`.
- Snapshot records should include model parameters (weights, optional bias) even though the spec only lists metadata, to avoid storing unusable snapshots.

## Scope
- Define a `PreferenceModelSnapshotRecord` in persistence types with spec minimums: `trainingWindow`, `hyperparams`, `metrics`, optional `contextTag`, plus model parameters (`weights`, optional `bias`).
- Add a JSONL store module for preference model snapshots (read/write/serialize) consistent with other stores.
- Add tests for serialization, required metadata, required snapshot fields, and round-trip read/write.

## File list
- src/data-persistence/types.ts
- src/data-persistence/preference-model-store.js
- src/data-persistence/index.ts
- test/data-persistence/preference-model-store.test.mjs

## Out of scope
- No training logic or model updates.
- No migration of existing data files.
- No changes to feedback storage.

## Acceptance criteria
### Specific tests that must pass
- `npm test`
- `node --test test/data-persistence/preference-model-store.test.mjs`

### Invariants that must remain true
- JSONL envelope format is stable and matches other data-persistence modules.
- Required metadata fields (`id`, `version`, `createdAt`) are enforced.
- Required snapshot fields (`trainingWindow`, `hyperparams`, `metrics`, `weights`) are enforced.
- Snapshot records are additive and do not modify or delete other data files.

## Status
- Completed (2026-01-27)

## Outcome
- Added a preference model snapshot record type, JSONL store module, and tests for deterministic serialization + validation.
- Clarified required snapshot fields versus optional context tag/bias; no changes were needed outside data-persistence types/store/tests.
