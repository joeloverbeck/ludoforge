# Removing Human-in-the-Loop

We fed ChatGPT our architectural docs so that it could find bugs or possible improvements to make. It said:

"If your goal is removing human-in-the-loop, don’t chase “fun = formula.” Chase “fun = learned preference,” but reduce queries aggressively

You’ve already built the right direction: an async per-generation feedback provider and an adaptive budget based on ensemble uncertainty.

To actually minimize human involvement:

Active learning everywhere

Don’t just sample “top candidates.” Sample points that maximally reduce model uncertainty in the region evolution is moving into (you’re partially doing this; push harder).

Freeze-and-distill

Once a preference model stabilizes (low uncertainty), distill it into a simpler interpretable “taste vector” over metrics (or a small decision tree).

Then run long stretches with zero feedback until drift is detected (uncertainty rises or metric set changes), at which point you re-query.

Detect preference drift

Humans change their mind; so treat “fun” as non-stationary. Keep a tiny periodic calibration budget even when stable.

That’s the practical path. A fully hand-authored “fun equation” will be brittle and will get Goodhart’d."

Most of what that ChatGPT said is correct, and (importantly) it largely matches what you already built. The parts that matter are the bits you don’t currently implement: true “no-human” stretches, freeze/unfreeze control, and drift calibration.

Assessment of the claims vs your current architecture
1) “Don’t chase fun = formula. Chase learned preference.”

✅ Valid, and your docs basically already agree. Your own metric docs explicitly frame core metrics as proxies and warn against treating them as “fun” predictors unless paired with human preference. 

metrics-and-fitness


Also, your pipeline already blends an ensemble preference score into fitness with uncertainty damping and bootstrap caps, which is exactly the right direction for avoiding brittle “fun equations.” 

metrics-and-fitness

Net: This is correct advice, and you already follow it.

2) “You’ve built the right direction: async per-generation feedback provider + adaptive budget from ensemble uncertainty.”

✅ Correct. You have:

An async feedback provider wired into the generation cycle. 

pipeline-overview

Active-learning pair selection (BALD / ensemble disagreement), with diversity quota + threshold. 

human-feedback

Adaptive budgeting driven by mean ensemble uncertainty + “new metric ids” detection. 

evolution-runner

Net: This is accurate, and it’s a strong foundation.

3) “Active learning everywhere… don’t just sample top candidates.”

🟡 Directionally correct, but your current implementation is only halfway there.

You do BALD selection, but your docs explicitly say it’s “intended to run on a shortlist of elites.” 

human-feedback


Even though the provider can extract from all evaluated genomes, the “shortlist-of-elites” assumption tends to create a blind spot: you reduce uncertainty where you already look good, and you miss “new territory” the evolution is moving into.

Benefit vs current implementation: medium-to-high. This is a real lever for reducing human prompts.

4) “Freeze-and-distill; run long stretches with zero feedback until drift is detected.”

✅ Correct and currently impossible in your system because:

Your adaptive budget hard-clamps the minimum to 1. 

evolution-runner

Your runner config schema enforces maxSamplesPerGen >= 1. 

runner-config.schema

So you can’t ever reach “zero feedback,” which is the whole point of that recommendation.

Benefit vs current implementation: high. This is the big missing piece if your goal is minimizing human-in-the-loop.

5) “Detect preference drift; keep a tiny periodic calibration budget.”

✅ Correct and not implemented.

Right now you compute preference-metrics.json only when you have comparison feedback. 

evolution-runner


If you never intentionally schedule “calibration” prompts, you have no systematic way to detect drift during long runs.

Benefit vs current implementation: high (and low complexity to add).

## 1) What changes need to be made

### 1.1 Runner config schema: replace `humanFeedback` with a preference controller block
**Breaking change:** remove the current `humanFeedback` shape (enabled/mode/maxSamplesPerGen/activeLearning/adaptiveBudget).

Add a new top-level block:

- `preferenceLearning` (required)
  - `enabled: boolean`
  - `mode: "comparison" | "rating"`  (keep, but comparisons remain recommended)
  - `budget` (required)
    - `baseMaxPerGen: integer (minimum 0)`  # NOTE: allow 0
    - `adaptive` (required)
      - `enabled: boolean`
      - `lowUncertaintyThreshold: number [0..1]`
      - `highUncertaintyThreshold: number [0..1]`
      - `scaleDownFactor: number (0..1]`  # e.g. 0.5
      - `scaleUpFactor: number [1..2]`    # e.g. 1.5
      - `onNewMetricIds: "scaleUp" | "forceUnfreeze"`  # see controller below
  - `activeLearning` (required)
    - `maxPairsPerGen: integer (minimum 0)`
    - `cadenceGens: integer (minimum 1)`
    - `uncertaintyThreshold: number (minimum 0)`  # BALD threshold
    - `diversityQuota: number (minimum 0)`
    - `candidatePool` (required)
      - `source: "shortlist" | "elites" | "evaluated" | "mixed"`
      - `focus`
        - `strategy: "none" | "topQuantile" | "parentsAndOffspring"`
        - `topQuantile?: number (0..1]`  # used when strategy=topQuantile
      - `maxCandidates: integer (minimum 2)` # cap for O(n^2) pair enumeration
  - `controller` (required)
    - `freeze` (required)
      - `enabled: boolean`
      - `minTotalSamples: integer (minimum 0)`
      - `freezeAfterStableGens: integer (minimum 1)`
      - `stableUncertaintyThreshold: number [0..1]`
      - `requireNoNewMetricIds: boolean`
    - `calibration` (required)
      - `enabled: boolean`
      - `everyGens: integer (minimum 1)`
      - `samples: integer (minimum 0)`   # small fixed count, e.g. 1–3
      - `strategy: "activeLearning" | "randomPairs"`
    - `drift` (required)
      - `enabled: boolean`
      - `unfreezeUncertaintyThreshold: number [0..1]`
      - `minCalibrationAccuracy: number [0..1]`
      - `ood` (required)
        - `enabled: boolean`
        - `featureDistance: "cosine" | "l2"`
        - `maxTrainDistanceP95: number (minimum 0)`  # OOD trigger threshold
        - `maxOodRate: number [0..1]`

Schema changes:
- Update `schemas/evolution-runner/runner-config.schema.json` accordingly.
- Delete/replace the old `HumanFeedbackConfig` definition entirely (no aliasing).

### 1.2 Introduce a generation-level “feedback plan” decision
Add a pure function:

`decideFeedbackPlan(ctx) -> FeedbackPlan`

Where `FeedbackPlan` includes:
- `shouldPrompt: boolean`
- `reasonCodes: string[]`  (e.g. ["calibration_due", "high_uncertainty", "frozen"])
- `budget: integer (>= 0)`
- `pairSelection: { useActiveLearning: boolean, maxPairs: integer }`
- `candidatePoolResolved: Candidate[]`

This function must be deterministic given:
- seed
- generation index
- preference model snapshot(s)
- current evaluated/shortlist sets
- current metric id set
- controller state

### 1.3 Implement freeze/unfreeze controller state (persisted per generation)
Add a persisted controller state object:
- `mode: "learning" | "frozen"`
- `stableGenCount: number`
- `lastCalibrationGen: number | null`
- `lastMetricIdSetHash: string`
- `trainFeatureStats` (for OOD): rolling summary computed from feedback history
  - include at minimum the feature vectors seen in feedback (sampled/capped),
    plus computed distance thresholds (p95).

Persistence:
- Add new artifact `preference-controller.json` per generation (or new JSONL record type).
- Ensure resume restores controller state and continues correctly.

### 1.4 Allow true “zero prompt” generations
- Remove the hard minimum budget of 1.
- `budget.baseMaxPerGen` and all computed budgets must allow 0.
- When `shouldPrompt=false`, the runner must still:
  - compute & persist “preference health” diagnostics (below)
  - keep preference model unchanged (unless calibration runs)

### 1.5 Add a per-generation diagnostic artifact even without feedback
Create `preference-health.json` each generation containing:
- `meanUncertainty` over the candidate pool
- `oodRate` over the candidate pool
- `controllerMode` and `stableGenCount`
- `plannedBudget` and `didPrompt`
- `metricIdDeltaDetected: boolean`

### 1.6 “Active learning everywhere”: candidate pool must track where evolution is going
Implement `candidatePool` resolution rules:
- `source="shortlist"` uses runner shortlist (if size 0, fall back to elites)
- `source="elites"` uses all elites
- `source="evaluated"` uses evaluated genomes
- `source="mixed"` uses: elites + random sample of non-elite evaluated (seeded)
Then apply `focus.strategy`:
- `topQuantile`: filter by fitness top Q within that pool
- `parentsAndOffspring`: prioritize next-gen parents + newest offspring
Finally cap by `maxCandidates` (seeded sampling when truncating).

This ensures uncertainty reduction focuses on the region the search actually explores.

### 1.7 Distillation (“taste vector”) as a first-class artifact
Add `taste-vector.json` per generation (or only on transitions/fixed cadence):
- Derived from the ensemble:
  - mean weight per feature id
  - stddev per feature id
  - topK positive and negative features
- Include `version`, `sampleCount`, and `controllerMode`
Optional:
- a tiny decision tree distillation can be added later, but start with the linear taste vector
  because it’s cheap, stable, and already aligned to your model.

---

## 2) Invariants that should pass

### Determinism invariants
- Given identical run seed, identical config, identical feedback records, and identical resume point:
  - feedback plans per generation are identical
  - selected pairs are identical
  - preference model snapshots are identical
  - controller state transitions (freeze/unfreeze) are identical

### Safety and accounting invariants
- Operator telemetry accounting remains valid:
  attempts === noOp + repairFailed + rejectedTotal + validEvaluated
- Fitness blend behavior remains unchanged except for preference contribution being “frozen” when no updates occur.
- Preference contribution must remain uncertainty-damped (high disagreement => near-zero contribution).

### Freeze/unfreeze invariants
- Freeze may only occur when:
  - total preference samples >= freeze.minTotalSamples
  - stableUncertaintyThreshold satisfied for freezeAfterStableGens consecutive generations
  - (if requireNoNewMetricIds) metric id set unchanged during that stable window
- While frozen:
  - non-calibration generations must prompt 0 times
  - calibration generations may prompt up to calibration.samples
- Unfreeze must occur when any enabled drift trigger fires:
  - meanUncertainty >= drift.unfreezeUncertaintyThreshold
  - calibration accuracy < drift.minCalibrationAccuracy
  - oodRate > drift.ood.maxOodRate

### Data/IO invariants
- Every generation directory contains:
  - preference-controller.json
  - preference-health.json
  - taste-vector.json
- Resume must fail fast with a clear error if controller state is missing/corrupt.

---

## 3) Tests that should pass

### Unit tests: feedback planning
- decideFeedbackPlan returns budget=0 when frozen and not calibration gen
- decideFeedbackPlan schedules calibration exactly every `everyGens`
- freeze triggers only after N consecutive stable gens and min sample count
- unfreeze triggers on:
  - uncertainty spike
  - ood rate spike
  - calibration accuracy drop

### Unit tests: candidate pool resolution
- each `candidatePool.source` resolves correctly
- `topQuantile` focus filters by fitness correctly
- truncation to `maxCandidates` is seeded and deterministic
- mixed pool uses seeded sampling and is stable across runs

### Unit tests: adaptive budget (now allowing 0)
- adaptive budget returns 0 when baseMaxPerGen=0 and no override conditions apply
- new metric IDs either scale up or force unfreeze (per config)
- low uncertainty scales down properly without clamping to 1

### Integration tests: runner loop behavior
- a run with freeze enabled reaches a frozen state and produces multiple consecutive generations with zero prompts
- calibration generations still prompt and update model
- resume restores frozen state and continues with correct prompting behavior
- artifacts (`preference-health`, `controller`, `taste-vector`) exist every generation

### Regression tests: preference scoring + fitness blend
- preference scoring uncertainty & bald computations unchanged
- fitness blend still damps preference contribution by (1 - uncertainty)
- bootstrap cap behavior unchanged

## My blunt recommendation

If your goal is “minimize human-in-the-loop,” then you must allow 0-feedback generations and add freeze + calibration + drift. Without that, you’re permanently paying at least one prompt per generation, forever, and you’ll never get the qualitative behavior ChatGPT is recommending.

If you implement only one thing: remove the min=1 clamp and add a freeze controller. Everything else (OOD, fancy distillation, richer pool strategies) is additive polish.

If you want, I can also rewrite the affected doc sections (“Human Feedback Integration” + “Adaptive Budget”) to match the new architecture so the docs stay canonical and spec-like.

## Update architectural docs

The architectural docs at docs/architecture/ must be reviewed and updated as appropriate.