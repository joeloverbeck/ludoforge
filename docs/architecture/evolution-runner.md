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
- Monitor per-generation rejection rates and halt early when thresholds are exceeded.
- Compute and persist population health metrics (`health.json`) each generation.
- Integrate adaptive operator weighting by feeding telemetry to the `WeightedSelector`
  (see [evolutionary-engine.md](evolutionary-engine.md) § Adaptive Weighting).
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
  - `health.json` (population health metrics snapshot)

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
- `noOp`: operator was invoked but made no change (structural guard, missing prerequisites).
- `repairFailed`: operator produced a mutated genome but repair returned `null`.
- `rejected`: breakdown of evaluation rejections by reason:
  - `validationFailure`, `safetyFailure`, `evaluationError`, `evaluationNull`.
- `evaluated`: number of mutated genomes actually sent to evaluation (post-repair).
- `validEvaluated`: number of evaluated mutated genomes that produced valid `{ fitness, descriptors }`.
- `gridContributions.filledEmpty`: MAP-Elites placements that filled an empty niche.
- `gridContributions.improvedElite`: placements that replaced an existing elite.

**Accounting invariant** (per operator):

```
attempts === noOp + repairFailed + rejectedTotal + validEvaluated
```

where `rejectedTotal = rejected.validationFailure + rejected.safetyFailure + rejected.evaluationError + rejected.evaluationNull`.

Additionally: `evaluated === rejectedTotal + validEvaluated` and
`validEvaluated <= evaluated <= attempts`.

Snapshots are cumulative within a run and continue when resuming the same `runId`.

## Early Stopping

The runner monitors per-generation rejection rates and halts the run when the
population is overwhelmingly degenerate:

- **Threshold**: `rejectionRateThreshold` (default `0.8`). A generation is
  considered high-rejection when `rejected.length / totalEvaluated > threshold`.
- **Consecutive limit**: `maxConsecutiveRejections` (default `3`). The run halts
  after this many consecutive high-rejection generations.
- **Halt payload**: the runner result includes `haltedReason` with `{ generation,
  rejectionRate, consecutiveHighRejections, dominantReason }`.
- **Logging**: the runner emits a warning log (`"evolution halted due to high
  rejection rate"`) with the halt payload.

Config keys live in `runner` block: `rejectionRateThreshold`, `maxConsecutiveRejections`.

## Health Metrics

Each generation, the runner computes population health metrics via
`computeHealthMetrics()` from `src/evolution-runner/health-metrics.js` and
persists them as `health.json`.

| Metric | Type | Description |
|--------|------|-------------|
| `meanFitness` | number | Mean fitness of evaluated genomes |
| `medianFitness` | number | Median fitness of evaluated genomes |
| `rejectionRate` | number | `rejected / (evaluated + rejected)` |
| `rejectionReasons` | object | Frequency map of rejection reason categories |
| `degeneracyFlags` | object | Frequency map of degeneracy flags across evaluated genomes |
| `nicheOccupancy` | number | Number of occupied MAP-Elites niches |
| `operatorInefficiencyRate` | number | `(attempts - validEvaluated) / attempts` across all operators |
| `repairFailureRate` | number | `repairFailed / attempts` across all operators (truthful: counts only actual repair failures) |
| `noOpRate` | number | `noOp / attempts` across all operators |

Health metrics support observability dashboards and early-stopping decisions.

## Adaptive Weight Integration

After evaluating each generation, the runner calls
`mutationSelector.observe(telemetry)` to update operator weights based on
per-operator failure rates. See
[evolutionary-engine.md](evolutionary-engine.md) § Adaptive Weighting for the
algorithm details. The updated weights take effect for the next generation's
mutation selection.

## Mutation Retry Loop

The runner's evolution applicator (`src/evolution-runner/evolution-applicator.js`)
retries unproductive mutation attempts per offspring slot:

1. For each offspring slot, pick an operator and invoke `mutateAndRepairGenome()`.
2. If the outcome is `"noOp"` or `"repairFailed"`, record the telemetry counter
   and retry with a fresh operator pick.
3. On `"ok"`, use the mutated genome and stop retrying.
4. If all retries are exhausted without a productive mutation, the slot keeps the
   unmutated parent genome (this fallback is **not** counted as `validEvaluated`).

**Configuration**: `maxMutationRetries` (default `3`, configurable via
`config.evolution.mutation.maxMutationRetries`). Total attempts per slot =
`maxMutationRetries + 1`.

The applicator returns `{ population, operatorNames, outcomes }` where `outcomes`
is an array with one entry per offspring slot: `"ok"`, `"noOp"`, `"repairFailed"`,
or `"exhausted"`.

## Motif Mining

The runner integrates motif mining into the generation loop. When enabled,
elite genomes are re-simulated to extract trajectory data, an LTS is built,
motifs are mined and converted to DSL effects, and the `motif-inject` mutation
operator is dynamically recreated with the mined motifs each generation.

### Configuration

Motif mining is configured via `evolution.motifMining` in the runner config
(`schemas/evolution-runner/runner-config.schema.json`). The `evolution` block
and `motifMining` within it are both required (set `enabled: false` to disable).

| Key | Type | Description |
|-----|------|-------------|
| `enabled` | boolean | Whether to run motif mining |
| `eliteSelection.perNicheTopK` | integer | Top K elites per niche to mine |
| `eliteSelection.globalTopK` | integer | Global top K elites to mine |
| `minSupport` | integer | Minimum occurrence count for a pattern to qualify as a motif |
| `maxMotifLength` | integer | Maximum n-gram length to mine |
| `ngramSizes` | integer[] | Which n-gram sizes to enumerate |
| `seed` | integer | RNG seed for deterministic re-simulation and mining |

### Pipeline Flow

Orchestrated by `runMotifMiningPipeline()` from `src/evolution-runner/motif-pipeline.js`:

1. **Elite selection**: `selectElitesForMining()` from `src/evolution-runner/elite-selector.js`
   groups MAP-Elites placements by niche, takes per-niche top-K and global top-K
   by fitness, and deduplicates by genome ID.
2. **Re-simulation**: `extractEliteTrajectories()` from `src/evolution-runner/elite-resimulator.js`
   re-simulates each elite genome using `createSimulationEngine()` with
   `createSeededRng(seed + eliteIndex)` for deterministic results. Each elite
   produces 3 simulation runs, yielding trajectory step arrays.
3. **Effect map**: `buildEffectMap()` from `src/evaluation-analytics/motif-effect-converter.js`
   creates a `Map<canonicalLabel, AppliedEffect[]>` from trajectory steps, mapping
   each canonical edge label to the actual applied effects that produced it.
4. **LTS construction**: `buildLts(trajectories)` from `src/evaluation-analytics/lts-builder.js`.
5. **Motif mining**: `mineMotifs(lts, config)` from `src/evaluation-analytics/motif-miner.js`.
6. **Effect conversion**: `convertMotifsToEffects()` from `src/evaluation-analytics/motif-effect-converter.js`
   looks up each motif path label in the effect map, converts applied effects to
   DSL-compatible effects via `toDslEffect()` (strips runtime fields like `source`,
   `scope`, `clamped`, `tokenId`), and returns effect sequences.
7. **Persistence**: writes motif records to `motifs.jsonl` via `writeMotifJsonl()` from
   `src/data-persistence/motif-store.js`.
8. **Operator swapping**: if mining produced motif effects and the `motif-inject` operator
   is in the mutation operator list, the runner replaces it with a fresh instance via
   `createMotifInjectMutation(motifEffects)`. The mutation operators array is cloned
   at runner startup to allow per-generation replacement without affecting the original.

Returns `null` when mining is disabled, no elites are available, or no motifs
meet the support threshold.

### Artifacts

Per-generation directory includes `motifs.jsonl` when motif mining is enabled.
Each record uses the JSONL envelope pattern (`{ type: "motif", payload }`) with
required metadata fields (`id`, `version`, `createdAt`) and domain fields
(`signature`, `support`).

### Relevant Code

- `src/evolution-runner/motif-pipeline.js` — pipeline orchestrator
- `src/evolution-runner/elite-selector.js` — elite selection from MAP-Elites grid
- `src/evolution-runner/elite-resimulator.js` — deterministic re-simulation
- `src/evaluation-analytics/motif-effect-converter.js` — effect map, DSL conversion
- `src/evaluation-analytics/lts-builder.js` — LTS construction
- `src/evaluation-analytics/motif-miner.js` — n-gram motif mining
- `src/data-persistence/motif-store.js` — JSONL persistence

## Seeding

The runner resolves the initial seed population before entering the generation loop.
Seeding mode is configured via the `seeding` block in the runner config
(`schemas/evolution-runner/runner-config.schema.json`).

### Modes

| Mode | Description |
|------|-------------|
| `generate` | Grammar-based generation with descriptor-aware coverage targeting. The core `src/seed-generation/` module produces schema-valid definitions and bins them against MAP-Elites descriptors to fill niches. Generated seeds include variables, actions with effects, and optionally token types (with companion zones) and triggers — controlled by `grammar.limits` (`minTokenTypes`, `maxTokenTypes`, `minTriggers`, `maxTriggers`). |
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

## Human Feedback Integration

The runner config schema requires a top-level `humanFeedback` block with at
minimum `enabled` (boolean) and `mode` (`"comparison"` or `"rating"`). When
`humanFeedback.enabled` is `true`, the CLI wires an interactive feedback loop
into the generation cycle:

1. `createConsoleIO()` (from `src/cli/console-io.js`) opens a readline-based
   `HumanIO` adapter for terminal prompting.
2. `createFeedbackProvider()` (from `src/human-interface/create-feedback-provider.js`)
   returns an async `feedbackProvider` and a `snapshotProvider`.
3. These are passed as `feedback` and `preferenceModelSnapshots` to
   `runEvolutionRunner()`.

The feedback provider is async — the runner awaits it each generation.

On resume, the provider is initialized with `resumeState.preferenceModel` so
the preference model continues from its stored state.

See [human-feedback.md](human-feedback.md) § CLI Integration for the full
wiring details and provider internals.

### Adaptive Sampling Budget

Implemented in `src/evolution-runner/adaptive-budget.js`.

`computeAdaptiveBudget({ preferenceModelState, baseMaxSamples, metricIds,
previousMetricIds, candidates, lowUncertaintyThreshold,
highUncertaintyThreshold, enabled })` dynamically adjusts the per-generation
human feedback sample count based on ensemble uncertainty and metric changes:

- **Disabled** (`enabled !== true`): returns `baseMaxSamples` (normalized to
  at least 1).
- **New metric IDs detected**: if `metricIds` contains IDs not present in
  `previousMetricIds`, returns `ceil(baseMaxSamples * 1.5)` (50% increase) to
  gather more preference data for the new feature dimensions.
- **High uncertainty** (mean ensemble uncertainty >= `highUncertaintyThreshold`,
  default `0.35`): returns `ceil(baseMaxSamples * 1.5)` (50% increase).
- **Low uncertainty** (mean ensemble uncertainty <= `lowUncertaintyThreshold`,
  default `0.1`): returns `floor(baseMaxSamples * 0.5)` (50% reduction).
- **Otherwise**: returns the base budget unchanged.

The minimum budget is always 1 (`Math.max(1, ...)`).

Mean uncertainty is computed by calling `computePreferenceScore()` on each
candidate's feature vector and averaging the `uncertainty` values.

Config keys (in `humanFeedback.adaptiveBudget`):
- `enabled` (boolean): whether adaptive budgeting is active.
- `lowUncertaintyThreshold` (number): threshold below which the budget is halved.
- `highUncertaintyThreshold` (number): threshold above which the budget is increased.

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
- When `humanFeedback.enabled` is `true`, the CLI creates console I/O and a
  feedback provider, wiring them into the runner options at each call site
  (resume, `--seeds`, config-seeding). A `try/finally` block ensures the
  readline interface is closed on exit.
- Data persistence modules support run-scoped records via required `runId` fields for metrics and trajectory logs; feedback can optionally include `runId`.
