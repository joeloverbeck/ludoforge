# Human Feedback and Preference Modeling

## Feedback Capture

Implemented in `src/human-interface/feedback.js`.

### Rating Flow

- Prompt: "Rate the game (1-5)".
- Input must be an integer in `[1, 5]`.
- Optional tags and rationale are collected after a valid rating.
- Output record:
  - `{ type: "rating", rating, tags?, rationale? }`.

### Pairwise Comparison Flow

- Prompt: "Choose between A or B (A/B/Tie)".
- Input must be `A`, `B`, or `Tie`.
- Optional tags and rationale are collected after a valid choice.
- Output record:
  - `{ type: "comparison", preferred, tags?, rationale? }`.

### Active Learning Pair Selection

Implemented in `src/evaluation-analytics/active-learning.js`.

- Uses the current preference model to rank pairs with predicted preference
  closest to 0.5 (highest uncertainty).
- Optional `uncertaintyThreshold` limits selection to low-confidence pairs.
- `diversityQuota` reserves slots for underrepresented `nicheId` values
  (e.g., rare Map-Elites bins).
- Intended to run on a shortlist of elites before prompting comparisons.

### Comparison Assembly

`assemblePreferenceFeedbackComparison` ties feedback to feature vectors:

- Adds `gameAId`, `gameBId` if ids exist.
- Adds `winnerId` if a non-tie winner exists.
- Copies feature vectors into `featureA` and `featureB`.
- Collapses optional tags/rationale into `notes` (single string) on the comparison payload.

## Preference Model State

Implemented in `src/evaluation-analytics/preference-model.js`.

State fields:

- `weights`: feature weights keyed by feature id (object map, not positional).
- `bias`: scalar intercept term.
- `sampleCount`: total preference samples seen.
- `learningRate`, `maxHistory` with defaults 0.05 and 100.
- `comparisonWeight` (default 1.0) and `ratingWeight` (default 0.25) for weighting
  comparison vs rating updates.
- `weightDecay` (default 0.0), `maxWeightAbs` (default 5.0), `maxBiasAbs` (default 5.0)
  applied for regularization and clamping.
- `history`: most recent feedback samples (clamped to `maxHistory`).

## Model Update Rules

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

- Regularization and clamping:
  - Apply deltas, then decay, then clamp.
  - `weights[key] -= learningRate * weightDecay * weights[key]`.
  - `bias -= learningRate * weightDecay * bias`.
  - Clamp weights to `[-maxWeightAbs, maxWeightAbs]` and bias to `[-maxBiasAbs, maxBiasAbs]`.

Every update increments `version` and `sampleCount`.

Note: weights are stored directly under their feature ids in JSON snapshots (there
is no separate feature-id list). Adding new metrics does not misalign existing
weights, but renaming/removing a metric orphans stored weights under the old id,
so treat metric-id changes as a migration event.

Note: scoring and updates are keyed by feature id (object map). Missing features
default to `0`, and extra feature keys that have no stored weight do not affect
the score unless/ until a weight is learned for them.

Note: comparison updates now use a Bradley–Terry / logistic error, keeping updates
probabilistic while still deterministic for identical inputs.

## Use in Fitness

Preference scores are computed from the model weights and feature vectors and
blended into fitness, subject to degeneracy and safety gating. See
`metrics-and-fitness.md` for the scoring blend details.
