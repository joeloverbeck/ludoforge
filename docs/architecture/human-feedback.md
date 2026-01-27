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

### Comparison Assembly

`assemblePreferenceFeedbackComparison` ties feedback to feature vectors:

- Adds `gameAId`, `gameBId` if ids exist.
- Adds `winnerId` if a non-tie winner exists.
- Copies feature vectors into `featureA` and `featureB`.

## Preference Model State

Implemented in `src/evaluation-analytics/preference-model.js`.

State fields:

- `weights`: feature weights for the linear model.
- `bias`: scalar intercept term.
- `sampleCount`: total preference samples seen.
- `learningRate`, `maxHistory` with defaults 0.05 and 100.
- `history`: most recent feedback samples (clamped to `maxHistory`).

## Model Update Rules

- Comparison feedback:
  - `preference` maps to `{ a: +1, b: -1, tie: 0 }`.
  - `weightDelta = learningRate * preference * (featureA - featureB)`.
  - `biasDelta = learningRate * preference`.

- Rating feedback:
  - Rating is normalized into a target score in `[0, 1]`:
    - `1..5` maps linearly to `0..1` (`1 -> 0`, `3 -> 0.5`, `5 -> 1`).
    - `-1..1` maps to `0..1` (`-1 -> 0`, `0 -> 0.5`, `1 -> 1`).
  - Compute the current prediction via `sigmoid(dot(weights, featureVector) + bias)`.
  - `error = target - prediction`.
  - `weightDelta = learningRate * error * featureVector`.
  - `biasDelta = learningRate * error`.

Every update increments `version` and `sampleCount`.

## Use in Fitness

Preference scores are computed from the model weights and feature vectors and
blended into fitness, subject to degeneracy and safety gating. See
`metrics-and-fitness.md` for the scoring blend details.
