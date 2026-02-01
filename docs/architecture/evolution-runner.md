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
- Compute and persist preference model diagnostic metrics (`preference-metrics.json`)
  each generation when comparison feedback is available.
- Integrate adaptive operator weighting by feeding telemetry to the `WeightedSelector`
  (see [evolutionary-engine.md](evolutionary-engine.md) § Adaptive Weighting).
- Emit structured logging for major phases and generation boundaries.
- Thread the logger through to the generation loop, evaluation adapter, evaluator,
  and simulation engine so that per-genome evaluation progress, simulation batch
  start/complete, and step progress are visible at debug level.

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
  - `preference-metrics.json` (preference model accuracy/calibration diagnostic, when comparison feedback exists)
  - `preference-controller.json` (freeze/unfreeze controller state)
  - `preference-health.json` (diagnostic snapshot: uncertainty, OOD rate, budget, controller mode)
  - `taste-vector.json` (ensemble weight summary: per-feature mean/stddev, top positive/negative)
  - `debug-log.json` (per-generation debug summary: evaluated/rejected counts, rejection reasons, fitness summaries)

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

## Generation Error Handling

The generation loop body is wrapped in a try/catch so that an uncaught error
within a single generation (e.g., evaluation, simulation, or mutation failure)
does not crash the process:

- **Catch behavior**: the error is logged via `logger.error`, and the runner
  sets `haltedReason` with `{ cause: "generation-error", generation, error }`
  (where `error` is the message string) and breaks out of the loop.
- **Prior results preserved**: any generations that completed before the error
  are retained in the returned `generations` array.
- **Run-complete log**: after the loop (whether successful, halted, or errored),
  the runner logs `"evolution run complete"` with `{ runId, generationsCompleted,
  halted }`.
- **CLI reporter**: `executeAndReport` ensures the progress reporter's
  `onRunComplete` fires even when the runner throws an unexpected error. The
  reporter includes the error message in its stderr output when present.

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
| `unusedElementRatio` | number | Fraction of zones + tokenTypes + variables unreferenced by any action, trigger, termination, or scoring expression (computed via `collectUsedIds()` from `src/dsl/semantic/used-id-collector.js`) |

Health metrics support observability dashboards and early-stopping decisions.

## Preference Metrics

When comparison feedback is available in a generation, the runner computes
preference model diagnostic metrics via `computePreferenceMetrics()` from
`src/evaluation-analytics/preference-metrics.js` and persists them as
`preference-metrics.json`. This is purely diagnostic — no runtime code consumes
the output.

The function takes the first snapshot's model state (`weights`, `bias`) and the
comparison-type feedback samples, then measures:

| Metric | Type | Description |
|--------|------|-------------|
| `accuracy` | number | Fraction of comparisons where the model's predicted preference matches the human's |
| `correct` | number | Count of correct predictions |
| `total` | number | Total comparison samples evaluated |
| `ties` | number | Count of samples where the human preferred "tie" |
| `bucketSize` | number | Calibration bucket width (default 0.1) |
| `calibrationBuckets` | array | Per-bucket predicted vs actual outcome averages for calibration analysis |

When no comparison feedback exists in a generation, the field is omitted from the
artifact output.

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

Note: since the create-at-use pattern (`pickOrCreate*` helpers) now creates
missing prerequisites on demand, `"noOp"` outcomes are significantly rarer than
before standalone add operators were the only way to introduce new elements.

**Configuration**: `maxMutationRetries` (default `3`, configurable via
`config.evolution.mutation.maxMutationRetries`). Total attempts per slot =
`maxMutationRetries + 1`.

The applicator returns `{ population, operatorNames, outcomes }` where `outcomes`
is an array with one entry per offspring slot: `"ok"`, `"noOp"`, `"repairFailed"`,
or `"exhausted"`.

## Multi-Offspring

The evolution applicator supports producing multiple children per parent via
`offspringPerParent` (default `1`, configurable via
`config.evolution.mutation.offspringPerParent`). Each parent runs the full
mutation/crossover/retry loop N times independently, producing N offspring.
This grows the candidate pool for MAP-Elites niche competition without
requiring a larger elite set.

Output arrays (`population`, `operatorNames`, `outcomes`) have length
`parents.length * offspringPerParent`.

## Population Cap

After evolution produces offspring, the runner truncates the population to
prevent unbounded growth across generations. Without a cap,
`offspringPerParent > 1` causes compounding: each generation's output becomes
the next generation's input, and backfill preserves the inflated size.

**Configuration**: `runner.maxPopulationSize` (positive integer, optional).
Falls back to `seeding.populationSize` when not set. When neither is
configured, no cap is applied.

The truncation takes the first `maxPopulationSize` genomes from the evolved
population (via `slice`). The `pendingOperatorNames` array is sliced in
lockstep to maintain alignment.

The cap is applied **before** population replenishment, so `minPopulationSize`
can still inject genomes up to the floor after truncation.

## Population Replenishment

After the population cap is applied, the runner checks
whether the population has fallen below a minimum floor. If so,
`replenishPopulation()` from `src/evolution-runner/population-replenisher.js`
generates fresh random genomes using `generateGameDefinition()` and validates
each with `validateGameDefinition()` before adding it. Up to 20 attempts are
made per needed genome.

**Configuration**: `runner.minPopulationSize` (positive integer, optional). When
set and the evolved population is smaller, random genomes are injected to reach
the minimum. The runner logs `{ injectedCount, generation }` when injection
occurs.

This acts as a safety net against population extinction when MAP-Elites niche
coverage is sparse or many mutations are rejected.

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
| `timeoutMs` | integer | Maximum wall-clock time for motif mining (default 120,000 ms). When exceeded, the pipeline is aborted via `AbortController` and the generation continues without motifs. |

### Timeout & Abort

The generation body creates an `AbortController` before launching the motif pipeline.
A `setTimeout` fires after `timeoutMs` and calls `controller.abort()`. The signal is
threaded through `runMotifMiningPipeline` → `mineMotifs` → `collectNgrams`, where it
is checked alongside the `maxStackSize` and `maxPaths` limits in the DFS hot loop.
Because `mineMotifs` yields to the event loop every 5,000 iterations via `setImmediate`,
the timeout callback can actually fire even during heavy graph traversal — unlike the
previous `withTimeout` wrapper which could never resolve while a synchronous function
blocked the event loop. On abort, the generation logs a warning and proceeds with
`miningResult = null`.

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
5. **Motif mining**: `await mineMotifs(lts, config, { signal })` from `src/evaluation-analytics/motif-miner.js`.
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
| `generate` | Grammar-based generation with descriptor-aware coverage targeting. The core `src/seed-generation/` module produces schema-valid definitions and bins them against MAP-Elites descriptors to fill niches. Generated seeds include variables, actions with effects (and ~25% chance of `dec` costs per action), and optionally token types (with companion zones) and triggers — controlled by `grammar.limits` (`minTokenTypes`, `maxTokenTypes`, `minTriggers`, `maxTriggers`). After generation, `wireTokenTypesToActions()` ensures every token type and zone is referenced by at least one action effect, so seeds start with zero unused elements. |
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
  `accepted`, `rejectedByReason`, `acceptedSpecialOnly`, `specialOnlyCapHit`),
  bin distribution (`binCounts`, `specialBinCounts`), coverage target summary,
  and folder file list (if applicable). Seeds that bin into special MAP-Elites bins
  are governed by the `specialOnly` policy in `seeding.generate.coverage`.

### Relevant Code

- `src/seed-generation/` — core seed generation module (no disk IO)
- `src/evolution-runner/seed-resolver.js` — runner-level mode dispatch
- `src/evolution-runner/folder-seeder.js` — folder loading with deterministic IDs

## Human Feedback Integration

The runner config schema requires a top-level `preferenceLearning` block with at
minimum `enabled` (boolean). When `preferenceLearning.enabled` is `true`, the CLI
wires an interactive feedback loop into the generation cycle:

1. `createConsoleIO()` (from `src/cli/console-io.js`) opens a readline-based
   `HumanIO` adapter for terminal prompting. Both readline output and
   `writeLine` default to `process.stderr` so prompts appear alongside pino
   log output in the same stream.
2. `createFeedbackProvider()` (from `src/human-interface/create-feedback-provider.js`)
   returns an async `feedbackProvider` and a `snapshotProvider`.
3. These are passed as `feedback` and `preferenceModelSnapshots` to
   `runEvolutionRunner()`.

The feedback provider is async — the runner awaits it each generation, gated
by the feedback plan (see § Preference Controller below).

Feedback is only wired when `process.stdin.isTTY` is truthy, so
non-interactive environments (CI, piped input, background processes) skip
the feedback loop instead of blocking indefinitely on readline.

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

- **Disabled** (`enabled !== true`): returns `baseMaxSamples`.
- **New metric IDs detected**: if `metricIds` contains IDs not present in
  `previousMetricIds`, returns `ceil(baseMaxSamples * 1.5)` (50% increase) to
  gather more preference data for the new feature dimensions.
- **High uncertainty** (mean ensemble uncertainty >= `highUncertaintyThreshold`,
  default `0.35`): returns `ceil(baseMaxSamples * 1.5)` (50% increase).
- **Low uncertainty** (mean ensemble uncertainty <= `lowUncertaintyThreshold`,
  default `0.1`): returns `floor(baseMaxSamples * 0.5)` (50% reduction).
- **Otherwise**: returns the base budget unchanged.

The minimum budget is **0** — true zero-feedback generations are supported when
the preference controller is in frozen state.

Mean uncertainty is computed by calling `computePreferenceScore()` on each
candidate's feature vector and averaging the `uncertainty` values.

Config keys (in `preferenceLearning.budget.adaptive`):
- `enabled` (boolean): whether adaptive budgeting is active.
- `lowUncertaintyThreshold` (number): threshold below which the budget is halved.
- `highUncertaintyThreshold` (number): threshold above which the budget is increased.

### Preference Controller

Implemented in `src/evolution-runner/preference-controller.js`.

Each generation, the runner advances the preference controller state through
`advanceController()`, which manages freeze/unfreeze transitions:

- **Learning mode**: adaptive budget determines feedback volume; stableGenCount
  tracks consecutive low-uncertainty generations toward a freeze.
- **Frozen mode**: `decideFeedbackPlan()` returns `budget=0` except during
  calibration generations (every `calibration.everyGens` generations).
- **Unfreeze**: triggered by uncertainty spike, OOD rate spike, or calibration
  accuracy drop.

Controller state is persisted as `preference-controller.json` each generation.

See [human-feedback.md](human-feedback.md) § Preference Controller for the
full freeze/unfreeze lifecycle.

### Per-Generation Artifacts

The following artifacts are written every generation (even without feedback):

| Artifact | File | Description |
|----------|------|-------------|
| Controller state | `preference-controller.json` | `mode` and `stableGenCount` |
| Preference health | `preference-health.json` | Diagnostic snapshot: uncertainty, OOD rate, budget, controller mode |
| Taste vector | `taste-vector.json` | Ensemble weight summary: per-feature mean/stddev, top positive/negative |
| Preference metrics | `preference-metrics.json` | Model accuracy/calibration (only when comparison feedback exists) |

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
- When `preferenceLearning.enabled` is `true` **and** `process.stdin.isTTY` is
  truthy, the CLI creates console I/O and a feedback provider, wiring them
  into the runner options at each call site (resume, `--seeds`,
  config-seeding). A `try/finally` block ensures the readline interface is
  closed on exit. Non-interactive environments silently skip the feedback
  loop.
- Data persistence modules support run-scoped records via required `runId` fields for metrics and trajectory logs; feedback can optionally include `runId`.
