# Human Feedback and Preference Modeling

## Feedback Capture

Implemented in `src/human-interface/feedback.js`.

Defaults for rating range, comparison choices, and prompt text are loaded from
`configs/human-feedback.json` (validated by `schemas/config/human-feedback.schema.json`).
Prompt-level overrides can still be passed to the prompt functions; otherwise the
config values are used as defaults.

### Rating Flow

- Prompt label defaults to `promptText.rating`.
- Input range defaults to `rating.min` and `rating.max`.
- Optional tags and rationale are collected after a valid rating.
- Output record:
  - `{ type: "rating", rating, tags?, rationale? }`.

### Pairwise Comparison Flow

- Prompt label defaults to `promptText.comparison`.
- Choice list defaults to `comparison.choices` (expected to be `A`, `B`, `Tie`).
- Optional tags and rationale are collected after a valid choice.
- Output record:
  - `{ type: "comparison", preferred, tags?, rationale? }`.

### Active Learning Pair Selection

Implemented in `src/evaluation-analytics/active-learning.js`.

Active learning defaults are loaded from `configs/active-learning.json`
(validated by `schemas/config/active-learning.schema.json`).

- Uses an ensemble preference model to rank pairs by BALD (Bayesian Active
  Learning by Disagreement) acquisition score — a measure of information gain
  derived from ensemble disagreement. When the ensemble has only one model,
  falls back to prediction variance (`pVar`).
- Optional `uncertaintyThreshold` limits selection to pairs whose acquisition
  score meets a minimum information-gain threshold.
- `diversityQuota` reserves slots for underrepresented `nicheId` values
  (e.g., rare Map-Elites bins).
- `maxPairs` caps the total pairs requested per iteration.
- `cadence` controls how often selection runs (every N iterations).
- Intended to run on a shortlist of elites before prompting comparisons.

### Adaptive Sampling Budget

Implemented in `src/evolution-runner/adaptive-budget.js`.

The adaptive budget feature dynamically adjusts `maxSamplesPerGen` — the
per-generation cap on human feedback prompts — based on ensemble uncertainty:

- When the preference model is **untrained** (`sampleCount === 0`), the base
  budget is used unchanged. An untrained model produces artificially low
  uncertainty (zero ensemble disagreement from all-zero weights) which would
  otherwise halve the budget before the user is ever prompted.
- When ensemble mean uncertainty is low (<= `lowUncertaintyThreshold`, default
  `0.1`), the budget is halved (50% reduction), reducing unnecessary human
  effort when the model is confident.
- When ensemble mean uncertainty is high (>= `highUncertaintyThreshold`, default
  `0.35`), or when new metric IDs are detected that the model has not yet
  learned, the budget is increased by 50% to gather more informative samples.
- The minimum budget is **0** — true zero-feedback generations are allowed when
  the preference controller is in frozen state.

The adaptive budget is computed once in `generation-body.js` and passed through
`feedbackPlan.budget` as `plannedBudget` in the generation context. The feedback
provider uses this pre-computed budget directly when available, falling back to
its own local computation for standalone usage.

This interacts with the active learning pair selection: the adaptive budget
determines _how many_ pairs to request, while BALD acquisition determines
_which_ pairs are most informative. The `diversityQuota` from active learning
still reserves slots for underrepresented niches within the adapted budget.

See [evolution-runner.md](evolution-runner.md) § Adaptive Sampling Budget for
implementation details and config keys.

### Candidate Pool Resolution

Implemented in `src/evolution-runner/candidate-pool.js`.

The candidate pool determines which genomes are available for active learning
pair selection. Configured via `preferenceLearning.activeLearning.candidatePool`:

- `source="shortlist"`: uses the runner shortlist (falls back to elites if empty).
- `source="elites"`: uses all MAP-Elites elite genomes.
- `source="evaluated"`: uses all evaluated genomes.
- `source="mixed"`: uses elites plus a seeded random sample of non-elite evaluated genomes.

After source resolution, an optional `focus.strategy` narrows the pool:

- `"none"`: use the full pool.
- `"topQuantile"`: filter to the top Q% by fitness.

Finally, the pool is truncated to `maxCandidates` via seeded random sampling.

### Comparison Assembly

`assemblePreferenceFeedbackComparison` ties feedback to feature vectors:

- Adds `gameAId`, `gameBId` if ids exist.
- Adds `winnerId` if a non-tie winner exists.
- Copies feature vectors into `featureA` and `featureB`.
- Collapses optional tags/rationale into `notes` (single string) on the comparison payload.

## Preference Model State

Implemented in `src/evaluation-analytics/preference-model.js`.

Preference model defaults are loaded from `configs/preference-model.json`
(validated by `schemas/config/preference-model.schema.json`).

State fields:

- `models`: array of `ModelSnapshot` objects, each containing:
  - `weights`: feature weights keyed by feature id (object map, not positional).
  - `bias`: scalar intercept term.
  - `sampleCount`: total preference samples seen by this model.
- `ensemble`: `{ size: number, method: "online-bagging" }`.
- `version`: increments per update batch.
- `sampleCount`: total preference samples seen (across the ensemble).
- `learningRate`, `maxHistory` with defaults 0.05 and 100.
- `comparisonWeight` (default 1.0) and `ratingWeight` (default 0.25) for weighting
  comparison vs rating updates.
- `weightDecay` (default 0.0), `maxWeightAbs` (default 5.0), `maxBiasAbs` (default 5.0)
  applied for regularization and clamping.
- `history`: most recent feedback samples (clamped to `maxHistory`).

### Training Method: Online Bagging

For each incoming feedback sample, each model in the ensemble draws
`k ~ Poisson(1)` using the seeded RNG and applies the existing update rule
`k` times. This produces bootstrap-like diversity across models while
preserving determinism for identical seeds and feedback sequences.

## Model Update Rules

Each model in the ensemble is updated independently via online bagging.
Per feedback sample, each model draws `k ~ Poisson(1)` and applies the
update rule `k` times:

- Comparison feedback:
  - `target` maps to `{ a: 1, b: 0, tie: 0.5 }`.
  - `diff = featureA - featureB`.
  - `prediction = sigmoid(dot(weights, diff) + bias)`.
  - `error = target - prediction`.
  - `weightDelta = learningRate * comparisonWeight * error * diff`.
  - `biasDelta = learningRate * comparisonWeight * error`.

- Rating feedback:
  - Rating is normalized into a centered target in `[-1, 1]`:
    - `1..5` maps linearly to `-1..1` (`1 -> -1`, `3 -> 0`, `5 -> 1`).
    - `-1..1` is accepted as-is.
  - `predictionCentered = (sigmoid(dot(weights, featureVector) + bias) - 0.5) * 2`.
  - `error = targetCentered - predictionCentered`.
  - `weightDelta = learningRate * ratingWeight * error * featureVector`.
  - `biasDelta = learningRate * ratingWeight * error`.

- Regularization and clamping (per model):
  - Apply deltas, then decay, then clamp.
  - `weights[key] -= learningRate * weightDecay * weights[key]`.
  - `bias -= learningRate * weightDecay * bias`.
  - Clamp weights to `[-maxWeightAbs, maxWeightAbs]` and bias to `[-maxBiasAbs, maxBiasAbs]`.

Every update increments `version` and `sampleCount` on the top-level state.

Note: weights are stored directly under their feature ids in JSON snapshots (there
is no separate feature-id list). Adding new metrics does not misalign existing
weights, but renaming/removing a metric orphans stored weights under the old id,
so treat metric-id changes as a migration event.

Note: scoring and updates are keyed by feature id (object map). Missing features
default to `0`, and extra feature keys that have no stored weight do not affect
the score unless/ until a weight is learned for them.

Note: comparison updates now use a Bradley–Terry / logistic error, keeping updates
probabilistic while still deterministic for identical inputs.

## CLI Integration

The CLI entrypoint (`src/cli/ludoforge-evolve.js`) wires human feedback into the
evolution runner when `config.preferenceLearning.enabled` is `true`. The wiring
uses two factory modules:

- `src/cli/console-io.js` — creates a Node.js readline-based `HumanIO` adapter
  (`{ readLine, writeLine }`) for interactive terminal prompting, with a `close()`
  handle to release the readline interface. Both readline output and `writeLine`
  default to `process.stderr` so that prompts appear alongside pino log output
  (which also writes to stderr) rather than being lost on a separate stream.
  The readline interface forwards SIGINT to the process (readline normally
  intercepts CTRL-C), and `readLine()` rejects on readline `close` events so
  the process never hangs on an unresolvable stdin read.
- `src/human-interface/create-feedback-provider.js` — creates
  `{ feedbackProvider, snapshotProvider }` from an `HumanIO` instance and the
  `preferenceLearning` config block.

The feedback provider is an async function accepting a `GenerationContext` and
returning `FeedbackRecord[]`. Internally it:

1. Extracts candidates from `loopResult.evaluated` (each with `id`,
   `featureVector`, and optional `nicheId`).
2. Calls `selectActiveLearningPairs()` to rank pairs by BALD acquisition score.
3. Prompts the human for each selected pair (comparison or rating mode).
4. Updates the preference model state held in a closure across generations.

The snapshot provider returns the current preference model state as
`PreferenceModelSnapshotRecord[]` for per-generation persistence.

At each of the three CLI call sites (resume, `--seeds`, config-seeding), the
runner options receive `feedback` and `preferenceModelSnapshots` from the
provider. A `try/finally` block ensures `consoleIO.close()` runs on exit. On
resume, the provider is initialized with `resumeState.preferenceModel` so the
model continues from where it left off.

Feedback is only wired when `process.stdin.isTTY` is truthy, so non-interactive
environments (CI, piped input, background processes) skip the feedback loop
instead of blocking indefinitely on readline.

The `preferenceLearning` block is required in the runner config schema
(`schemas/evolution-runner/runner-config.schema.json`) with `enabled` as a
required field. Setting `enabled: false` disables the feedback loop without
removing the config block.

## Preference Controller (Freeze/Unfreeze)

Implemented in `src/evolution-runner/preference-controller.js`.

The preference controller manages a freeze/unfreeze lifecycle that allows
long stretches of zero-feedback generations once the preference model stabilizes.

### Controller State

Persisted as `preference-controller.json` per generation:

- `mode`: `"learning"` or `"frozen"`.
- `stableGenCount`: consecutive generations where mean ensemble uncertainty
  remained below `stableUncertaintyThreshold`.

### Freeze Conditions

Freeze triggers when all conditions are met:

- `freeze.enabled` is `true`.
- Total preference samples >= `freeze.minTotalSamples`.
- `stableGenCount` >= `freeze.freezeAfterStableGens`.
- If `freeze.requireNoNewMetricIds` is `true`, no new metric IDs detected.

### Frozen Behavior

- Non-calibration generations produce `budget=0` (no human prompts).
- Calibration generations (every `calibration.everyGens` generations) produce
  up to `calibration.samples` prompts to detect drift.
- The preference model is unchanged during frozen non-calibration generations.

### Unfreeze Triggers

Any enabled drift trigger fires an unfreeze:

- Mean uncertainty >= `drift.unfreezeUncertaintyThreshold`.
- OOD rate > `drift.ood.maxOodRate` (when OOD detection is enabled).
- Calibration accuracy < `drift.minCalibrationAccuracy`.

### Feedback Plan

`decideFeedbackPlan()` from `src/evolution-runner/feedback-plan.js` combines
controller state, calibration schedule, and adaptive budget into a per-generation
decision: `{ shouldPrompt, budget, reasonCodes }`.

## Per-Generation Diagnostic Artifacts

### Preference Health

Persisted as `preference-health.json` every generation (even without feedback):

| Field | Type | Description |
|-------|------|-------------|
| `meanUncertainty` | number | Average ensemble uncertainty |
| `oodRate` | number | Out-of-distribution rate |
| `controllerMode` | string | `"learning"` or `"frozen"` |
| `stableGenCount` | number | Consecutive stable generations |
| `plannedBudget` | number | Feedback samples scheduled |
| `didPrompt` | boolean | Whether feedback was collected |
| `metricIdDeltaDetected` | boolean | New metric IDs detected |

### Taste Vector

Persisted as `taste-vector.json` every generation:

| Field | Type | Description |
|-------|------|-------------|
| `features` | object | Per-feature `{ meanWeight, stddevWeight }` across ensemble |
| `topPositive` | array | Top K features with highest positive mean weight |
| `topNegative` | array | Top K features with highest negative mean weight |

## Override Policy

Defaults are sourced from the config files listed above at module load time.
Function-level overrides (like prompt labels) may still be provided to callers.
Per-run overrides are configured via the `humanFeedback` block in the runner
config (see CLI Integration above).

## Preference Model Diagnostics

Each generation that produces comparison feedback, the runner computes preference
model accuracy and calibration metrics via `computePreferenceMetrics()` and
persists them as `preference-metrics.json`. This is a diagnostic artifact — it
measures how well the current model state predicts human preferences but does not
affect fitness or evolution. See [evolution-runner.md](evolution-runner.md) §
Preference Metrics for the metric table.

## Use in Fitness

Preference scores are computed from the model weights and feature vectors and
blended into fitness, subject to degeneracy and safety gating. See
`metrics-and-fitness.md` for the scoring blend details.
