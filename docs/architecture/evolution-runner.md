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
- Track per-operator telemetry (attempts, validity, MAP-Elites contributions) and
  persist it per generation.
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
  - `operator-stats.json` (per-operator telemetry snapshot)

## Run Isolation Rules

- Populations, artifacts, and feedback never cross run boundaries unless the user explicitly resumes the same run.
- Isolation is enforced by the runner through per-run directories and `runId` tagging in persisted records.
- Core modules (simulation engine, evolutionary engine, analytics) remain unaware of run boundaries and are orchestrated by the runner.

## Resume Behavior

- Load the latest population and preference model snapshot from the selected run directory.
- Validate that the resumed configuration is compatible with the stored artifacts before continuing (config version + MAP-Elites descriptor set).
- Write subsequent generations into the same run directory with incremented generation numbers.
- Load `operator-stats.json` from the latest generation and continue accumulating counters.

## Determinism

- A single seed should reproduce deterministic paths across runs when inputs are identical.
- The runner uses seeded RNG helpers (no `Math.random`) and persists seeds in artifacts for audit.

## Operator Telemetry

The runner accumulates per-operator counters and writes a snapshot each generation to:
`runs/<run-id>/generation-<n>/operator-stats.json`.

Counters per operator:

- `attempts`: number of mutation applications for that operator.
- `validOffspring`: number of evaluated offspring that produced valid fitness + descriptors.
- `acceptedOffspring`: number of valid offspring that pass acceptance gates (currently mirrors valid).
- `gridContributions.filledEmpty`: MAP-Elites placements that filled an empty niche.
- `gridContributions.improvedElite`: placements that replaced an existing elite.

Snapshots are cumulative within a run and continue when resuming the same `runId`.

## Motif Mining

The runner supports optional motif mining between generations. When enabled,
elite trajectories are analyzed to discover recurring effect-sequence patterns
(motifs) that can be injected back into the population by the `motif-inject`
mutation operator.

### Configuration

Motif mining is configured via `evolution.motifMining` in the runner config
(`schemas/evolution-runner/runner-config.schema.json`):

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

## Seeding

The runner resolves the initial seed population before entering the generation loop.
Seeding mode is configured via the `seeding` block in the runner config
(`schemas/evolution-runner/runner-config.schema.json`).

### Modes

| Mode | Description |
|------|-------------|
| `generate` | Grammar-based generation with descriptor-aware coverage targeting. The core `src/seed-generation/` module produces schema-valid definitions and bins them against MAP-Elites descriptors to fill niches. |
| `folder` | Load user-provided game definitions from a directory on disk. Each JSON file contains a single DSL game definition (not a Genome wrapper). The runner assigns deterministic genome IDs via content hashing. |
| `mixed` | Load folder seeds first (up to `mix.folderFraction` of `populationSize`), then fill the remainder with the generator. |

### Configuration

| Key | Type | Description |
|-----|------|-------------|
| `mode` | `"generate"` \| `"folder"` \| `"mixed"` | Seeding strategy |
| `populationSize` | integer | Target number of seed genomes |
| `folder.path` | string | Directory containing seed definition JSON files |
| `folder.onInvalid` | `"error"` \| `"skip"` | Behavior when a folder file fails validation |
| `generate.coverage.strategy` | `"uniform-bins"` \| `"underfilled-first"` \| `"random"` | Bin-filling strategy |
| `generate.coverage.maxAttempts` | integer | Hard stop to prevent infinite loops |
| `generate.coverage.fallback.strategy` | `"accept-any-valid"` | Fallback when coverage targets cannot be met |
| `generate.grammar.limits` | object | Ranges for generated construct counts (variables, actions) |
| `generate.grammar.weights` | object | Probability weights for effect kinds and constructs |
| `mix.folderFraction` | number (0–1) | Fraction of `populationSize` to fill from folder |

### Seed Resolution Flow

1. Runner reads `config.seeding` to determine the mode.
2. `src/evolution-runner/seed-resolver.js` dispatches to the appropriate source(s):
   - **generate**: calls `generateSeedPopulation()` from `src/seed-generation/generate-seed-population.js`
   - **folder**: calls `loadFolderSeeds()` from `src/evolution-runner/folder-seeder.js`
   - **mixed**: loads folder seeds, then generates remainder
3. The resulting genomes are written as `population.jsonl` in generation-0.

### Artifacts

- `seed-report.json`: persisted per run, contains generation statistics (`attempts`,
  `accepted`, `rejectedByReason`), bin distribution (`binCounts`), coverage target
  summary, and folder file list (if applicable).

### Relevant Code

- `src/seed-generation/` — core seed generation module (no disk IO)
- `src/evolution-runner/seed-resolver.js` — runner-level mode dispatch
- `src/evolution-runner/folder-seeder.js` — folder loading with deterministic IDs

## Current Implementation Status

- The evolution runner is implemented in `src/evolution-runner/` with unit coverage.
- The CLI entrypoint is `src/cli/ludoforge-evolve.js` (registered as `ludoforge-evolve` in `package.json`).
- The CLI creates the built-in evaluator via `createEvaluator({ descriptorKeys })`,
  passing the descriptor IDs from the runner config so that the evaluator extracts
  exactly the metrics required by the MAP-Elites grid.
- Before entering the generation loop, the CLI validates that all descriptor IDs in
  the config are known metric names (see
  `docs/architecture/evolutionary-engine.md` § Descriptor ID Validation).
  Unknown IDs produce a `CLIError` listing the invalid names and available metrics.
- Data persistence modules support run-scoped records via required `runId` fields for metrics and trajectory logs; feedback can optionally include `runId`.
