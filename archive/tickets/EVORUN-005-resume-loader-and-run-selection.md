# EVORUN-005: Resume loader and run selection data

## Goal

Add a resume loader that locates the latest generation artifacts for a given run and restores the population and preference model state. Provide a lightweight function to list existing runs for selection in the CLI.

## Assumptions and scope updates

- There is no existing resume loader, artifact writer, or runner CLI in `src/` yet; this ticket introduces new loader logic and tests only.
- Run metadata currently comes from `writeRunMetadata` in `src/evolution-runner/run-layout.js`; the loader will require a `run.json` that includes a `config` snapshot (with `version` and `mapElites.descriptors`) for compatibility checks.
- Resume artifacts use JSONL persistence patterns already in the repo; the loader will read `population.jsonl` and `preference-model.jsonl` from the latest generation folder.

## File list (expected to touch)

- `src/evolution-runner/resume-loader.js`
- `src/evolution-runner/resume-loader.d.ts`
- `src/evolution-runner/run-layout.js`
- `src/evolution-runner/run-layout.d.ts`
- `src/evolution-runner/index.ts`
- `test/unit/evolution-runner/resume-loader.test.mjs`
- `test/unit/evolution-runner/run-layout.test.mjs`

## Out of scope

- CLI prompts or UI.
- Running new generations.
- Modifying MAP-Elites or mutation logic.

## Acceptance criteria

### Tests

- `node --test test/unit/evolution-runner/resume-loader.test.mjs`
- `npm run test:unit`

### Invariants

- Resume only loads artifacts from the specified run; no cross-run mixing is possible.
- If the resume target is missing or corrupt, the loader fails with a clear error.
- The loader verifies config compatibility using the `run.json` config snapshot (schema version and MAP-Elites descriptor set) before resuming.

## Status

- Completed (2026-01-28)

## Outcome

- Added a new resume loader that reads `run.json`, finds the latest `generation-*` folder, and restores population plus the most recent preference-model snapshot.
- Implemented `listRuns` in `run-layout` to surface existing run IDs for CLI selection.
- Clarified resume inputs to use JSONL artifacts (`population.jsonl`, `preference-model.jsonl`) and a config snapshot in `run.json` rather than introducing new artifact writers.
