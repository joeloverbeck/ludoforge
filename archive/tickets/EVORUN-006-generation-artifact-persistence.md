# EVORUN-006: Generation artifact persistence

## Goal

Implement a persistence module that writes generation artifacts to the run directory using the structure defined in `specs/evolution-runner.md`. This should handle population, evaluated/rejected genomes, MAP-Elites state, shortlist, feedback logs, and preference model snapshots.

## Assumptions and scope updates

- The persistence helper does not exist yet; this ticket will add it alongside unit tests.
- `specs/evolution-runner.md` lists `preference-model.json`, but existing resume loading and persistence helpers use JSONL; this ticket will write `preference-model.jsonl` until the spec is revised.
- Artifacts must include `population.jsonl` and `preference-model.jsonl` in each `generation-<n>/` folder to support resume loading (see `EVORUN-005`).
- `population.jsonl` should serialize genomes with `{ id, definition }` per line.
- `preference-model.jsonl` must use the existing preference model snapshot envelope format (`src/data-persistence/preference-model-store.js`).
- Record determinism metadata in a dedicated `determinism.json` file when the caller supplies seed/RNG details.

## File list (expected to touch)

- `src/evolution-runner/artifact-writer.js`
- `src/evolution-runner/artifact-writer.d.ts`
- `src/evolution-runner/index.ts`
- `test/unit/evolution-runner/artifact-writer.test.mjs`

## Out of scope

- Running the generation loop.
- CLI argument parsing.
- Mutating or repairing genomes.

## Acceptance criteria

### Tests

- `node --test test/unit/evolution-runner/artifact-writer.test.mjs`
- `npm run test:unit`

### Invariants

- Artifacts are written under `runs/<run-id>/generation-<n>/` and never outside.
- JSONL outputs preserve the existing envelope formats for feedback and preference snapshots.
- Persisted seeds and RNG metadata are recorded for determinism audits when provided to the writer.

## Status

Completed on 2026-01-28.

## Outcome

- Added a generation artifact writer that persists JSON/JSONL outputs under `runs/<run-id>/generation-<n>/`.
- Wrote preference model snapshots to `preference-model.jsonl` (aligns with existing resume loader, despite spec noting `preference-model.json`).
- Recorded determinism metadata in `determinism.json` when supplied.
