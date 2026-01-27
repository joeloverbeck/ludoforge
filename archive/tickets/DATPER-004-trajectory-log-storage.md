# DATPER-004: Trajectory Log Storage (Optional)

## Goal
Persist full trajectory event logs for replay, with retention controls and minimal overhead.

## Scope / Tasks
- Add JSONL writer/reader for `TrajectoryLogRecord` envelopes keyed by simulation run ID.
- Support opt-in persistence (caller chooses whether to write full trajectories).
- Provide a small retention policy helper (e.g., keep-last-N or size cap) for logs.

## File list it expects to touch
- `src/data-persistence/trajectory-log-store.js`
- `src/data-persistence/jsonl.js`
- `test/data-persistence/trajectory-log-store.test.mjs`

## Assumptions (reassessed)
- Runtime data-persistence stores are implemented in `.js` files, while `types.ts` already defines `TrajectoryLogRecord`.
- No central registry module exists for stores; callers import store modules directly.
- Existing `jsonl.js` utilities and envelope validation patterns should be reused for consistency.

## Out of scope
- Any changes to trajectory generation inside simulation-engine.
- Compression or binary storage formats.
- UI for replay.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/data-persistence/trajectory-log-store.test.mjs`

### Invariants that must remain true
- In-memory trajectory objects remain unchanged unless persistence is explicitly invoked.
- No changes to simulation-engine performance characteristics for default runs.

## Status
- Completed (2026-01-27)

## Outcome
- Added `trajectory-log-store.js` with JSONL read/write, deterministic serialization, and a retention helper.
- Added focused JSONL + retention tests; no changes needed in `jsonl.js` or `index.ts`.
