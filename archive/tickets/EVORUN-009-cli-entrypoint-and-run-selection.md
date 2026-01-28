# EVORUN-009: CLI entrypoint and run selection

## Goal

Add the `ludoforge-evolve` CLI entrypoint that parses flags, validates inputs, selects or creates a run, and invokes the runner. The CLI must allow users to resume existing runs by run ID or start a new run with an explicit run ID or an auto-generated unique ID.

## Assumptions and scope updates

- Run selection should rely on `listRuns` from `src/evolution-runner/run-layout.js`.
- Resume should use `loadResumeState` from `src/evolution-runner/resume-loader.js`, passing the validated runner config to enforce compatibility checks.
- The CLI should validate runner configs with `validateRunnerConfig` before starting/resuming a run.
- When starting a new run, the CLI should call `writeRunMetadata` to persist the config snapshot used for resume compatibility.
- There is no existing CLI entrypoint or CLI test coverage; this ticket adds `src/cli/` as a new module with unit tests.
- The runner requires an evaluator function at runtime (cannot be represented in JSON), so the CLI must accept an evaluator module path (e.g. `--evaluator`) for non-`--dry-run` executions.

## File list (expected to touch)

- `src/cli/ludoforge-evolve.js`
- `src/cli/ludoforge-evolve.d.ts`
- `package.json`
- `test/unit/cli/ludoforge-evolve.test.mjs`

## Out of scope

- Changes to core engine internals.
- New human feedback UI beyond terminal prompts.
- Persisting generation artifacts beyond existing runner output (handled elsewhere).
- Implementing new evaluation adapters; the CLI only loads a user-provided evaluator module.

## Acceptance criteria

### Tests

- `node --test test/unit/cli/ludoforge-evolve.test.mjs`
- `npm run test:unit`

### Invariants

- If the user chooses an existing run ID, only that run is resumed.
- If no run ID is provided, the CLI generates a new unique run ID and uses it consistently.
- `--dry-run` validates inputs without running simulations or writing artifacts.
- CLI seed loading uses `loadSeedPopulation` and passes the normalized seed population into the runner.

## Status

- Completed (2026-01-28)

## Outcome

- Added a new `ludoforge-evolve` CLI entrypoint with run selection, config validation, seed loading, and evaluator module loading.
- Implemented unit tests covering dry-run, resume selection, and new run metadata wiring.
- Scoped CLI behavior to run IDs and evaluator module injection rather than implicit evaluation adapters.
