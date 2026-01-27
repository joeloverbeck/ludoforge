# DATPER-002: Game Definition JSONL Store

Status: Completed (2026-01-27)

## Goal
Implement JSONL persistence for DSL game definitions with versioned metadata and deterministic serialization.

## Scope / Tasks
- Create a JSONL writer/reader for `GameDefinition` records using the shared persistence envelope.
- Ensure serializer is stable (field ordering + normalized metadata) so diffs are reviewable.
- Add minimal validation for required metadata (id, version, createdAt).
- Introduce a small runtime API for reading/writing game definition JSONL files (ESM).

## Reassessed assumptions
- `src/data-persistence/` currently only contains type definitions and re-exports. There is no JSONL helper or store module yet.
- No tests currently exist under `test/data-persistence/` for JSONL persistence.

## Updated scope notes
- Create new runtime modules under `src/data-persistence/` (`game-definition-store.js`, `jsonl.js`).
- Keep existing type exports intact; add new runtime exports only if needed by tests.
- Add focused tests under `test/data-persistence/` for read/write behavior, deterministic serialization, and required metadata validation.

## File list it expects to touch
- `src/data-persistence/game-definition-store.js`
- `src/data-persistence/jsonl.js`
- `test/data-persistence/game-definition-store.test.mjs`

## Out of scope
- Writing simulation results, metrics, trajectories, or feedback.
- Any schema changes to the DSL itself.
- SQLite adapters.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/data-persistence/game-definition-store.test.mjs`

### Invariants that must remain true
- Existing DSL serialization/deserialization behavior does not change.
- No changes to game kernel or simulation-engine outputs.

## Outcome
- Implemented JSONL read/write utilities and a game-definition JSONL store in new runtime modules.
- Added deterministic serialization plus metadata normalization (sorted tags).
- Added focused tests for read/write, determinism, and required metadata validation.
