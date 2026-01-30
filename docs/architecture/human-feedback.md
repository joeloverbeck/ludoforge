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

- When ensemble mean uncertainty is low (<= `lowUncertaintyThreshold`, default
  `0.1`), the budget is halved (50% reduction), reducing unnecessary human
  effort when the model is confident.
- When ensemble mean uncertainty is high (>= `highUncertaintyThreshold`, default
  `0.35`), or when new metric IDs are detected that the model has not yet
  learned, the budget is increased by 50% to gather more informative samples.
- The minimum budget is always 1.

This interacts with the active learning pair selection: the adaptive budget
determines _how many_ pairs to request, while BALD acquisition determines
_which_ pairs are most informative. The `diversityQuota` from active learning
still reserves slots for underrepresented niches within the adapted budget.

See [evolution-runner.md](evolution-runner.md) § Adaptive Sampling Budget for
implementation details and config keys.

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
evolution runner when `config.humanFeedback.enabled` is `true`. The wiring uses
two factory modules:

- `src/cli/console-io.js` — creates a Node.js readline-based `HumanIO` adapter
  (`{ readLine, writeLine }`) for interactive terminal prompting, with a `close()`
  handle to release the readline interface.
- `src/human-interface/create-feedback-provider.js` — creates
  `{ feedbackProvider, snapshotProvider }` from an `HumanIO` instance and the
  `humanFeedback` config block.

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

The `humanFeedback` block is required in the runner config schema
(`schemas/evolution-runner/runner-config.schema.json`) with `enabled` and `mode`
as required fields. Setting `enabled: false` disables the feedback loop without
removing the config block.

## Override Policy

Defaults are sourced from the config files listed above at module load time.
Function-level overrides (like prompt labels) may still be provided to callers.
Per-run overrides are configured via the `humanFeedback` block in the runner
config (see CLI Integration above).

## Use in Fitness

Preference scores are computed from the model weights and feature vectors and
blended into fitness, subject to degeneracy and safety gating. See
`metrics-and-fitness.md` for the scoring blend details.
