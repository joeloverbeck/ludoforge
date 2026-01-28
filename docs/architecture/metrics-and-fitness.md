# Metrics, Degeneracy, and Fitness

## Trajectory Summaries

Analytics operate on per-simulation summaries that include:

- `stepCount`, `turnCount`, and `uniqueStateCount`
- `keySteps` (samples of steps with `legalActionCount`)
- `actionCounts` (frequency map of action ids)
- `terminalOutcome` and `terminationReason`

## Core Metric Calculations

Implemented in `src/evaluation-analytics/metrics/core.js`:

- These are cheap descriptors and filters. Treat them as proxies, not direct "fun"
  predictors, unless paired with human preference data.
- Agency = `choiceSteps / totalSteps`, where `choiceSteps` count steps with `legalActionCount > 1`.
- Strategic depth = average legal action count per step (branching factor proxy).
- Skill expression (proxy) = max(winRate) - min(winRate) across players.
  - This currently measures seat/role imbalance, not agent-skill separation.
- Variety = normalized action entropy across steps.
- Pacing tension = average `stepCount / turnCount`.
- Interaction rate = fraction of steps where the active player changes (turn-taking proxy).

## Extended Metric Calculations

Implemented in `src/evaluation-analytics/metrics/extended.js`:

- Length mean and variance from `stepCount` distribution.
- Early termination rate = fraction of runs with non-"condition" termination or `terminated=false`.
- Outcome variance (swinginess proxy) = average per-player variance of outcome scores
  across runs (win=1, lose=0, draw=0.5).
- Balance skew is not tracked separately; the core skill-expression proxy already
  captures per-player win-rate spread.
- Coverage actions = observed action ids / total action count.
- Coverage state = average `uniqueStateCount / stepCount`.
- Meaningful choice (`choice_value_spread`) is optional and requires simulations
  (not just summaries). Decision points are derived from post-action trajectory
  states advanced to the next turn phase; for each sampled point, the metric runs
  per-action rollouts with a fixed policy and averages
  `max(actionValues) - min(actionValues)` across samples. Opt-in via
  `meaningfulChoice.enabled` with config defaults:
  `decisionSamplesPerRun=8`, `rolloutsPerAction=8`, `rolloutMaxSteps=64`,
  `maxRolloutsPerRun=128`, `rolloutAgent=random`, `seed=0`. Guardrails cap total
  rollouts per run and skip decisions with <=1 legal action.
- Comeback potential (`comeback_potential`) is optional and requires simulations
  (not just summaries). For each run, it samples an early step, computes per-player
  scores from the termination scoring expression, derives the early leader advantage,
  and computes Pearson correlation with the leader's final outcome value
  (win=1, lose=0, draw=0.5). The metric reports `1 - clamp(correlation, 0, 1)` and
  returns 0 when scoring or correlation data are unavailable. Opt-in via
  `comebackPotential.enabled` with config default `earlyStepPercent=0.25`
  (clamped to `[0, 1]`, step index at least 1).

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
