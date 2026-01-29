# Metrics, Degeneracy, and Fitness

## Trajectory Summaries

Analytics operate on per-simulation summaries that include:

- `stepCount`, `turnCount`, and `uniqueStateCount`
- `keySteps` (samples of steps with `legalActionCount`)
- `actionCounts` (frequency map of action ids)
- `terminalOutcome`, `terminationReason`, and `terminated`

## Config Defaults and Overrides

Default parameters are loaded from config files under `configs/`:

- `configs/metrics-core.json` for feature ordering and normalization policy.
- `configs/metrics-extended.json` for optional metric parameters and enabled flags.
- `configs/degeneracy.json` for thresholds, policy-per-flag, penalty weights, and `minStepsForNoChoices` guard.
- `configs/fitness.json` for weights and preference/diversity blending defaults.

Explicit options passed into metric/fitness helpers override config defaults.

## Core Metric Calculations

Implemented in `src/evaluation-analytics/metrics/core.js`:

- These are cheap descriptors and filters. Treat them as proxies, not direct "fun"
  predictors, unless paired with human preference data.
- Agency = `choiceSteps / totalSteps`, where `choiceSteps` count steps with `legalActionCount > 1`.
- Strategic depth = average legal action count per step (branching factor proxy).
- Seat/role imbalance (win-rate spread) = max(winRate) - min(winRate) across players.
- Variety = normalized action entropy across steps.
- Pacing tension = average `stepCount / turnCount`.
- Turn-taking rate = fraction of steps where the active player changes.
- Interaction rate = fraction of action steps that affect at least one non-active player
  (uses `affectedPlayerIds`; pass steps with `actionId = null` are excluded).

Core metric ordering defaults to `configs/metrics-core.json`:

- `featureOrder`: canonical order for the core metrics.
- `normalization.nonFinite`: non-finite value policy (currently `zero`).

## Extended Metric Calculations

Implemented in `src/evaluation-analytics/metrics/extended.js`:

- Length mean and variance from `stepCount` distribution.
- Early termination rate = fraction of runs with non-"condition" termination or `terminated=false`.
- Outcome variance (swinginess proxy) = average per-player variance of outcome scores
  across runs (win=1, lose=0, draw=0.5).
- Balance skew is not tracked separately; the core seat-imbalance metric already
  captures per-player win-rate spread.
- Coverage actions = observed action ids / total action count.
- Coverage state = average `uniqueStateCount / stepCount`.
- Meaningful choice (`choice_value_spread`) is optional and requires simulations
  (not just summaries). Decision points are derived from post-action trajectory
  states advanced to the next turn phase; for each sampled point, the metric runs
  per-action rollouts with a fixed policy and averages
  `max(actionValues) - min(actionValues)` across samples. Opt-in via
  `meaningfulChoice.enabled` with config defaults in `configs/metrics-extended.json`:
  `meaningfulChoice.decisionSamplesPerRun`, `meaningfulChoice.rolloutsPerAction`,
  `meaningfulChoice.rolloutMaxSteps`, `meaningfulChoice.maxRolloutsPerRun`,
  `meaningfulChoice.rolloutAgent`, `meaningfulChoice.seed`. Guardrails cap total
  rollouts per run and skip decisions with <=1 legal action.
- Comeback potential (`comeback_potential`) is optional and requires simulations
  (not just summaries). For each run, it samples an early step, computes per-player
  scores from the termination scoring expression, derives the early leader advantage,
  and computes Pearson correlation with the leader's final outcome value
  (win=1, lose=0, draw=0.5). The metric reports `1 - clamp(correlation, 0, 1)` and
  returns 0 when scoring or correlation data are unavailable. Opt-in via
  `comebackPotential.enabled` with config default `comebackPotential.earlyStepPercent`
  (clamped to `[0, 1]`, step index at least 1).
- Skill expression (`skill_expression`) is optional and runs extra simulations.
  It measures average win-rate advantage of stronger tiers over a baseline while
  canceling seat bias by swapping the strong agent into each seat. For each tier
  above baseline and each seat, it runs `matchesPerSeat` with the strong agent in
  the seat and `matchesPerSeat` with the baseline in that seat, then averages the
  per-seat win-rate deltas across all tiers/seats. The metric clamps the average
  advantage to `[0, 1]` and returns 0 when disabled or when fewer than two tiers
  resolve. Opt-in via `skillExpression.enabled` with config defaults
  in `configs/metrics-extended.json`: `skillExpression.matchesPerSeat`,
  `skillExpression.agentTiers`, `skillExpression.seed`, and optional passthrough
  `skillExpression.maxTurns`/`skillExpression.maxSteps`. Built-in tiers support
  `random` and `greedy` agents, or explicit agent objects.

## Degeneracy Detection

Implemented in `src/evaluation-analytics/degeneracy.js` with defaults from
`configs/degeneracy.json`:

- Loop: any run terminates with `terminationReason = "loop-detected"` OR repeated state ratio
  >= 0.25 with at least 1 repeated state.
- Stalemate: any run terminates with `terminationReason` in
  `["stalemate", "no-legal-actions"]` AND the terminal outcome is a draw for all players.
- Non-terminating: any run has `terminationReason = "max-turns"` or `terminated=false`.
- Forced move: ratio of full trajectory steps with `legalActionCount <= 1` >= 0.8.
- No choices: every full trajectory step has `legalActionCount <= 1`, subject to the
  `minStepsForNoChoices` guard (games with fewer total steps than the guard are never
  flagged as no-choices).
- Dominant action: top action frequency / total actions >= 0.8 with >= 10 samples.
- Trivial win: one player wins >= 0.9 of samples and average steps <= 3.

Note: `forcedMove` and `noChoices` are preference/policy knobs, not genre-truth.
Some game designs legitimately have constrained action spaces.

Degeneracy flags and filters are configured by:

- `thresholds.loop.repeatedStateRatio`, `thresholds.loop.minRepeatedStates`
- `thresholds.forcedMove.ratio`
- `thresholds.dominantAction.ratio`, `thresholds.dominantAction.minSamples`
- `thresholds.trivialWin.winRate`, `thresholds.trivialWin.maxAvgSteps`,
  `thresholds.trivialWin.minSamples`
- `enabledFlags`: which degeneracy flags are active
- `policyByFlag`: per-flag policy with three semantics:
  - `"reject"` — genome is filtered out entirely (hard gate)
  - `"penalize"` — genome receives a fitness penalty (soft pressure)
  - `"ignore"` — flag is detected but has no effect on fitness or filtering
- `penalties`: per-flag penalty configuration (`weight` and optional `freeRatio`)
- `minStepsForNoChoices`: minimum total trajectory steps required before the no-choices
  flag can fire (guards against false positives on very short games)

Default policies: `loop` and `non-terminating` → reject; all others → penalize.

## Feature Vector Assembly

Implemented in `src/evaluation-analytics/feature-vector.js`:

- Feature vectors are objects keyed by metric id (not positional arrays).
- Metrics are normalized (non-finite values become 0).
- Ordering defaults to `configs/metrics-core.json` `featureOrder`:
  `agency`, `strategic_depth`, `seat_imbalance`, `variety`, `pacing_tension`,
  `turn_taking_rate`, `interaction_rate`.
- Degeneracy flags are appended as `degeneracy.<flag>` binary features.
- Any additional metrics are appended in lexicographic order.
- Ordering is for deterministic assembly/serialization only; weight lookups use feature ids.

## Composite Score

Implemented in `src/evaluation-analytics/scoring.js`:

- If weights are provided, score = weighted sum of feature values.
- If objectives are provided, score = average of objective scores.
- If neither, each feature defaults to weight 1.
- Fitness scoring uses `configs/fitness.json` `weights` as the default input to
  composite scoring when no explicit weights are supplied.
- Weight normalization defaults to `configs/fitness.json` `weightNormalization`
  (`weight / sum(abs(weights))`).

## Preference Score

Implemented in `src/evaluation-analytics/preference-scoring.js`:

- Linear score = `dot(weights, featureVector) + bias`.
- Preference score = `sigmoid(linear)`.
- Confidence = `abs(score - 0.5) * 2`.
- Preference learning is comparison-first (comparisons are the primary training signal).

## Fitness Blend

Implemented in `src/evaluation-analytics/fitness.js` and `scoring.js`:

- Base = composite score.
- Diversity contribution uses defaults from `configs/fitness.json`:
  `diversityPressure * diversityWeight`.
- Preference contribution uses defaults from `configs/fitness.json`, centered and capped:
  - `centered = (preferenceScore - 0.5) * 2`
  - `weighted = centered * preferenceWeight`
  - contribution clamped to `[-preferenceCap, preferenceCap]`.
- Bootstrap: if sample count < `preferenceBootstrapSamples`, cap is reduced to
  `preferenceBootstrapCap`.

Final fitness = base + diversity + preference - degeneracyPenalty.

The degeneracy penalty is computed by summing per-flag penalties for all raised flags
whose policy is `"penalize"`. Each flag's penalty entry specifies a `weight` and an
optional `freeRatio` (portion of the flag's severity that is forgiven). Flags with
policy `"reject"` or `"ignore"` do not contribute to the penalty.
