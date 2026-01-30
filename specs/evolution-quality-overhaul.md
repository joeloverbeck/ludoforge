# Evolution Quality Overhaul

**Status:** Draft
**Created:** 2026-01-30
**Problem:** The first 1000-generation run produced only broken games.

## Observed Failure Modes

The population converges toward degenerate games across four categories:

1. **Structural collapse** -- mutations remove all zones, actions, or phases; repair cannot recover because the structural element pool is empty.
2. **Semantic invalidity** -- preconditions become unsatisfiable, termination conditions unreachable, or actions reference deleted state; validation treats these as warnings, not errors.
3. **Simulation crashes** -- games crash the simulation engine; the evaluator catches the exception and returns `fitness: null`, but the genome is still tracked.
4. **Degenerate play** -- games run but produce forced-move, no-choices, trivial-win, or stalemate patterns; penalties are too weak to drive them to extinction.

## Root Cause Chain

```
Repair returns null silently
  -> Evaluation adapter returns fitness:null
    -> Engine correctly rejects null-fitness genomes from MAP-Elites
      -> BUT shortlist pulls only from elites, so population shrinks
        -> Surviving elites include degenerate games with weak penalty
          -> Degenerate games breed, producing more degenerate offspring
            -> After 1000 generations: population saturated with degeneracy
```

The system lacks **hard stops** at repair failure, structural collapse, and degeneracy detection. It relies on soft penalties that never drive degenerate genomes below the fitness of structurally-collapsed null-fitness genomes.

---

## Area 1: Degeneracy Detection & Penalties

### EQ-01: Escalate critical degeneracy flags to rejection

**File:** `configs/degeneracy.json:31-38`
**Problem:** Only `loop` and `non-terminating` are rejected. The flags `forced-move`, `no-choices`, `trivial-win`, and `stalemate` are penalized but never rejected. A game with all five penalty flags still gets a positive fitness score.

**Current config:**
```json
"policyByFlag": {
  "loop": "reject",
  "non-terminating": "reject",
  "forced-move": "penalize",
  "no-choices": "penalize",
  "dominant-action": "penalize",
  "trivial-win": "penalize",
  "stalemate": "penalize"
}
```

**Fix:** Add `"no-choices": "reject"` at minimum. Consider a compound rule: reject when 3+ penalty flags fire simultaneously.

**Depends on:** None.

### EQ-02: Make degeneracy penalty multiplicative, not additive

**Files:**
- `src/evaluation-analytics/scoring.js:148-168` (`combineFitnessScores`)
- `src/evaluation-analytics/degeneracy-penalty.js:16-42` (`computeDegeneracyPenalty`)

**Problem:** The penalty is subtracted from the base score:
```js
score: base + diversityContribution + preferenceContribution - degeneracyPenalty
```
A game with `base: 0.6` and `degeneracyPenalty: 0.3` still scores `0.3`. Degenerate games retain enough fitness to survive selection.

**Fix:** Apply as a multiplicative discount: `score * (1 - clamp(penalty, 0, 1))`. A penalty of `0.3` reduces a `0.6` base to `0.42`; a penalty of `1.0` forces fitness to zero.

**Depends on:** None.

### EQ-03: Separate degeneracy metrics from fitness composite weights

**File:** `configs/fitness.json:21-27`
**Problem:** Degeneracy flags (`degeneracy.loop`, `degeneracy.stalemate`, etc.) are included in the fitness weight map with weight `1`. They enter the feature vector as binary `0/1` values via `feature-vector.js:117-138`. A non-degenerate game gets `degeneracy.*: 0` for all seven keys, contributing nothing. But a degenerate game gets `degeneracy.*: 1` for fired flags, which **increases** the weighted sum when `weight: 1` and the flag value is `1`.

**Root cause in `feature-vector.js:128`:**
```js
vector[`${prefix}${flag}`] = degeneracyFlags.has(flag) ? 1 : 0;
```
With `weight: 1` in fitness config, a fired degeneracy flag adds `+1/23` to the normalized score (23 total weights). The separate penalty subtracts `0.1-0.5`, but the composite inclusion partially offsets it.

**Fix:** Set all `degeneracy.*` weights to `0` in `fitness.json`, or exclude `degeneracy.*` keys from composite scoring entirely. Degeneracy should only affect fitness through the penalty mechanism.

**Depends on:** None. Complements EQ-02.

### EQ-04: Add compound degeneracy rejection rule

**File:** New logic in `src/evaluation-analytics/degeneracy-penalty.js` or `src/evolutionary-engine/evaluation-adapter.js`
**Problem:** Individual penalties are weak. A game can accumulate `forced-move + dominant-action + trivial-win + stalemate` (penalty `0.9`) and still score positive if the base composite is high.

**Fix:** Add a compound rule: if the number of active penalty flags exceeds a threshold (e.g., 3), reject the genome entirely regardless of individual flag policies. This creates a cliff that prevents flag accumulation.

**Depends on:** EQ-01.

---

## Area 2: Repair Pipeline

### EQ-05: Repair must never return null without a fallback genome

**File:** `src/evolutionary-engine/repair.js:238-254`
**Problem:** `repairGenome()` returns `null` when any repair operator fails (line 248). The orchestrator (`mutation/orchestrator.js:90-91`) passes `null` through to the caller:
```js
const repaired = repairGenome(mutatedGenome, { operators: repairOperators, rng });
return { genome: repaired, operatorName: mutationResult.operatorName ?? null };
```
Downstream, `engine.js:147` correctly rejects null-fitness results, but the population shrinks by one member every time repair fails.

**Fix:** When repair returns `null`, fall back to the **original pre-mutation genome**. The mutation is discarded and the genome survives unchanged. This prevents population shrinkage.

**Depends on:** None.

### EQ-06: Repair must validate structural minimums

**File:** `src/evolutionary-engine/repair.js:174-184` (`repairActions`)
**Problem:** `repairActions` repairs individual actions but does not validate that the action list is non-empty. After `action-remove` deletes the last action, repair produces `actions: []`. Similarly, `zone-remove` can empty all zones, and `phase-remove` can empty all phases.

When `repairEffect` encounters an empty zone set (`repair.js:119-123`):
```js
const validZones = [...zoneIds];
if (validZones.length > 0) {
  return { ...effect, toZone: validZones[0] };
}
// implicitly returns undefined -> filtered out -> effects: []
```

**Fix:** Add structural minimum checks to `dslSafetyRepair`:
- `actions.length >= 1` (return null to trigger EQ-05 fallback)
- `state.zones.length >= 1` if any effect references zones
- `termination.conditions.length >= 1`
- At least one action must have non-empty `effects`

**Depends on:** EQ-05 (for fallback behavior when minimums fail).

### EQ-07: Repair must validate effect-to-state references

**File:** `src/evolutionary-engine/repair.js:111-168` (`repairEffect`)
**Problem:** Repair fixes `move`/`spawn` effects pointing to deleted zones, but does not fix:
- Effects referencing deleted variables (e.g., `set` effect with `variableId` not in `state.variables`)
- Effects referencing deleted token types
- Preconditions referencing deleted variables

After `token-type-remove` or variable-impacting mutations, effects and preconditions can reference state that no longer exists. Repair does not check these references.

**Fix:** Add reference validation: for each effect and precondition, verify that referenced `variableId`, `tokenTypeId`, and `zoneId` exist in the current definition state. Replace missing references with valid alternatives, or remove the effect if no valid target exists.

**Depends on:** EQ-06.

---

## Area 3: Mutation Operator Weights

### EQ-08: Weight destructive operators lower than conservative operators

**File:** `configs/evolution-operators.json:28-50`
**Problem:** All 21 mutation operators have equal weight `1`. Destructive structural operators (`action-remove`, `zone-remove`, `phase-remove`, `token-type-remove`, `effect-delete`) are equally likely as conservative operators (`numeric-tweak`, `boolean-toggle`, `effect-param-tweak`).

Over 1000 generations, each genome experiences ~1000 mutations. With 5/21 chance of a destructive mutation per step, structural collapse is statistically inevitable.

**Fix:** Set conservative operators to weight `3-5` and destructive operators to weight `0.5-1`:
```json
"weights": {
  "numeric-tweak": 5,
  "boolean-toggle": 3,
  "enum-cycle": 3,
  "effect-param-tweak": 4,
  "effect-reorder": 2,
  "action-remove": 0.5,
  "zone-remove": 0.5,
  "phase-remove": 0.5,
  "token-type-remove": 0.5,
  "effect-delete": 1
}
```

**Depends on:** None.

### EQ-09: Add structural guard clauses to destructive operators

**Files:**
- `src/evolutionary-engine/mutation/operators/action-remove.js`
- `src/evolutionary-engine/mutation/operators/zone-remove.js`
- `src/evolutionary-engine/mutation/operators/phase-remove.js`
- `src/evolutionary-engine/mutation/operators/token-type-remove.js`
- `src/evolutionary-engine/mutation/operators/effect-delete.js`

**Problem:** These operators remove elements unconditionally. `action-remove` can delete the last action. `zone-remove` can delete the last zone.

**Fix:** Each destructive operator must check a minimum count before applying. If removal would leave the collection empty, the mutation is a no-op (return the genome unchanged). Example: `action-remove` returns unchanged if `actions.length <= 1`.

**Depends on:** None. Complements EQ-06 (belt-and-suspenders).

### EQ-10: Introduce adaptive operator weighting based on telemetry

**Files:**
- `src/evolution-runner/operator-telemetry.js` (existing telemetry tracking)
- `src/evolutionary-engine/operator-selector.js` (existing `WeightedSelector`)

**Problem:** Static weights cannot respond to emergent population dynamics. If repair failure rate climbs, the system should automatically reduce destructive operator weights.

**Fix:** After each generation, compute repair-failure rate per operator. If an operator's failure rate exceeds a threshold (e.g., 30%), halve its weight for the next generation. This creates a feedback loop that stabilizes the population.

**Depends on:** EQ-08. Uses existing telemetry infrastructure.

---

## Area 4: Seed Generation Quality

### EQ-11: Reject seeds with special-bin descriptors

**File:** `src/seed-generation/generate-seed-population.js:125-130`
**Problem:** Genomes binning to `unknown`, `under`, or `over` niches are auto-accepted without coverage policy:
```js
if (hasSpecialBin(nicheId)) {
  seenIds.add(id);
  genomes.push(genome);
  specialBinCounts.set(nicheId, (specialBinCounts.get(nicheId) ?? 0) + 1);
  continue;
}
```
A genome with `agency: NaN` and `variety: NaN` gets niche `agency:unknown|variety:unknown|...` and is unconditionally accepted. These are typically broken games that crashed evaluation or produced non-finite metrics.

**Fix:** Reject special-bin genomes. A seed with `NaN` descriptors is not a valid starting point for evolution. Count rejections as `"special-bin"` in `rejectedByReason`. If this makes it harder to fill the population, increase `maxAttempts`.

**Depends on:** None.

### EQ-12: Validate generated seeds against semantic checks

**File:** `src/seed-generation/grammar-generator.js:150-169`
**Problem:** `generateGameDefinition()` produces games validated only by JSON Schema (via `createGenomeId` which calls `validateGenomeDefinition`). It does not run semantic validation (`collectSemanticIssues`). Generated games can have:
- Unsatisfiable preconditions (e.g., `var_0 >= max` when max is already initial)
- Unreachable termination conditions
- Actions where all effects are no-ops

**Fix:** After generation, run `collectSemanticIssues()` and reject seeds that have error-level issues. Warnings (unused variables) can be tolerated. This ensures seeds are structurally sound before entering the evolutionary loop.

**Depends on:** EQ-13 (semantic checks must actually fail on critical issues).

### EQ-13: Upgrade semantic validation to enforce critical invariants

**File:** `src/dsl/semantic.js` (241 lines)
**Problem:** Semantic checks only push issues of varying severity but never cause validation to fail. `action-precondition-unsatisfiable` (line ~145-150 in semantic.js) is informational only. A game with zero reachable actions passes semantic validation.

**Fix:** Introduce severity levels: `error`, `warning`, `info`. Return a `valid: false` result when any `error`-level issue exists. At minimum, escalate these to errors:
- Unsatisfiable preconditions on ALL actions (no legal move exists)
- Zero termination conditions
- Termination conditions that reference non-existent variables
- All effects are no-ops (e.g., `set var_0 = var_0.initial` when that's already the value)

**Depends on:** None.

---

## Area 5: Evaluation & Engine Integration

### EQ-14: Engine must track rejection reasons per generation

**File:** `src/evolutionary-engine/engine.js:141-157`
**Problem:** Rejected genomes are collected but their rejection reasons are not categorized. The runner cannot distinguish between repair failures, validation failures, safety gate failures, and simulation crashes.

**Fix:** Categorize rejections by source:
```js
rejected.push({
  genome: candidate,
  reason: result.diagnostics?.repair?.failed ? "repair-failure"
    : !result.diagnostics?.validation?.valid ? "validation-failure"
    : result.diagnostics?.safety?.length > 0 ? "safety-failure"
    : result.diagnostics?.simulationError ? "simulation-crash"
    : "evaluation-null",
  diagnostics: result.diagnostics,
});
```
This enables the runner to log rejection rates by category and detect systemic failures.

**Depends on:** None.

### EQ-15: Runner must halt on high rejection rates

**File:** `src/evolution-runner/runner.js`
**Problem:** The runner does not monitor rejection rates. If 90% of the population is rejected in a generation, the run continues with a tiny surviving population that has no diversity.

**Fix:** After each generation, compute `rejectionRate = rejected.length / population.length`. If `rejectionRate > 0.8` for 3 consecutive generations, halt the run with a diagnostic message identifying the dominant rejection reason. This prevents wasting compute on a doomed population.

**Depends on:** EQ-14.

### EQ-16: Evaluator must reject non-finite fitness scores

**File:** `src/evaluation-analytics/create-evaluator.js:136-148`
**Problem:** The evaluator returns whatever `fitnessResult.score` produces. If the composite score is `NaN` (e.g., all metrics are `NaN` and weights sum to zero), the evaluator passes `NaN` as fitness. The engine's check (`result.fitness == null`) does not catch `NaN` because `NaN == null` is `false`.

**Fix:** Add an explicit guard in the evaluator return:
```js
const score = fitnessResult.score;
if (!Number.isFinite(score)) {
  return { fitness: null, descriptors: null, diagnostics: { ... } };
}
```

**Depends on:** None.

### EQ-17: Track population health metrics across generations

**Files:** `src/evolution-runner/runner.js`, `src/evolution-runner/artifact-writer.js`
**Problem:** No longitudinal tracking of population quality. There is no way to detect drift toward degeneracy except by manually inspecting shortlist outputs.

**Fix:** After each generation, compute and persist:
- Mean/median fitness of evaluated genomes
- Rejection rate and rejection reason counts
- Degeneracy flag frequency across the population
- Niche occupancy count (how many bins have elites)
- Repair failure rate

Write to `generation-N/health.json`. This enables post-run analysis and early stopping (EQ-15).

**Depends on:** EQ-14, EQ-15.

---

## Dependency Graph

```
EQ-01 (escalate flags) --> EQ-04 (compound rule)
EQ-05 (repair fallback) --> EQ-06 (structural minimums)
EQ-06 --> EQ-07 (reference validation)
EQ-08 (weights) --> EQ-10 (adaptive weights)
EQ-12 (seed semantic) --> EQ-13 (semantic enforcement)
EQ-14 (rejection reasons) --> EQ-15 (halt on high rejection)
EQ-14 --> EQ-17 (health metrics)
EQ-15 --> EQ-17
```

Items with no dependencies (can start immediately):
`EQ-01`, `EQ-02`, `EQ-03`, `EQ-05`, `EQ-08`, `EQ-09`, `EQ-11`, `EQ-13`, `EQ-14`, `EQ-16`

## Implementation Priority

**Phase 1 -- Stop the bleeding (highest impact, no dependencies):**
- EQ-05: Repair fallback to pre-mutation genome
- EQ-09: Structural guards in destructive operators
- EQ-16: Reject non-finite fitness scores
- EQ-03: Zero-weight degeneracy metrics in fitness

**Phase 2 -- Strengthen selection pressure:**
- EQ-01: Escalate critical degeneracy flags
- EQ-02: Multiplicative degeneracy penalty
- EQ-08: Weight destructive operators lower
- EQ-11: Reject special-bin seeds

**Phase 3 -- Structural robustness:**
- EQ-06: Repair structural minimums
- EQ-07: Repair effect-to-state references
- EQ-13: Semantic validation enforcement
- EQ-12: Semantic validation for seeds

**Phase 4 -- Observability and adaptive control:**
- EQ-14: Categorized rejection tracking
- EQ-15: Halt on high rejection rates
- EQ-17: Population health metrics
- EQ-04: Compound degeneracy rejection
- EQ-10: Adaptive operator weighting
