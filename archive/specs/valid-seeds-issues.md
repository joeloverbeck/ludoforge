# Valid Seeds Issues

We've fed our architectural docs to ChatGPT so that it could find bugs or things to improve. It said:

"Seeding can reject “valid” seeds for a reason that isn’t about validity

You reject seeds that land exclusively in special bins "unknown", "under", "over" to “ensure coverage targets are met.” 

pipeline-overview

This is a dangerous coupling: you’re using descriptor range behavior as a gate on validity. If a descriptor is noisy, sparsely defined, or often undefined early (common when features are missing or non-finite), you’ll bias the initial population away from exactly the weird edge-cases where novel mechanics often appear.

At minimum, this should be optional (or softened into “downweight” rather than reject).

Stop letting the search exploit “undefined metrics” and “skipped effects”

Your simulation engine explicitly skips failing non-cost effects rather than throwing, and records skipped effects/triggers. That’s the right robustness choice.

But evolution will absolutely learn to produce genomes that:

technically validate,

limp through simulation,

and “look good” on any metric pipeline that treats undefined/degenerate values as neutral.

So: treat these as first-class degeneracy signals (not just diagnostics). You already have a degeneracy system—lean into it:

Add hard/soft penalties based on:

skipped effect rate

skipped trigger rate

cost-abort frequency

“no-legal-actions” frequency (distinct from stalemate vs pass loops)

If a metric is non-finite/unavailable, don’t normalize it to something “harmless.” Make it either:

a penalty, or

a descriptor bin like “unknown” that doesn’t get rejected at seed time, but is tracked as a niche.

This prevents evolution from optimizing the evaluator rather than the game."

## Verdict on the claims (with reality-check vs your docs)
1) “Seeding can reject valid seeds for a reason that isn’t about validity”

Factually correct. Your pipeline explicitly rejects seeds solely because they bin only into MAP-Elites special bins (unknown/under/over) “to ensure coverage targets are met.” 

pipeline-overview


Those special bins are not validity bins; they’re range/definedness bins (unknown for non-finite/null/undefined; under/over for out-of-range). 

evolutionary-engine

My take: This is indeed a coupling bug at the architecture level: you’re using a descriptor artifact (range/definedness) as a seed acceptance gate. Early on, “unknown” is often just “the evaluator can’t see it yet,” not “the genome is bad.” Rejecting these guarantees you’ll under-sample weird-but-promising structures (exactly where novel mechanics tend to hide).

So yes: making this optional or softened is an upgrade in robustness and exploratory power.

## 2) “Stop letting the search exploit undefined metrics and skipped effects”

This is directionally right, but your current architecture already mitigates part of it—and misses other parts.

### What you already do right (so the critique is partially outdated)

- The simulation engine skips failing non-cost effects and failing triggers, recording skippedEffects / skippedTriggers instead of throwing. 

- You already have degeneracy detection that penalizes “high skipped effects” (skip-rate computed from totals). 

- You track nonFiniteKeys, and for MAP-Elites descriptors you convert those to null so they bin to "unknown" (instead of being mistaken for a real number).

- If fitness itself becomes non-finite, you hard-stop it by returning { fitness: null, descriptors: null } so the genome gets rejected.

### Where the critique still bites (real holes)

- Non-finite metric values are normalized to 0 for fitness stability (your docs say normalization.nonFinite is currently zero).
If a metric is missing/undefined and its weight is low/zero (or the preference model hasn’t learned it), “0” can act effectively neutral, which evolution can exploit by producing “evaluator-blind” genomes.

- You do not currently promote these into first-class degeneracy signals:

-- skipped trigger rate (you log skipped triggers, but don’t score/penalize them explicitly)

-- cost-abort frequency (engine can return costAborted: true on action application, but it’s treated as “should not happen” rather than a scored degeneracy axis) 

-- no-legal-actions / pass-loop pathologies as an explicit pressure signal (you detect stalemate / non-terminating, but not “this design frequently dead-ends into no-legal-actions” as its own lever)

My take: The proposed fixes are more beneficial than your current architecture because they close off “optimize the evaluator” strategies without sacrificing robustness. This is exactly the kind of hardening that keeps evolutionary systems honest.

## 1) What needs to change

### 1.1 Seeding: stop rejecting “special-only” bin seeds as a validity gate
**Remove** the rule:
- “Seeds that bin exclusively into special MAP-Elites bins (`unknown/under/over`) are rejected…”

**Replace** with a two-track policy: *acceptance* vs *coverage accounting*.

#### New config (breaking change, no aliasing)
Add under `seeding.generate.coverage`:
- `specialOnly.policy`: `"allow" | "cap" | "reject"` (default `"cap"`)
- `specialOnly.maxFraction`: number in [0, 1] (default `0.10`)
- `specialOnly.maxCount`: integer >= 0 (default `Infinity`, applied after fraction)
- `specialOnly.countTowardCoverage`: boolean (default `false`)

#### Seed generation behavior
When a candidate seed is schema+semantic valid:
1. Compute niche bins as usual.
2. If it is “special-only” (every descriptor bin token is in `{unknown, under, over}`):
   - if `policy="reject"`: reject with reason `special-only-bin`
   - if `policy="cap"`: accept into a side pool and admit into the final seed population
     only until `maxFraction/maxCount` are satisfied
   - if `policy="allow"`: accept normally
3. Coverage filling logic prioritizes candidates that satisfy coverage targets.
   Special-only seeds:
   - do NOT count toward coverage when `countTowardCoverage=false`
   - may still be admitted (cap/allow) so exploration keeps edge cases

#### Artifacts
Extend `seed-report.json`:
- `rejectedByReason.special-only-bin`
- `acceptedSpecialOnly`
- `specialOnlyCapHit` (boolean)
- keep existing coverage summary unchanged

---

### 1.2 Metrics: stop treating non-finite metrics as “harmless zeros” in fitness
Right now: non-finite metric values are normalized to 0 for fitness stability.

**Change** to explicit policy:
- Add `evaluation.metrics.normalization.nonFinitePolicy`:
  - `"penalize" | "reject"`
- Add `evaluation.metrics.normalization.nonFinitePenalty`:
  - `perKeyPenalty`: number in [0, 1] (default `0.05`)
  - `maxPenalty`: number in [0, 1] (default `0.50`)

#### Fitness behavior
Let `k = nonFiniteKeys.length` (or intersection with “active metrics”, if you define that set).
- If policy = `"reject"` and `k > 0`: evaluator returns `{ fitness: null, descriptors: null }`
  with diagnostics `{ nonFiniteMetrics: nonFiniteKeys }`
- If policy = `"penalize"`:
  - Multiply the computed fitness score by:
    `mult = clamp(1 - min(maxPenalty, k * perKeyPenalty), 0, 1)`
  - Store diagnostics `{ nonFiniteMetrics: nonFiniteKeys, nonFinitePenaltyMultiplier: mult }`

**Keep** existing behavior for MAP-Elites descriptors:
- any descriptor key in `nonFiniteKeys` yields descriptor value `null` (bins to `"unknown"`)

---

### 1.3 Degeneracy: promote skipped triggers, cost aborts, and dead-end behavior into scored signals

#### 1.3.1 Simulation trace additions (schema + runtime)
Extend each `TrajectoryStep` with:
- `costAborted?: boolean`  (true when action costs caused abort; false/absent otherwise)
- `triggerAttemptCount?: integer` (>=0)
- `triggerSkipCount?: integer` (>=0)

Extend trajectory summary aggregation to compute totals:
- `totalSkippedTriggers`
- `totalAttemptedTriggers`
- `totalCostAborts`
- `totalPassSteps` (actionId == null)
- `totalActionSteps` (actionId != null)

#### 1.3.2 New core metrics (available to MAP-Elites and/or fitness)
Add metric IDs:
- `skipped_trigger_rate` = totalSkippedTriggers / max(1, totalAttemptedTriggers)
- `cost_abort_rate`      = totalCostAborts / max(1, totalActionSteps)
- `pass_step_rate`       = totalPassSteps / max(1, totalSteps)
- `no_legal_actions_termination_rate` = runsWhere(terminationReason=="no-legal-actions") / runs

#### 1.3.3 New degeneracy flags (defaults are opinionated)
Add flags:
- `anyCostAbort` (policy: `reject`)
- `highSkippedTriggers` (policy: `penalize`)
- `highPassRate` (policy: `penalize`)
- `highNoLegalActionsTermination` (policy: `penalize` OR `reject` depending on your taste)
- `nonFiniteMetrics` (policy: `penalize` OR `reject`, wired to 1.2)

Add default thresholds (configs/degeneracy.json):
- `thresholds.anyCostAbort.minCount = 1`
- `thresholds.highSkippedTriggers.rate = 0.10`, `minAttempts = 20`
- `thresholds.highPassRate.rate = 0.30`, `minSteps = 20`
- `thresholds.highNoLegalActionsTermination.rate = 0.25`, `minRuns = 10`

Penalties:
- add per-flag penalty weights, consistent with your existing penalty system

Compound rejection:
- keep existing `compoundRejection` behavior; these new flags participate normally

---

## 2) Invariants that should pass

### Seeding invariants
- Seed *validity* is defined ONLY by schema validation + semantic validation.
  Descriptor bin outcomes must never, by themselves, make a seed “invalid”.
- With `specialOnly.policy="cap"`, admitted special-only seeds must satisfy:
  `acceptedSpecialOnly <= floor(populationSize * maxFraction)` AND `<= maxCount`.
- Coverage strategy must still attempt to meet bin coverage targets first; special-only
  admission must not prevent reaching coverage when it is achievable.

### Evaluation invariants
- If `nonFinitePolicy="reject"` and any metric is non-finite:
  evaluator must return `fitness:null` and be rejected upstream.
- If `nonFinitePolicy="penalize"`:
  fitness must strictly decrease as `nonFiniteKeys.length` increases (all else equal).
- Any descriptor key with a non-finite raw metric value must produce `null` in `descriptors`.

### Simulation/degeneracy invariants
- `costAborted` must be observable in the trace when it happens.
- `triggerAttemptCount >= triggerSkipCount >= 0` per step.
- If `anyCostAbort` fires, the genome must be rejected (not merely penalized).

### Determinism invariants
- Given identical seeds + inputs, seeding and evaluation results must remain deterministic
  (including special-only admission order and cap enforcement).

---

## 3) Tests that should pass

### Seeding
1. **accepts special-only seed when capped**
   - Arrange: generator produces a schema+semantic valid definition whose descriptors bin to all `"unknown"`.
   - Config: `specialOnly.policy="cap"`, `maxFraction=1.0`
   - Assert: seed is accepted; `seed-report.json.acceptedSpecialOnly` increments.
2. **enforces cap**
   - Arrange: many special-only candidates.
   - Config: `maxFraction=0.1`, `populationSize=100`
   - Assert: `acceptedSpecialOnly <= 10`
3. **coverage preference**
   - Arrange: mix of candidates that fill numeric bins and special-only candidates.
   - Assert: numeric-bin candidates are selected first until coverage is met.

### Non-finite metrics handling
4. **penalize non-finite**
   - Arrange: metric returns NaN; `nonFinitePolicy="penalize"`
   - Assert: `diagnostics.nonFinitePenaltyMultiplier < 1` and fitness reduced.
5. **reject non-finite**
   - Arrange: metric returns NaN; `nonFinitePolicy="reject"`
   - Assert: evaluator returns `{ fitness:null, descriptors:null }` with `nonFiniteMetrics`.

### New trace fields + metrics
6. **trigger counts**
   - Arrange: a failing trigger path
   - Assert: step has `triggerAttemptCount>=1`, `triggerSkipCount>=1`
   - Assert: `skipped_trigger_rate` computed > 0
7. **cost abort observability**
   - Arrange: craft a scenario where cost abort can occur
   - Assert: `costAborted=true` appears in at least one step and `cost_abort_rate > 0`

### Degeneracy policies
8. **anyCostAbort rejects**
   - Arrange: evaluation produces `anyCostAbort`
   - Assert: genome rejected (not placed) and rejection reason reflects degeneracy rejection.
9. **highSkippedTriggers penalizes**
   - Arrange: skipped_trigger_rate above threshold
   - Assert: fitness reduced by degeneracy penalty and genome can still survive if not compound-rejected.
10. **compound rejection still works**
   - Arrange: produce > `maxPenaltyFlags` penalize flags
   - Assert: genome rejected by compound rule.

### Telemetry accounting regression
11. **operator stats accounting invariant**
   - For a generation, assert:
     `attempts === noOp + repairFailed + rejectedTotal + validEvaluated`
   - And `evaluated === rejectedTotal + validEvaluated`

## Update architectural docs

Review all architectural docs at docs/architecture/ to determine if they need to be updated given recent changes.