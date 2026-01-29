# Evolution Runner and Run Isolation

## Purpose

Describe the evolution runner responsibilities, the per-run directory layout, and the isolation rules for starting or resuming runs. This document reflects the implemented runner modules in `src/evolution-runner/` and the `ludoforge-evolve` CLI entrypoint.

## Scope

- Runner-level orchestration of the population loop across generations.
- Run naming, directory layout, and resume rules.
- Isolation guarantees across runs.

## Runner Responsibilities

- Load seed populations and runner configuration from disk.
- Initialize deterministic RNG seeds and pass them into core modules.
- Execute the generation loop via `runGenerationLoop` and related adapters.
- Persist per-generation artifacts and logs for audit and resume.
- Emit structured logging for major phases and generation boundaries.

## Run Naming and Selection

- Users choose a run ID explicitly (UUID) or request a new one.
- When no run ID is provided, the runner generates a new UUID.
- Resuming a run requires selecting an existing run ID; new runs never reuse artifacts from other run IDs.

## Directory Layout

Per `specs/evolution-runner.md`, the runner writes artifacts under a run-scoped directory:

- `runs/<run-id>/generation-<n>/`
  - `population.jsonl`, `evaluated.jsonl`, `rejected.jsonl`
  - `map-elites.json`, `shortlist.json`
  - `feedback.jsonl`, `preference-model.jsonl`
  - `determinism.json` (when seeds/RNG metadata are available)
  - `motifs.jsonl` (when motif mining is enabled)

## Run Isolation Rules

- Populations, artifacts, and feedback never cross run boundaries unless the user explicitly resumes the same run.
- Isolation is enforced by the runner through per-run directories and `runId` tagging in persisted records.
- Core modules (simulation engine, evolutionary engine, analytics) remain unaware of run boundaries and are orchestrated by the runner.

## Resume Behavior

- Load the latest population and preference model snapshot from the selected run directory.
- Validate that the resumed configuration is compatible with the stored artifacts before continuing (config version + MAP-Elites descriptor set).
- Write subsequent generations into the same run directory with incremented generation numbers.

## Determinism

- A single seed should reproduce deterministic paths across runs when inputs are identical.
- The runner uses seeded RNG helpers (no `Math.random`) and persists seeds in artifacts for audit.

## Motif Mining

The runner supports optional motif mining between generations. When enabled,
elite trajectories are analyzed to discover recurring effect-sequence patterns
(motifs) that can be injected back into the population by the `motif-inject`
mutation operator.

### Configuration

Motif mining is configured via `evolution.motifMining` in the runner config
(`schemas/evolution-runner/runner-config.v1.json`):

| Key | Type | Description |
|-----|------|-------------|
| `enabled` | boolean | Whether to run motif mining |
| `eliteSelection.perNicheTopK` | integer | Top K elites per niche to mine |
| `eliteSelection.globalTopK` | integer | Global top K elites to mine |
| `minSupport` | integer | Minimum occurrence count for a pattern to qualify as a motif |
| `maxMotifLength` | integer | Maximum n-gram length to mine |
| `ngramSizes` | integer[] | Which n-gram sizes to enumerate |
| `seed` | integer | RNG seed for deterministic mining |

### Pipeline Flow

1. Select elite genomes from the MAP-Elites grid using `eliteSelection` criteria.
2. Extract trajectory steps from elite simulations.
3. Build a Labelled Transition System via `buildLts(trajectories)` from
   `src/evaluation-analytics/lts-builder.js`.
4. Mine recurring n-gram motifs via `mineMotifs(lts, config)` from
   `src/evaluation-analytics/motif-miner.js`.
5. Persist results to `motifs.jsonl` via `writeMotifJsonl()` from
   `src/data-persistence/motif-store.js`.
6. Optionally feed mined motif sequences to the `motif-inject` mutation operator.

### Artifacts

Per-generation directory includes `motifs.jsonl` when motif mining is enabled.
Each record uses the JSONL envelope pattern (`{ type: "motif", payload }`) with
required metadata fields (`id`, `version`, `createdAt`) and domain fields
(`signature`, `support`).

## Current Implementation Status

- The evolution runner is implemented in `src/evolution-runner/` with unit coverage.
- The CLI entrypoint is `src/cli/ludoforge-evolve.js` (registered as `ludoforge-evolve` in `package.json`).
- The CLI requires an evaluator module for non-dry runs because evaluator functions are not representable in JSON.
- Data persistence modules support run-scoped records via required `runId` fields for metrics and trajectory logs; feedback can optionally include `runId`.
