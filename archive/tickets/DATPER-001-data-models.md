# DATPER-001: Data Persistence Models and Versioning
Status: Completed (2026-01-27)

## Goal
Define the canonical data shapes and versioning metadata for persisted records (game definitions, runs, metrics, trajectories, feedback).

## Scope / Tasks
- Add a small data-persistence types module with explicit record shapes, IDs, and version fields.
- Capture reproducibility metadata (engine version, RNG seed, timestamps) in the base record type.
- Document JSONL record envelopes (type tag + payload) for each entity.
- Add type-level coverage for the new persistence shapes.

## File list it expects to touch
- `src/data-persistence/types.ts`
- `src/data-persistence/index.ts`
- `test/data-persistence/types.test.ts`
- `tsconfig.json` (only if new paths/types require it)

## Out of scope
- Implementing storage I/O (read/write files).
- Adding SQLite support.
- Changing simulation-engine or evaluation-analytics runtime behavior.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`

### Notes on tests
- Persistence models are type-level only for now, so coverage is via `tsc`.

### Invariants that must remain true
- Existing simulation-engine trajectories are still produced in-memory exactly as before.
- Evaluation-analytics type checks remain compatible with current metric and trajectory summary shapes.

## Outcome
- Added the data-persistence type module with base record metadata, entity records, and JSONL envelopes.
- Coverage is via TypeScript type tests (`.ts`) instead of a runtime `.mjs` test, matching the type-only scope.
- No storage I/O, simulation-engine behavior, or evaluation-analytics shapes were changed.
