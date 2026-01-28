# EVORUN-007: Generation loop orchestration

## Goal

Implement the runner logic that executes multiple generations using `runGenerationLoop`, applies mutation/crossover where configured, and hands artifacts off to the persistence layer.

## Assumptions and scope updates

- There is no evolution-runner orchestration module yet; this ticket introduces it in `src/evolution-runner/runner.js` (with typings).
- The runner will call `writeGenerationArtifacts` from `src/evolution-runner/artifact-writer.js` to persist per-generation outputs.
- Persist `determinism` metadata when seed/RNG details are available.
- Human-feedback collection is out of scope here; the runner will accept caller-provided feedback/snapshot data and otherwise emit a minimal preference-model snapshot to satisfy artifact persistence.

## File list (expected to touch)

- `src/evolution-runner/runner.js`
- `src/evolution-runner/runner.d.ts`
- `src/evolution-runner/index.ts`
- `test/unit/evolution-runner/runner.test.mjs`

## Out of scope

- CLI argument parsing and prompts.
- Adding new mutation or crossover operators.
- Schema changes for DSL or metrics.

## Acceptance criteria

### Tests

- `node --test test/unit/evolution-runner/runner.test.mjs`
- `npm run test:unit`

### Invariants

- With the same seed and inputs, the runner produces identical outputs (including generation ordering).
- The runner never mutates the seed population in-place; it always produces new generation arrays.
- Each generation uses the MAP-Elites configuration defined by the validated runner config.
- Generation artifacts are persisted via `writeGenerationArtifacts` under `runs/<run-id>/generation-<n>/`.

## Status

Completed on 2026-01-28.

## Outcome

- Added a new evolution-runner orchestration module that loops generations with `runGenerationLoop`, applies mutation/crossover when configured, and persists artifacts via `writeGenerationArtifacts`.
- Exported the runner from `src/evolution-runner/index.ts` with typings and added unit coverage for orchestration, determinism, and population immutability.
