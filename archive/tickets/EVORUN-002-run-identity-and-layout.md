# EVORUN-002: Run identity and output layout utilities

## Goal

Introduce a small utility module that creates and validates run IDs, resolves run-specific paths, and writes a minimal run metadata file. This is the foundation for keeping runs isolated and restartable.

## Assumptions (reassessed)

- There is no existing `src/evolution-runner/` module in the repo yet; this ticket will create it.
- There is no existing unit test folder for evolution-runner; this ticket will add it.
- Existing code uses `.js` runtime files with `.d.ts` typings and `index.ts` for type exports.

## File list (expected to touch)

- `src/evolution-runner/run-layout.js` (new)
- `src/evolution-runner/run-layout.d.ts` (new)
- `src/evolution-runner/index.ts` (new)
- `test/unit/evolution-runner/run-layout.test.mjs` (new)

## Out of scope

- CLI argument parsing or interactive selection.
- Loading seeds or config.
- Writing generation artifacts beyond the run metadata file.

## Acceptance criteria

### Tests

- `node --test test/unit/evolution-runner/run-layout.test.mjs`
- `npm run test:unit`

### Invariants

- A run ID uniquely identifies a single run directory under `runs/<run-id>/`.
- Utilities never read or write outside the resolved run directory.
- Auto-generated run IDs are extremely unlikely to collide (e.g., UUID-based or equivalent).

## Status

Completed on 2026-01-28.

## Outcome

- Created the new `src/evolution-runner/` module with run ID utilities, safe path resolution, and run metadata writer.
- Added unit coverage for run ID validation, path traversal protection, and metadata writes (new test file/folder).
