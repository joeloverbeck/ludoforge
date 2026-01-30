# Mutation Operators Issues

We fed the architectural docs to ChatGPT so that it could find possible improvements. It said: "Operator selection shouldn’t be uniform; it should be adaptive Right now mutation operators are chosen uniformly at random. evolutionary-engine That’s classic EA “works on toy problems, wastes time on real ones.”

## Assessment of the claim
### What ChatGPT got right

Yes: mutation operators are currently chosen uniformly at random. Your own architecture doc states “Operator chosen uniformly at random (seedable RNG).” 

evolutionary-engine

Yes: this can waste budget once evaluation is expensive. In your pipeline, “expensive” is the evaluator (simulation → analytics → fitness → MAP-Elites placement). 

pipeline-overview

 Uniformly sampling 21 operators means you’ll repeatedly spend full evaluation cost on operators that mostly create rejects / junk.

### What ChatGPT overstated or missed

“Works on toy problems” is rhetoric. Uniform operator sampling is a completely normal baseline in evolutionary search.

The bigger miss: you’re using MAP-Elites, not a plain EA. In MAP-Elites, “success” is not just fitness improvement—it’s also grid contribution (fills an empty niche, improves an elite, expands descriptor coverage). A bandit that optimizes only “fitness delta” can reduce exploration and harm what MAP-Elites is for.

### Is the proposal beneficial vs what you have now?

Partly, but not as stated.

- Strongly beneficial, low risk: implement non-uniform (weighted) sampling using the configs/evolution-operators.json weights you already document, and add operator telemetry. You already mention weights exist (currently “reserved, all 1”), which is basically an architectural TODO/bug. 

evolutionary-engine

 

pipeline-overview

- Potentially beneficial, higher risk: adaptive bandits (UCB/Thompson) can help, but only if:

-- the reward is MAP-Elites-aware (grid contribution + validity),

-- you enforce a minimum exploration probability so you don’t “kill” rare-but-necessary operators,

-- updates are deterministic given your determinism goals. 

evolution-runner

My blunt take: do weights + telemetry now; make bandits pluggable but don’t default to them until you’ve run real evolutions. You’ll get 80% of the benefit with 20% of the complexity, and you won’t accidentally sabotage exploration.

## Spec-like specs
1) What needs to change

### 1.1 Make operator selection non-uniform (use weights)

Current: mutation selection is uniform. 

evolutionary-engine


Documented config: configs/evolution-operators.json includes mutation.weights (currently “reserved”). 

evolutionary-engine

#### Change

- Implement weighted sampling over enabled mutation operators.

- Treat mutation.weights as first-class:

-- If an enabled operator has no weight entry → config validation error (clean architecture, no silent defaults).

-- Weight must be finite and > 0.

#### Where

- src/evolutionary-engine/mutation.js selection logic (stop “uniform RNG pick”).

- src/evolutionary-engine/operator-config.js (load + validate weights).

- Add a schema: schemas/config/evolution-operators.schema.json and validate configs/evolution-operators.json at load time (like your other configs).

### 1.2 Add operator telemetry (per run)

Goal: measure “this operator wastes evaluations” so you can tune weights (and later support bandits).

#### Change

- For each mutation operator, track at minimum:

attempts

validOffspring (passes validation+semantic)

acceptedOffspring (not rejected by gates/degeneracy policy)

gridContribution (filled empty niche OR improved elite) — MAP-Elites aware

avgFitnessDeltaVsParent (optional but useful)

#### Where

- Orchestrator/runner layer that knows:

--  parent fitness (already evaluated),

-- child evaluation result,

-- MAP-Elites placement outcome.

This aligns with your “core modules unaware of run boundaries” rule: telemetry is runner-scoped and persisted per run.

#### Artifacts

- Persist operator-stats.json under runs/<runId>/generation-<n>/ next to existing artifacts. 

evolution-runner

- On resume, load latest stats and continue. 

### 1.3 (Optional, but architecturally clean) Introduce an OperatorSelector interface

#### Change

- Add a tiny abstraction, e.g. OperatorSelector with:

-- pick(rng) -> operatorName

-- observe(operatorName, outcome) (updates stats)

#### Provide implementations:

WeightedSelector (the default)

Ucb1Selector (optional)

ThompsonSelector (optional)

### 1.4 If you do a bandit: make the reward MAP-Elites-aware

If you implement UCB/Thompson now, do not reward only fitness improvement.

#### Reward event fields (minimum)

valid (bool)

accepted (bool)

gridContribution (enum: none | filledEmpty | improvedElite)

fitnessDelta vs parent (number)

#### Reward function (example spec)

reward = 0

if valid add +0.1

if accepted add +0.3

if filledEmpty add +1.0

if improvedElite add +1.5

add +clamp(fitnessDelta, -1, +1) * 0.2

if rejected add -0.5

Also enforce minSelectionProb (epsilon floor) so every enabled operator is still sampled sometimes.

## 2) Invariants that should pass
### Determinism invariants

Given the same run seed and same inputs, operator picks are deterministic. 

evolution-runner

Weighted selection: deterministic given RNG stream + stable operator ordering.

Bandits: deterministic only if observe() happens in a deterministic order (e.g. child genomes processed in stable id order) and Thompson sampling uses the same RNG.

### Config invariants

The enabled operator set is explicit and validated:

No unknown operator names in config.

Every enabled operator has a weight entry (no silent defaults).

All weights are finite and > 0.

If using minSelectionProb:

0 <= minSelectionProb <= 1

minSelectionProb * operatorCount <= 1 (otherwise impossible distribution)

### Correctness invariants

Selection MUST only return operators in the enabled set.

Telemetry counters MUST satisfy:

0 <= validOffspring <= attempts

0 <= acceptedOffspring <= validOffspring

Run isolation:

Operator stats MUST NOT leak across runs unless resuming the same runId. 

evolution-runner

### MAP-Elites alignment invariant (if bandit enabled)

Rewarding MUST incorporate grid contribution (filled empty niche / improved elite), not only fitness delta.

## 3) Tests that should pass
### Existing tests (must remain green)

From your E2E coverage docs: 

e2e-coverage

- test/e2e/evolution-pipeline.e2e.test.mjs

-- Deterministic evaluation for equal seeds

-- Stable next-generation ids

- test/e2e/evolution-mutation-repair.e2e.test.mjs

-- Crossover/mutation/repair produce valid child genomes at scale 

e2e-coverage

Any determinism-related simulation tests (test/e2e/mock-simulation.e2e.test.mjs) must also remain deterministic. 

e2e-coverage

### New tests to add (recommended)
#### Unit: weighted selection is deterministic

test/unit/operator-selection.weighted.test.mjs

Given fixed seed + operator list + weights → first N picks match a snapshot sequence.

Verifies “weight 10” operator appears more often than “weight 1” in a long run (statistical with wide margin, or deterministic snapshot via seeded RNG).

#### Unit: config validation

test/unit/config.evolution-operators.schema.test.mjs

Unknown operator name → fails validation

Missing weight for enabled operator → fails validation

Weight <= 0 / NaN → fails validation

#### Integration/E2E: telemetry produced and persisted

test/e2e/operator-telemetry.e2e.test.mjs

Run 1 generation → asserts operator-stats.json exists and counts add up.

Resume same run → asserts counters continue (not reset).

#### If bandit is implemented: behavior test (not just “doesn’t crash”)

test/e2e/operator-selection.ucb1.e2e.test.mjs

Configure two operators where one deterministically causes rejects (can be faked with a stub operator in test registry).

After warmup, selector favors the good operator but still samples the bad one sometimes (epsilon floor).

## Bottom line recommendation

Do now: implement weighted selection + strict config validation + telemetry. That’s clean architecture, matches your own docs (weights aren’t “reserved” anymore), and reduces wasted evaluations immediately. 

Do optionally: make bandits pluggable, but only enable them once you’ve defined MAP-Elites-aware “success” and you’ve confirmed determinism won’t get compromised. 

## Update architectural docs

Review architectural docs at docs/architecture/ and ensure they're updated to stay up-to-date.