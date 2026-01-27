# [PREMODBTUPD] PREMODBTUPD-002: Bradley-Terry comparison + centered rating updates
Status: Completed

## Goal
Replace the linear comparison delta with a Bradley-Terry logistic update, map ratings to a centered target in [-1, 1], and apply the regularization + clamping rules defined in the spec.

## File list (expected to touch)
- src/evaluation-analytics/preference-model.js
- test/unit/evaluation-analytics/preference-model.test.mjs
- docs/architecture/human-feedback.md

## Assumptions (verified)
- Current comparison updates are linear (no logistic/Bradley-Terry error).
- Rating updates currently normalize to `[0, 1]` and compare against `sigmoid(dot + bias)`.
- Unit tests currently assert the linear comparison delta and the `[0, 1]` rating target, so they must be updated alongside behavior.
- Config defaults for `comparisonWeight`, `ratingWeight`, `weightDecay`, `maxWeightAbs`, and `maxBiasAbs` already exist in state and should now be applied to updates.

## Scope
- Implement comparison updates using:
  - `diff = featureA - featureB`
  - `score = dot(weights, diff) + bias`
  - `p = sigmoid(score)`
  - `target = 1 | 0 | 0.5`
  - `error = target - p`
  - `weightDelta = learningRate * comparisonWeight * error * diff`
  - `biasDelta = learningRate * comparisonWeight * error`
- Implement rating updates using centered targets:
  - Map `1..5` to `[-1, 1]` and accept `-1..1` as-is.
  - `predictionCentered = (sigmoid(dot(weights, featureVector) + bias) - 0.5) * 2`.
  - `error = targetCentered - predictionCentered`.
  - `weightDelta = learningRate * ratingWeight * error * featureVector`.
  - `biasDelta = learningRate * ratingWeight * error`.
- Apply regularization and clamps per update:
  - `weights[key] -= learningRate * weightDecay * weights[key]`.
  - `bias -= learningRate * weightDecay * bias`.
  - Clamp weights to `[-maxWeightAbs, maxWeightAbs]` and bias to `[-maxBiasAbs, maxBiasAbs]`.
- Update unit tests to assert deterministic deltas for comparisons, ties, and centered rating updates.
- Update architecture documentation to reflect the Bradley-Terry update, centered rating targets, and applied regularization/clamps.

## Out of scope
- No changes to feature vector assembly or scoring API.
- No feedback capture/UI changes.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/preference-model.test.mjs`
- `npm run test:unit`

## Outcome
- Implemented Bradley-Terry comparison updates, centered rating targets, and applied weight decay + clamps per spec.
- Updated unit tests for logistic deltas, tie handling, centered ratings, and decay/clamp behavior.
- Updated `docs/architecture/human-feedback.md` to reflect the new update math and regularization.

### Invariants that must remain true
- Updates remain deterministic for identical inputs.
- Rating feedback still supports both `1..5` and `-1..1` inputs.
- No mutation of the prior model state object.
