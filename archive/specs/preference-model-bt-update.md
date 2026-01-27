# Preference Model: Bradley-Terry Updates + Regularization

## Summary

Upgrade preference learning to use a Bradley-Terry style logistic update for
pairwise comparisons, and apply regularization/clamping to prevent weight blowups.
Ratings remain supported but are de-emphasized and mapped to a centered target.

## Motivation

The current comparison update is linear on `(featureA - featureB)` with a signed
preference. This is simple, but it does not use the model's current prediction,
so it cannot self-correct when confidence is high or low. A logistic update:

- Uses prediction error directly (more stable).
- Keeps comparisons as the primary signal (pairwise-first).
- Provides a clean path to regularization and weight/bias clamping.

## Goals

- Make comparisons the primary learning signal using a Bradley-Terry update.
- Keep ratings supported but with reduced weight by default.
- Add configurable weight decay and clamps to prevent drift.
- Preserve feature-id keyed weights and JSON snapshot format.

## Non-Goals

- Changing how feature vectors are assembled or scored.
- Implementing advanced Bayesian preference models.
- Changing feedback capture UI/flow in this spec.

## Current Behavior (Baseline)

- Comparison update: `weightDelta = learningRate * preference * (featureA - featureB)`.
- Rating update: target in `[0,1]`, error is `target - sigmoid(dot + bias)`.
- No regularization or parameter clamps.

## Proposed Changes

### 1) Pairwise (Comparison) Update

Use a logistic model on the difference in feature vectors:

- `diff = featureA - featureB`
- `score = dot(weights, diff) + bias`
- `p = sigmoid(score)`
- `target = 1` for A, `0` for B, `0.5` for tie
- `error = target - p`
- `weightDelta = learningRate * comparisonWeight * error * diff`
- `biasDelta = learningRate * comparisonWeight * error`

Notes:
- This is the standard Bradley-Terry / logistic update for pairwise outcomes.
- Tie handling uses `target = 0.5`, which nudges toward neutrality.

### 2) Rating Update (Centered Target)

Ratings are mapped to a centered target in `[-1, 1]` and compared against the
model's centered prediction:

- `targetCentered = clamp(ratingTargetCentered(rating), -1, 1)`
- `predictionCentered = (sigmoid(dot(weights, featureVector) + bias) - 0.5) * 2`
- `error = targetCentered - predictionCentered`
- `weightDelta = learningRate * ratingWeight * error * featureVector`
- `biasDelta = learningRate * ratingWeight * error`

Mapping rule:
- `1..5` maps linearly to `[-1, 1]` (`1 -> -1`, `3 -> 0`, `5 -> 1`).
- `-1..1` is accepted as-is.

### 3) Regularization + Clamps

Apply on each update:

- Weight decay: `weights[key] -= learningRate * weightDecay * weights[key]`.
- Bias decay (optional, default same as weight decay).
- Clamp weights and bias after update:
  - `weights[key] = clamp(weights[key], -maxWeightAbs, maxWeightAbs)`
  - `bias = clamp(bias, -maxBiasAbs, maxBiasAbs)`

### 4) Configuration

Add options to `createPreferenceModelState` and `updatePreferenceModelState`:

- `comparisonWeight` (default: `1.0`)
- `ratingWeight` (default: `0.25`)
- `weightDecay` (default: `0.0`)
- `maxWeightAbs` (default: `5.0`)
- `maxBiasAbs` (default: `5.0`)

If a value is non-finite, fall back to defaults.

## Data Model / Persistence

- Keep weights keyed by feature id (object map).
- Store new config fields in preference-model snapshots so state is portable.
- Existing snapshots without new fields use defaults.

## API Changes

- `createPreferenceModelState(options)` accepts new fields above.
- `updatePreferenceModelState(state, feedback, options)` accepts overrides.

No changes to `computePreferenceScore` signature.

## Backward Compatibility

- Existing stored weights remain valid; no migration needed.
- Old ratings still parse and update normally.
- Pairwise behavior changes, but only affects new learning, not stored scores.

## Tests

Add unit tests to `test/unit/evaluation-analytics/preference-model.test.mjs`:

- Comparison update uses logistic error (deterministic expected deltas).
- Tie comparison produces smaller or zero deltas when prediction is neutral.
- Rating update uses centered target (1..5 -> -1..1 mapping).
- Weight decay reduces magnitude after update.
- Clamps are applied to weights and bias.
- Config defaults are used when values are missing or non-finite.

## Documentation Updates

Update `docs/architecture/human-feedback.md`:

- Describe Bradley-Terry comparison update.
- Describe centered rating target and de-emphasized rating weight.
- Document new regularization and clamp options.

## Rollout Plan

- Implement changes behind defaults that are backward-compatible.
- Run `npm run test:unit`.
- Optional: add a short section to `docs/architecture/metrics-and-fitness.md`
  noting that preference learning is comparison-first.
