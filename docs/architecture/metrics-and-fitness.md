# Metrics, Degeneracy, and Fitness

## Trajectory Summaries

Analytics operate on per-simulation summaries that include:

- `stepCount`, `turnCount`, and `uniqueStateCount`
- `keySteps` (samples of steps with `legalActionCount`)
- `actionCounts` (frequency map of action ids)
- `terminalOutcome` and `terminationReason`

## Core Metric Calculations

Implemented in `src/evaluation-analytics/metrics/core.js`:

- Agency = `choiceSteps / totalSteps`, where `choiceSteps` count steps with `legalActionCount > 1`.
- Strategic depth = average legal action count per step.
- Skill expression (proxy) = max(winRate) - min(winRate) across players.
  - This currently measures seat/role imbalance, not agent-skill separation.
- Variety = normalized action entropy across steps.
- Pacing tension = average `stepCount / turnCount`.
- Interaction rate = fraction of steps where the active player changes.

## Extended Metric Calculations

Implemented in `src/evaluation-analytics/metrics/extended.js`:

- Length mean and variance from `stepCount` distribution.
- Early termination rate = fraction of runs with non-"condition" termination or `terminated=false`.
- Balance skew is not tracked separately; the core skill-expression proxy already
  captures per-player win-rate spread.
- Coverage actions = observed action ids / total action count.
- Coverage state = average `uniqueStateCount / stepCount`.

## Degeneracy Detection

Implemented in `src/evaluation-analytics/degeneracy.js` with default thresholds:

- Loop: any run terminates with `terminationReason = "loop-detected"` OR repeated state ratio
  >= 0.25 with at least 1 repeated state.
- Stalemate: any run terminates with `terminationReason = "stalemate"`.
- Non-terminating: any run has `terminationReason = "max-turns"` or `terminated=false`.
- Forced move: ratio of steps with `legalActionCount <= 1` >= 0.8.
- No choices: every sampled step has `legalActionCount <= 1`.
- Dominant action: top action frequency / total actions >= 0.8 with >= 10 samples.
- Trivial win: one player wins >= 0.9 of samples and average steps <= 3.

Degeneracy filters default to rejecting any of:
`loop`, `stalemate`, `forced-move`, `dominant-action`, `trivial-win`, `no-choices`, `non-terminating`.

## Feature Vector Assembly

Implemented in `src/evaluation-analytics/feature-vector.js`:

- Feature vectors are objects keyed by metric id (not positional arrays).
- Metrics are normalized (non-finite values become 0).
- Ordering defaults to:
  `agency`, `strategic_depth`, `skill_expression`, `variety`, `pacing_tension`, `interaction_rate`.
- Degeneracy flags are appended as `degeneracy.<flag>` binary features.
- Any additional metrics are appended in lexicographic order.
- Ordering is for deterministic assembly/serialization only; weight lookups use feature ids.

## Composite Score

Implemented in `src/evaluation-analytics/scoring.js`:

- If weights are provided, score = weighted sum of feature values.
- If objectives are provided, score = average of objective scores.
- If neither, each feature defaults to weight 1.
- Weight normalization defaults to true (`weight / sum(abs(weights))`).

## Preference Score

Implemented in `src/evaluation-analytics/preference-scoring.js`:

- Linear score = `dot(weights, featureVector) + bias`.
- Preference score = `sigmoid(linear)`.
- Confidence = `abs(score - 0.5) * 2`.
- Preference learning is comparison-first (comparisons are the primary training signal).

## Fitness Blend

Implemented in `src/evaluation-analytics/fitness.js` and `scoring.js`:

- Base = composite score.
- Diversity contribution = `diversityPressure * diversityWeight`.
- Preference contribution = centered and capped:
  - `centered = (preferenceScore - 0.5) * 2`
  - `weighted = centered * preferenceWeight`
  - contribution clamped to `[-preferenceCap, preferenceCap]`.
- Bootstrap: if sample count < `preferenceBootstrapSamples`, cap is reduced to
  `preferenceBootstrapCap`.

Final fitness = base + diversity + preference.
