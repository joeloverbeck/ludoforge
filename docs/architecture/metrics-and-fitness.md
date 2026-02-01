# Metrics, Degeneracy, and Fitness

## Trajectory Summaries

Analytics operate on per-simulation summaries that include:

- `stepCount`, `turnCount`, and `uniqueStateCount`
- `keySteps` (samples of steps with `legalActionCount`)
- `actionCounts` (frequency map of action ids)
- `terminalOutcome`, `terminationReason`, and `terminated`
- `totalSkippedEffects`, `totalAppliedEffects` (accumulated from trajectory
  step `skippedEffects` and `appliedEffects` arrays; used for skip-rate
  degeneracy detection)
- `totalSkippedTriggers`, `totalAttemptedTriggers` (accumulated from
  step-level `triggerSkipCount` and `triggerAttemptCount`)
- `totalCostAborts` (count of steps where `costAborted === true`)
- `totalPassSteps` (steps where `actionId` is null),
  `totalActionSteps` (steps where `actionId` is non-null)

## Config Defaults and Overrides

Default parameters are loaded from config files under `configs/`:

- `configs/metrics-core.json` for feature ordering and normalization policy.
- `configs/metrics-extended.json` for optional metric parameters and enabled flags.
- `configs/degeneracy.json` for thresholds, policy-per-flag, penalty weights, and `minStepsForNoChoices` guard.
- `configs/fitness.json` for weights and preference blending defaults.

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
- Interaction rate = fraction of action steps that are interactive
  (pass steps with `actionId = null` are excluded). A step is interactive if
  `affectedPlayerIds` contains any player other than the active player **or**
  `affectedGlobal` is `true`. This captures direct opponent impact, shared/global
  state changes, and reveal/hide effects on shared zones. Reveal and hide token
  effects now record impact via `recordTokenImpact`, matching the pattern used by
  spawn, move, and destroy. Variable effects support a `player` field on the
  target ref (a binding name, `"self"`, or `"opponent"`) to direct writes and
  impact recording to a specific player rather than the active player.
- Skipped trigger rate = `totalSkippedTriggers / max(1, totalAttemptedTriggers)`
  aggregated across all summaries. Quantifies how often triggers fail silently.
- Cost abort rate = `totalCostAborts / max(1, totalActionSteps)` aggregated
  across all summaries. Detects games where actions frequently fail due to
  unaffordable costs.
- Pass step rate = `totalPassSteps / max(1, stepCount)` aggregated across all
  summaries. High values indicate games where players lack meaningful actions.
- No-legal-actions termination rate = fraction of runs where
  `terminationReason === "no-legal-actions"`. Detects games that frequently
  dead-end into states with no available moves.

Core metric ordering defaults to `configs/metrics-core.json`:

- `featureOrder`: canonical order for the core metrics.
- `normalization.nonFinite`: non-finite value normalization (currently `zero` — replaces non-finite values with 0 in the feature vector).
- `normalization.nonFinitePolicy`: what to do about genomes with non-finite metrics — `"penalize"` (reduce fitness by a multiplier) or `"reject"` (return null fitness). Default: `"penalize"`.
- `normalization.nonFinitePenalty`: penalty parameters when policy is `"penalize"` — `perKeyPenalty` (default 0.05) and `maxPenalty` (default 0.50). The multiplier is `max(0, 1 - min(maxPenalty, count * perKeyPenalty))`.
- `computeNonFinitePenaltyMultiplier()` in `feature-vector.js` computes the penalty multiplier as a pure function. The evaluator (downstream) applies it.

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
- Advantage reversal rate (`advantage_reversal_rate`) is optional and requires
  simulations (not just summaries). For each run, it evaluates the scoring
  expression at each step to determine the current leader, then counts how often
  the leader changes between consecutive steps. The metric reports the average
  leader-change rate across runs, normalized to `[0, 1]`. Returns 0 when
  disabled, when no simulations are available, or when runs have fewer than 2
  valid scored steps. Opt-in via `advantageReversal.enabled`. Can optionally
  specify `advantageReversal.suiteId` to use results from a specific agent suite
  instead of the default simulations.
  Implemented in `src/evaluation-analytics/metrics/extended/decision-quality/advantage-reversal.js`.
- Policy sensitivity (`policy_sensitivity`) is optional and runs extra
  simulations. It measures the marginal win-rate delta across adjacent agent
  tiers in a ladder, with seat-bias cancellation (same technique as
  `skill_expression`). For each consecutive tier pair and each seat, it runs
  matches with the stronger tier in the focal seat and matches with the weaker
  tier in the focal seat, then averages the per-seat win-rate deltas across all
  tier pairs and seats. The metric clamps the average to `[0, 1]` and returns 0
  when disabled or when fewer than two tiers resolve. Opt-in via
  `policySensitivity.enabled` with config defaults in
  `configs/metrics-extended.json`: `policySensitivity.matchesPerSeat`,
  `policySensitivity.agentTiers`, `policySensitivity.seed`, and optional
  `policySensitivity.maxTurns`/`policySensitivity.maxSteps`. Can reuse
  pre-computed suite results when `suiteResults` are provided via the evaluator.
  Implemented in `src/evaluation-analytics/metrics/extended/policy-sensitivity.js`.

## Agent Suites

Implemented in `src/evaluation-analytics/agent-suite.js`.

An `AgentSuite` defines a fixed agent lineup for simulation batches:

```
{
  id: string,               // unique suite identifier
  agents: AgentDescriptor[], // ordered agent descriptors (e.g. { kind: "random" })
  seedPolicy: "derive" | "fixed",
  seed?: number,             // required when seedPolicy is "fixed"
  notes?: string
}
```

- `validateAgentSuites(suites)` validates an array of suites, checking for
  required fields, duplicate IDs, non-empty agent arrays, and seed consistency.
  Returns `{ valid: boolean, errors: string[] }`.
- `loadDefaultAgentSuites()` loads suites from `configs/agent-suites.json`
  (validated by `schemas/config/agent-suites.schema.json`).

Default suites (`configs/agent-suites.json`):
- `random-only`: two random agents (baseline).
- `random-greedy`: one random, one greedy (mixed-strength).

## Suite Runner

Implemented in `src/evaluation-analytics/suite-runner.js`.

`runSuites({ definition, suites, runsPerSuite, baseSeed, simulationConfig, cache })`
executes simulation batches for each agent suite:

1. For each suite, run `runsPerSuite[suite.id]` simulations.
2. Per run, derive a seed via `deriveSeed(baseSeed, suite.id, runIndex)` (or use
   the fixed seed when `seedPolicy === "fixed"`).
3. Use the run cache (`cache.getOrRun(key, runFn)`) to avoid re-running identical
   simulations. Cache keys are `"${suite.id}:${seed}"`.
4. Adapt the combined results via `adaptSimulationLog()`.
5. Return `suiteResults` keyed by suite ID, each containing `{ results,
   trajectorySummaries, agents }` (or `{ error }` on failure).

Suite results are passed to `computeExtendedMetrics()` as the fourth argument,
enabling portfolio metrics (`advantage_reversal_rate`, `policy_sensitivity`) to
reuse pre-computed simulations instead of running their own.

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
- High skipped effects: skipped effect rate (`totalSkippedEffects /
  (totalSkippedEffects + totalAppliedEffects)`) >= 0.10 with at least 50 total
  effect attempts across all summaries. Indicates genomes with many structurally
  invalid or bounds-violating effects.
- Any cost abort: any run accumulates `totalCostAborts >= minCount` (default 1).
  Detects games where actions fail due to unaffordable costs. Policy: reject.
- High skipped triggers: `totalSkippedTriggers / totalAttemptedTriggers >= rate`
  (default 0.10) with at least `minAttempts` (default 20) total trigger attempts.
  Detects games where triggers frequently fail silently.
- High pass rate: `totalPassSteps / totalSteps >= rate` (default 0.30) with at
  least `minSteps` (default 20) total steps. Detects games where players lack
  meaningful actions and pass most turns.
- High no-legal-actions termination: fraction of runs where
  `terminationReason === "no-legal-actions"` >= `rate` (default 0.25) with at
  least `minRuns` (default 10) summaries. Detects games that frequently dead-end.
- Non-finite metrics: fires when `nonFiniteKeys.length >= minKeys` (default 1).
  Unlike other flags, this is not derived from trajectory statistics — it comes
  from the metric computation step. The evaluator pre-computes non-finite keys
  from `allMetrics` and passes them to `detectDegeneracy()` via `options.nonFiniteKeys`.
  This bridges the non-finite policy (VALSEEISS-07/08) with degeneracy detection,
  allowing non-finite metrics to participate in compound rejection.

Note: `forcedMove` and `noChoices` are preference/policy knobs, not genre-truth.
Some game designs legitimately have constrained action spaces.

Degeneracy flags and filters are configured by:

- `thresholds.loop.repeatedStateRatio`, `thresholds.loop.minRepeatedStates`
- `thresholds.forcedMove.ratio`
- `thresholds.dominantAction.ratio`, `thresholds.dominantAction.minSamples`
- `thresholds.trivialWin.winRate`, `thresholds.trivialWin.maxAvgSteps`,
  `thresholds.trivialWin.minSamples`
- `thresholds.highSkippedEffects.rate`, `thresholds.highSkippedEffects.minAttempts`
- `thresholds.anyCostAbort.minCount`
- `thresholds.highSkippedTriggers.rate`, `thresholds.highSkippedTriggers.minAttempts`
- `thresholds.highPassRate.rate`, `thresholds.highPassRate.minSteps`
- `thresholds.highNoLegalActionsTermination.rate`,
  `thresholds.highNoLegalActionsTermination.minRuns`
- `thresholds.nonFiniteMetrics.minKeys`
- `enabledFlags`: which degeneracy flags are active
- `policyByFlag`: per-flag policy with three semantics:
  - `"reject"` — genome is filtered out entirely (hard gate)
  - `"penalize"` — genome receives a fitness penalty (soft pressure)
  - `"ignore"` — flag is detected but has no effect on fitness or filtering
- `penalties`: per-flag penalty configuration (`weight` and optional `freeRatio`)
- `minStepsForNoChoices`: minimum total trajectory steps required before the no-choices
  flag can fire (guards against false positives on very short games)

Default policies: `loop`, `non-terminating`, `no-choices`, and `any-cost-abort` →
reject; all others (including `high-skipped-effects`, `high-skipped-triggers`,
`high-pass-rate`, `high-no-legal-actions-termination`, `non-finite-metrics`) →
penalize.

### Compound Rejection

When `compoundRejection.enabled` is `true` (default), genomes with more than
`maxPenaltyFlags` (default `3`) penalize-policy flags are rejected outright,
even though no single flag would trigger rejection. This prevents heavily
degenerate genomes from surviving through penalty stacking alone.

Implemented in `src/evaluation-analytics/degeneracy-penalty.js`
(`applyDegeneracyFilters`). Config lives in `configs/degeneracy.json` under
`compoundRejection: { enabled, maxPenaltyFlags }`.

## Feature Vector Assembly

Implemented in `src/evaluation-analytics/feature-vector.js`:

- `assembleFeatureVector(metrics, degeneracy, options?)` returns
  `{ vector, nonFiniteKeys }`.
- `vector` is an object keyed by metric id (not a positional array).
- `nonFiniteKeys` is a `string[]` listing metric ids whose raw values were
  non-finite (`NaN`, `Infinity`, `-Infinity`, `null`, or `undefined`).
  The feature vector normalizes these to 0 for fitness stability, but
  `nonFiniteKeys` allows downstream consumers (e.g. descriptor extraction)
  to distinguish "unknown" from a real 0.
- Ordering defaults to `configs/metrics-core.json` `featureOrder`:
  `agency`, `strategic_depth`, `seat_imbalance`, `variety`, `pacing_tension`,
  `turn_taking_rate`, `interaction_rate`, `structural_complexity`,
  `advantage_reversal_rate`, `policy_sensitivity`, `skipped_effect_rate`,
  `skipped_trigger_rate`, `cost_abort_rate`, `pass_step_rate`,
  `no_legal_actions_termination_rate`, `unused_element_ratio`,
  `semantic_warning_count`, `semantic_info_count`.
- Degeneracy flags are appended as `degeneracy.<flag>` binary features.
- Any additional metrics are appended in lexicographic order.
- Ordering is for deterministic assembly/serialization only; weight lookups use feature ids.
- Default fitness weights (`configs/fitness.json`) assign zero weight to all
  `degeneracy.*` features. Degeneracy pressure is applied entirely through the
  multiplicative penalty (see § Fitness Blend), not through the weighted sum.

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

The preference model is an ensemble of K independent models. Scoring
aggregates per-model predictions:

- For each model: `p_i = sigmoid(dot(w_i, featureVector) + b_i)`.
- `pMean = mean(p_i)` — ensemble mean prediction.
- `pVar = variance(p_i)` — model disagreement.
- `uncertainty = clamp01(2 * sqrt(pVar))` — scaled disagreement.
- `bald = H(pMean) - mean(H(p_i))` — information gain proxy
  (BALD: Bayesian Active Learning by Disagreement).
- `confidence = 1 - uncertainty`.
- `score = pMean`.

When the ensemble is empty, returns `score = 0.5`, `uncertainty = 1`.
The preference model state must contain a `models` array; states without
one are treated as having an empty ensemble.

Preference learning is comparison-first (comparisons are the primary training signal).

## Fitness Blend

Implemented in `src/evaluation-analytics/fitness.js` and `scoring.js`:

- Base = composite score.
- Preference contribution uses defaults from `configs/fitness.json`, centered,
  uncertainty-damped, and capped:
  - `centered = (pMean - 0.5) * 2`
  - `weighted = centered * preferenceWeight * (1 - uncertainty)`
  - contribution clamped to `[-preferenceCap, preferenceCap]`.
  - The `(1 - uncertainty)` factor prevents the ensemble mean from dominating
    fitness when models disagree. High uncertainty → near-zero contribution.
- Bootstrap: if sample count < `preferenceBootstrapSamples`, cap is reduced to
  `preferenceBootstrapCap`.

Final fitness = `(base + preference) * (1 - clamp(penalty, 0, 1))`.

Diversity is **not** part of the fitness blend. It is maintained by:
- MAP-Elites niche placement (per-niche elite retention),
- shortlist L1-distance diversification (with optional novelty-score tie-break
  via `useNovelty`, using mean k-NN L1 distance in coordinate space),
- the `structural_complexity` descriptor axis,
- active-learning `diversityQuota`.

The degeneracy penalty is computed by summing per-flag penalties for all raised flags
whose policy is `"penalize"`. Each flag's penalty entry specifies a `weight` and an
optional `freeRatio` (portion of the flag's severity that is forgiven). Flags with
policy `"reject"` or `"ignore"` do not contribute to the penalty. The penalty sum is
clamped to `[0, 1]` and applied as a multiplicative factor `(1 - penalty)`, so a
penalty of 1.0 zeroes fitness entirely. This multiplicative formulation (implemented
in `scoring.js` as `combined * penaltyMultiplier`) prevents degenerate genomes from
compensating for penalties through high base scores.

## Built-in Evaluator

Implemented in `src/evaluation-analytics/create-evaluator.js`.

`createEvaluator(options?)` returns `{ evaluator }` where `evaluator` is a
synchronous function `(genome) => EvaluationResult` that wires the complete
evaluation pipeline. The CLI creates one instance before the evolution loop and
passes it to the runner as `options.evaluation`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulationConfig` | `object` | `{}` | Overrides for simulation (maxTurns, maxSteps, seed, loopDetection). Merged with defaults via `resolveSimulationDefaults()` |
| `simulationRuns` | `number` | `5` | Number of simulations per genome |
| `agentFactory` | `(definition) => Agent[]` | creates N random agents from `definition.players.count` | Agent factory |
| `fitnessOptions` | `object` | `{}` | Overrides for `computePreferenceAwareFitness` |
| `degeneracyThresholds` | `object` | `{}` | Overrides for `detectDegeneracy` |
| `preferenceModelState` | `object\|null` | `null` | Preference model state for fitness blending |
| `descriptorKeys` | `string[]` | `["agency", "variety"]` | Feature vector keys to extract as MAP-Elites descriptors. The CLI passes the descriptor IDs from the runner config so the evaluator produces exactly the descriptors the MAP-Elites grid expects. |
| `includeExtendedMetrics` | `boolean` | `false` | Whether to compute extended metrics |
| `extendedMetricsOptions` | `object` | `{}` | Options for `computeExtendedMetrics` |
| `seed` | `number\|null` | `null` | Base RNG seed (each run offsets by index) |
| `agentSuites` | `AgentSuite[]` | `[]` | Agent suites for portfolio metric simulations |
| `agentSuiteRuns` | `Record<string, number>` | `{}` | Map of suite ID → number of runs per suite |
| `portfolioMetrics` | `{ enabled?: boolean }` | `{}` | When `enabled: true`, triggers agent-suite simulations via `runSuites()` with run caching |
| `nonFinitePolicy` | `string` | from `metrics-core.json` (`"penalize"`) | Per-evaluator override for non-finite metric policy: `"reject"` or `"penalize"` |
| `nonFinitePenalty` | `{ perKeyPenalty?: number, maxPenalty?: number }` | from `metrics-core.json` | Per-evaluator override for penalty parameters |

### Pipeline Steps

1. **Create agents** — `agentFactory(definition)` or default random-policy agents.
2. **Resolve simulation defaults** — `resolveSimulationDefaults()` merges config defaults.
3. **Create simulation engine** — `createSimulationEngine(resolvedConfig)`.
4. **Run N simulations** — `engine.runBatch(simulationRuns)`.
4b. **Optionally run agent-suite simulations** — when `portfolioMetrics.enabled` is `true` and `agentSuites` is non-empty, create a `RunCache` via `createRunCache()` and call `runSuites()` to execute simulation batches per suite. The suite results are passed to `computeExtendedMetrics()` so portfolio metrics (`advantage_reversal_rate`, `policy_sensitivity`) can reuse them.
5. **Adapt results** — `adaptSimulationLog()` with `LOG_ADAPTER_VERSION`. If `ok: false`, return early with `{ fitness: null, descriptors: null, diagnostics: { error, logAdapterOk: false } }`.
6. **Compute core metrics** — `computeCoreMetrics(trajectorySummaries)`.
7. **Optionally compute extended metrics** — if `includeExtendedMetrics`, call `computeExtendedMetrics(definition, trajectorySummaries, { ...extendedMetricsOptions, simulations: results }, suiteResults)`.
8. **Concatenate metrics** — `[...coreMetrics, ...extendedMetrics]`.
9. **Detect degeneracy** — `detectDegeneracy(trajectorySummaries, degeneracyThresholds)`.
10. **Assemble feature vector** — `assembleFeatureVector(allMetrics, degeneracyReport)` returns `{ vector, nonFiniteKeys }`.
10b. **Inject structural complexity** — computes `structural_complexity = tokenTypeCount + zoneCount + triggerCount + distinctEffectKinds` from the game definition and injects it into the feature vector. This provides a structural diversity axis for MAP-Elites that is independent of behavioral simulation metrics.
10d. **Compute unused element ratio** — uses `collectUsedIds(definition)` from `src/dsl/semantic/used-id-collector.js` to walk all actions, triggers, termination conditions, and scoring expressions, collecting referenced zone, token type, and variable IDs. The ratio is `unusedCount / totalCount` across all three element types. Injected into the feature vector as `unused_element_ratio` (weight 0 in `configs/fitness.json` — monitoring only).
10e. **Inject semantic warning/info counts** — reads `semanticWarningCount` and `semanticInfoCount` from the evaluator context (passed by the evaluation adapter after post-repair validation) and injects them into the feature vector as `semantic_warning_count` (weight `-0.15` in `configs/fitness.json`) and `semantic_info_count` (weight `0`). This applies evolutionary pressure against genomes carrying unrepaired semantic warnings. Defaults to 0 when the context is absent.
10c. **Non-finite metric policy enforcement (reject)** — if `nonFiniteKeys` is non-empty and `nonFinitePolicy` is `"reject"`, return early with `{ fitness: null, descriptors: null }` and diagnostics including `nonFiniteMetrics` and `nonFinitePolicy: "reject"`.
11. **Compute fitness** — `computePreferenceAwareFitness(vector, { ...fitnessOptions, preferenceModelState, degeneracyReport })`.
11b. **Non-finite metric policy enforcement (penalize)** — if `nonFinitePolicy` is `"penalize"` and `nonFiniteKeys` is non-empty, multiply the fitness score by `computeNonFinitePenaltyMultiplier(count, perKeyPenalty, maxPenalty)`. Diagnostics include `nonFiniteMetrics` and `nonFinitePenaltyMultiplier` when applicable.
12. **Extract descriptors** — for each `descriptorKey`, if the key is in `nonFiniteKeys` the descriptor value is `null` (maps to `"unknown"` bin token); otherwise use the numeric value from `vector`.
13. **Return** — `{ fitness: finalFitness, descriptors, diagnostics }`.

### Return Value

```
{
  fitness: number,         // finalFitness (after non-finite penalty if applicable)
  descriptors: object,     // subset of feature vector keyed by descriptorKeys
  diagnostics: {
    coreMetrics: MetricResult[],
    extendedMetrics: MetricResult[] | null,
    degeneracy: DegeneracyReport,
    featureVector: FeatureVector,
    fitnessResult: PreferenceFitnessResult,
    simulationCount: number,
    logAdapterOk: boolean,
    nonFiniteMetrics?: string[],          // present when nonFiniteKeys is non-empty
    nonFinitePenaltyMultiplier?: number,  // present when penalize policy applied
    nonFinitePolicy?: string,             // present when reject policy triggered
  }
}
```

### Error Handling

- If `adaptSimulationLog` fails (`ok: false`), return `{ fitness: null, descriptors: null, diagnostics: { error, logAdapterOk: false } }`.
- If `engine.runBatch()` throws (e.g., bounds violations from dec-at-zero actions), the evaluator catches the error and returns `{ fitness: null, descriptors: null, diagnostics: { simulationError: true, error: message } }`. Callers (e.g., `generateSeedPopulation`) treat null-fitness results as evaluation errors.
- All metric/fitness functions handle edge cases (empty summaries, zero-step games) gracefully.

### Non-Finite Metric Policy

The evaluator enforces a configurable policy for genomes with non-finite metric
values (step 10c and 11b):

- **`"reject"`** (step 10c): if any metric is non-finite, return
  `{ fitness: null, descriptors: null }` with `diagnostics.nonFiniteMetrics` and
  `diagnostics.nonFinitePolicy: "reject"`. This prevents the genome from entering
  the MAP-Elites grid entirely.
- **`"penalize"`** (step 11b, default): multiply the fitness score by
  `computeNonFinitePenaltyMultiplier(count, perKeyPenalty, maxPenalty)`. Fitness
  strictly decreases as the number of non-finite keys increases. Diagnostics
  include `nonFiniteMetrics` and `nonFinitePenaltyMultiplier`.

The policy defaults to `configs/metrics-core.json` `normalization.nonFinitePolicy`
but can be overridden per-evaluator via the `nonFinitePolicy` and `nonFinitePenalty`
options.

### Non-Finite Fitness Guard

The built-in evaluator (Step 11) also checks the fitness value returned by
`computePreferenceAwareFitness()` and the final fitness after penalty application.
If either is non-finite (`NaN`, `Infinity`, or `-Infinity`), the evaluator returns
`{ fitness: null, descriptors: null }` with a diagnostic `{ nonFiniteFitness: true }`.
This prevents corrupt fitness values from entering the MAP-Elites grid.

## LTS Builder and Motif Mining

### Labelled Transition System

Implemented in `src/evaluation-analytics/lts-builder.js`.

`buildLts(trajectories)` constructs a Labelled Transition System from arrays of
trajectory steps (each element is a `TrajectoryStep[]` from a simulation result):

- **Nodes**: unique `stateHash` values, sorted lexicographically.
- **Edges**: `{ from, to, label }` where `label` is a canonical string derived from
  `appliedEffects` via `canonicalLabel()`. Pass steps (empty effects) produce self-loop
  edges labelled `"pass"`. Edges are deduplicated and sorted.
- `canonicalLabel(appliedEffects)` normalizes each effect into
  `kind:scope:id:source[:amt=N][:val=V]`, sorts the fragments, and joins with `;`.
  Empty effects yield `"pass"`. The canonical label captures the core identity of each
  effect (kind + target + source + numeric/value payload). Additional kind-specific
  fields (`toZone`, `tokenId`, `zone`, `toNode`, `flag`, `duration`, `count`) are not
  included in the label — motif patterns are therefore grouped by effect kind and
  target, not by destination or flag name.

### Motif Miner

Implemented in `src/evaluation-analytics/motif-miner.js`.

`await mineMotifs(lts, config, { signal })` discovers recurring edge-label n-gram
patterns from an LTS. The function is async to yield to the event loop during
heavy graph traversal.

- **Input**: `{ nodes, edges }` from `buildLts`, plus config
  `{ ngramSizes, minSupport, maxMotifLength }`, plus optional
  `{ signal }` (`AbortSignal`) for external cancellation.
- **Process**: for each n-gram size, enumerates all contiguous paths of that length
  in the LTS graph via DFS. Patterns with fewer than `minSupport` occurrences are
  discarded. The DFS is bounded by `maxPaths` (50,000 completed paths) and
  `maxStackSize` (100,000 stack entries) to prevent runaway expansion on dense or
  cyclic graphs. Every 5,000 iterations the function yields via `setImmediate` so
  the Node.js event loop remains responsive (enabling timeout-based cancellation).
- **Output**: array of `{ signature, ngramSize, support, exampleOccurrences }` sorted
  by descending support then lexicographic signature. Each `exampleOccurrence` contains
  `{ fromNode, path }`.

### Motif Effect Converter

Implemented in `src/evaluation-analytics/motif-effect-converter.js`.

Three functions convert mined motifs into DSL-compatible effect sequences:

- `buildEffectMap(trajectories)`: creates a `Map<canonicalLabel, AppliedEffect[]>`
  from trajectory step arrays. For each step with non-empty `appliedEffects`, computes
  the canonical label and stores the first-seen effects for that label.
- `toDslEffect(appliedEffect)`: strips runtime fields (`source`, `scope` from target,
  `clamped`, `tokenId`) and keeps only DSL-compatible fields: `kind`, `target` (with
  `kind` and `id` only), `amount`, `value`, `toZone`, `tokenType`, `count`,
  `condition`, `then`, `else`.
- `convertMotifsToEffects(motifs, effectMap)`: for each motif, looks up path labels
  in the effect map, converts each matched effect via `toDslEffect`, and returns an
  array of effect sequences. Motifs with any unresolvable label are skipped.

### Motif Persistence

Implemented in `src/data-persistence/motif-store.js`.

Motif records are persisted as JSONL using the envelope pattern:

- `writeMotifJsonl(filePath, records)`: wraps each record in
  `{ type: "motif", payload }` and writes JSONL.
- `readMotifJsonl(filePath)`: parses JSONL, validates envelopes, and returns payload
  arrays.
- Each record requires metadata (`id`, `version`, `createdAt`) and domain fields
  (`signature`, `support`).
