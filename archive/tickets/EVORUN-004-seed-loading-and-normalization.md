# EVORUN-004: Seed loading and normalization

## Goal

Implement a seed loader that reads genome seeds from a JSON file, JSONL file, or directory of seed files. Normalize the result into `{ id, definition }` records, preserving deterministic order.

## Updated assumptions

- There is currently no seed loader module under `src/evolution-runner/`.
- No unit tests exist yet for seed loading/normalization.
- Seeds are represented as `{ id, definition }` objects where `id` is a non-empty string and `definition` is a non-null object (game definition).

## File list (expected to touch)

- `src/evolution-runner/seed-loader.js` (new)
- `src/evolution-runner/seed-loader.d.ts` (new)
- `src/evolution-runner/index.ts`
- `test/unit/evolution-runner/seed-loader.test.mjs` (new)

## Out of scope

- Runner config validation.
- Writing generation artifacts.
- Human feedback capture.

## Acceptance criteria

### Tests

- `node --test test/unit/evolution-runner/seed-loader.test.mjs`
- `npm run test:unit`

### Invariants

- The loader rejects seed entries missing `id` or `definition` (or with invalid types) with clear diagnostics including the file path and entry index/line.
- File order is deterministic (e.g., sorted filenames for directories, stable order within each file).
- The loader never mutates the seed definitions it reads.

## Status

Completed on 2026-01-28.

## Outcome

- Added a new seed loader module with deterministic ordering and diagnostics for JSON/JSONL files and directories, plus exports and unit tests.
- Scope stayed within the runner loader and tests; no changes were required outside `src/evolution-runner` and `test/unit/evolution-runner`.
