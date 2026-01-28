# Evolution Runner CLI Spec

## Purpose

Define the executable entrypoint that orchestrates the seeded population loop across generations.
It wires together existing core modules to run simulations, collect human feedback, compute fitness,
apply evolution operators, and persist artifacts.

## Scope

- Provide a Node.js CLI that runs the population loop end-to-end.
- Keep core engine modules unchanged; the runner lives at the application layer.
- Support deterministic runs via explicit RNG seeds.

## Goals

- Run multiple generations using `runGenerationLoop`.
- Allow optional human-in-the-loop feedback and preference-model updates.
- Persist inputs/outputs per generation for audit and restart.
- Produce clear, structured logs for each phase.

## Non-Goals

- New DSL features or schema changes.
- New metrics or fitness algorithms.
- Web UI or long-running service deployment.

## Inputs

- Seed population
  - Array of genomes: `{ id, definition }`.
  - Load from JSON or JSONL files on disk.
- Loop config
  - Generation count and stopping criteria.
  - MAP-Elites descriptor config.
  - Mutation and crossover rates.
  - Evaluation config (simulation settings, metrics, fitness weights).
- Human feedback config
  - Enabled or disabled.
  - Rating or pairwise mode.
  - Active learning parameters for comparison selection.
- Determinism
  - Global seed and optional per-module seeds.

## Outputs

- Generation artifacts
  - Evaluated genomes and diagnostics.
  - MAP-Elites placements and elites.
  - Next-generation population.
  - Shortlist (if enabled).
- Human feedback logs
  - Raw feedback events.
  - Preference model snapshots per generation.
- Summary report
  - Aggregate statistics, counts, and rejection reasons.

## CLI Interface

- Command name: `ludoforge-evolve` (proposed).
- Required flags
  - `--seeds <path>`: path to seed population file or directory.
  - `--config <path>`: path to runner configuration JSON.
- Optional flags
  - `--generations <n>`: override config.
  - `--out <dir>`: output directory for artifacts.
  - `--seed <n>`: RNG seed override.
  - `--resume <dir>`: resume from prior run artifacts.
  - `--dry-run`: validate inputs without executing simulations.

## Config Schema

- Runner
  - `generations`: number.
  - `shortlistSize`: number.
  - `saveEvery`: number of generations between full snapshots.
- Evaluation
  - `simulation`: mirrors `runSimulation` inputs.
  - `metrics`: enabled metric ids and options.
  - `fitness`: weights, objectives, preference blend settings.
- Evolution
  - `mutation`: operators and rates.
  - `crossover`: operators and rates.
  - `repair`: enabled repairs and options.
- MAP-Elites
  - `descriptors`: array of `{ id, min, max, bins }`.
  - `fitnessKey`, `tieBreak` (optional).
- Human feedback
  - `mode`: `rating` or `comparison`.
  - `activeLearning`: `uncertaintyThreshold`, `diversityQuota`.
  - `maxSamplesPerGen`.

## Execution Flow

1. Load seeds and config.
2. Initialize RNG and preference model state.
3. For each generation:
   - Evaluate each genome via evaluation adapter.
   - Place evaluated candidates into MAP-Elites.
   - Build `nextGeneration` and optional shortlist.
   - If human feedback enabled:
     - Assemble candidates for rating or comparisons.
     - Capture feedback and update preference model.
   - Apply mutation/crossover to elites if configured.
   - Persist artifacts and logs.
4. Emit summary and exit code.

## Persistence

- Output directory structure
  - `runs/<run-id>/generation-<n>/`.
  - `population.jsonl`, `evaluated.jsonl`, `rejected.jsonl`.
  - `map-elites.json`, `shortlist.json`.
  - `feedback.jsonl`, `preference-model.jsonl`.
  - `preference-model.jsonl` uses the preference model snapshot envelope format from `src/data-persistence/preference-model-store.js`.
- Resume
  - Load the latest population and preference model snapshot.
  - Validate compatibility with the current config.

## Determinism Requirements

- Single `seed` produces identical outputs for all deterministic paths.
- Random selection uses `createSeededRng` and avoids `Math.random`.
- Persist seeds in artifacts for audit.

## Error Handling

- Invalid seeds rejected with diagnostics; run continues.
- Fatal error if config or MAP-Elites descriptors invalid.
- Graceful termination on user interrupt with partial artifacts persisted.

## Telemetry and Logging

- Log phase boundaries: seed, simulate, eval, fitness, evolve, feedback.
- Log counts: evaluated, rejected, elites, shortlist.
- Emit timing for each phase and per generation.

## Testing Plan

- Unit tests for config validation and resume loading.
- Integration test for a two-generation run with mocks.
- E2E test that matches the pipeline order in existing `test/e2e`.

## Open Questions

- Naming and location of the CLI entrypoint file.
- Default output directory and retention policy.
- Exact schema for config and artifact files.
