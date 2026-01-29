# Degeneracy Filters Issue

I provided ChatGPT with the architectural docs, and it found this issue:

"Your degeneracy filters are strong, but they may over-reject whole genres by default. You reject forced-move if legalActionCount <= 1 for ≥ 0.8 of steps, and reject no-choices if every sampled step has ≤1 legal action. That’s correct for “strategy game intended to present decisions constantly”… but it kills: deterministic puzzles tactical games with long forced sequences punctuated by key decisions many card games where decisions are sparse but high impact"

## Are the claims correct/valid?

### Fact check: The ChatGPT description matches your docs.

Your degeneracy detection defines:

forced move = ratio of steps with legalActionCount <= 1 >= 0.8 

metrics-and-fitness

no choices = every sampled step has legalActionCount <= 1 

metrics-and-fitness

Those flags can become hard rejects if they’re included in rejectOn (the doc explicitly describes rejectOn as the rejection mechanism). 

metrics-and-fitness

### Validity of the critique: Also basically correct.

Those two flags encode a “decision density should be high” value system. That’s great for constantly-branching strategy games, but it will indeed suppress:

games with long forced sequences + punctuated choices,

puzzle-like “execute the only move” segments,

sparse-but-high-impact decision structures.

Your architecture already supports config defaults + overrides, but in practice the defaults are “global truth” unless the runner/experiment wiring makes those overrides easy and first-class.

There’s a second, subtler issue: “no choices” is defined over sampled steps (keySteps), which can misclassify games where choices exist but are rare and not sampled. 

metrics-and-fitness

So: the critique is directionally right, and there are concrete improvements worth making.

You should cleanly redesign degeneracy handling now (instead of layering overrides on top of rejectOn). Your current docs do bake in decision-density bias (“forced move” + “no choices”), and those can absolutely over-reject genres by default.

Here are the corrected specs with zero backward-compat baggage.

## 1) What needs to change (spec-like)
### A. Make degeneracy policy explicit in the runner config schema

Change: Update runner-config.v1.json to allow a first-class degeneracy config at evaluation.degeneracy (not “hidden” inside metrics/fitness blobs). The schema currently only allows simulation, metrics, fitness under evaluation. 

runner-config.v1

New schema shape (normative):

- evaluation.degeneracy MUST exist (no “defaults from file” as the primary mechanism).

- evaluation.degeneracy MUST contain:

-- enabledFlags: string[]

-- thresholds: object (per-flag thresholds)

-- policyByFlag: { [flag: string]: "reject" | "penalize" | "ignore" }

-- penalties: object (per-flag penalty function params; required for any penalize)

-- minStepsForNoChoices: integer (default recommendation: 10)

Remove: the concept of rejectOn as the primary control surface. Replace it fully with policyByFlag. (You can still derive “reject flags” internally from policyByFlag, but don’t expose two competing knobs.)

### B. Redefine degeneracy detection to avoid “sampled step” false positives

Your metrics doc says degeneracy uses per-run summaries including keySteps (“samples of steps”), and defines No choices as “every sampled step has legalActionCount <= 1”.
But your SimulationResult already contains all trajectory steps with legalActionCount.

Change: Degeneracy detection for forcedMove and noChoices MUST be computed from trajectory.steps (full trace), not sampled keySteps.

New normative definitions:

- forcedMoveRatio = count(step.legalActionCount <= 1) / stepCount

- forcedMove = (forcedMoveRatio >= thresholds.forcedMove.ratio)

- noChoices = (stepCount >= minStepsForNoChoices) AND (count(step.legalActionCount > 1) == 0)

keySteps can still exist for other analytics, but degeneracy flags that gate candidates must not depend on sampling.

### C. Change defaults: only reject true pathologies; penalize decision sparsity

Right now, degeneracy flags can trigger rejection via config (rejectOn). 

metrics-and-fitness


If you want a system that discovers what you like, hard rejecting “sparse decisions” is self-sabotage.

Change default policy (recommended, normative for your v1 unless you explicitly want “constant decisions”):

- loop → reject (actual pathology; also aligns with loop-detected terminationReason)

- nonTerminating → reject (safety cutoff / dead evolution)

- forcedMove → penalize

- noChoices → penalize

- dominantAction → penalize (often “solved” or degenerate, but can be fine early) 

- trivialWin → penalize or reject depending on whether you allow micro-games; default penalize early 

- stalemate → penalize (or ignore) unless you specifically hate draw-heavy games

### D. Add a deterministic penalty term into fitness computation

Your pipeline already appends degeneracy flags as degeneracy.<flag> features, and fitness is a deterministic blend.
But if you don’t want hard rejection, you need a standard penalty channel so evolution still gets pressure away from junk even before the preference model learns.

Change: Fitness computation MUST apply penalize policies as a deterministic penalty:

- degeneracyPenalty = sum( penalty(flag) for flags where policyByFlag[flag] == "penalize" )

- finalFitness = (base + diversity + preference) - degeneracyPenalty 

Penalty function (keep it simple & tunable):

- Forced move:

-- penalty = max(0, forcedMoveRatio - freeRatio) * weight

- No choices:

-- penalty = (noChoices ? weight : 0)

All penalty params live under evaluation.degeneracy.penalties.

### E. Update the docs to match the new contract

Update metrics-and-fitness.md degeneracy section to:

- remove rejectOn

- define policyByFlag

- define “computed from full trajectory.steps”

- explicitly state “forcedMove/noChoices are not genre-truth; they’re preference/policy knobs.”

## 2) What invariants should pass

1. Determinism invariant
Given identical SimulationResult.trajectory.steps, degeneracy flags and penalties are identical (no RNG, no sampling dependence).

2. No-choices correctness invariant
If any step has legalActionCount > 1, then noChoices MUST be false.

3. Policy semantics invariant

reject: candidate is rejected before scoring/placement.

penalize: candidate is not rejected due to that flag; fitness is decreased by the configured penalty.

ignore: flag has no effect on gating or fitness (but may be logged / emitted as a feature).

4. Schema validity invariant
Runner config with evaluation.degeneracy validates against runner-config.v1.json; configs missing required degeneracy keys fail validation.

## 3) What tests should pass
### Update existing E2E expectations (because semantics change)

Your E2E coverage explicitly mentions “mock fitness behavior and gating … preference gating on degeneracy and safety flags”. That will need updating to the new policyByFlag model and the new defaults.

Modify: test/e2e/mock-fitness.e2e.test.mjs

Verify: loop / nonTerminating cause rejection under default policy.

Verify: forcedMove / noChoices do not reject under default policy; they produce a fitness penalty.

### Add targeted unit tests for degeneracy detection

1. Full-trace vs sampled regression

Construct a trajectory where only one late step has legalActionCount = 2.

Assert noChoices === false.

Assert forcedMoveRatio matches full-step ratio.

2. Min-steps guard

For stepCount < minStepsForNoChoices, assert noChoices === false (unless you choose otherwise—then lock it with a test).

3. Penalty math

Given forcedMoveRatio, freeRatio, weight, assert exact penalty output.

Given noChoices=true, assert penalty equals configured weight.

### Add config/schema tests

4. runner-config schema test

A config including evaluation.degeneracy validates.

A config missing policyByFlag or penalties for penalize flags fails.

### Keep existing determinism tests passing

Your pipeline determinism requirements should remain unchanged (same seed → same outputs), and degeneracy should not introduce nondeterminism.

----

If you want my blunt recommendation: hard reject only “this will waste your compute forever” pathologies (loop/non-terminating). Everything else should be either learned preference (features) or soft pressure (penalties). That’s how you avoid accidentally banning entire genres before you’ve even seen what you enjoy.

## Update Architectural Docs

The existing architectural docs at docs/architecture/ must be updated to stay up-to-date after these comprehensive changes.