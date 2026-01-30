# Adaptive Operation Weighting Issues

I fed my architectural docs to ChatGPT so it could find bugs. IT said:

"Adaptive operator weighting isn't accurate
The failure rate for adaptive operator weighting overstates progress because fallback offspring that don't actually contribute to evolution still get counted. This inflates the "valid" offspring number and undermines the purpose of adaptive weighting."

That claim is basically correct, and it points at a real architecture-level mismatch between:

what your adaptive weighting thinks it’s measuring, and

what your telemetry counters actually mean in the presence of “fallback/unchanged offspring”.

## Why it’s correct (grounded in your docs)

1. Adaptive weighting uses validOffspring as “success”.
Your WeightedSelector computes per-operator failure rate as:

(attempts - validOffspring) / attempts 

2. But validOffspring is defined as “evaluated offspring that produced valid fitness + descriptors”.
That’s a pipeline/evaluation success metric, not an operator effectiveness metric. 

3. Your mutation pipeline explicitly falls back to the pre-mutation genome when repair returns null.
So an operator can “fail” to produce a viable mutation, yet the pipeline still evaluates the original genome, which will usually produce valid fitness/descriptors (and will be counted as validOffspring). 


4. You also have multiple operators documented as potentially returning the genome unchanged (no-op / cannot apply), e.g. effect-kind-swap returns unchanged when no valid target exists; several others are “No-op if …”. Those also look “successful” under the current validOffspring definition. 


Net effect: operators that frequently produce no new candidate can still look “high-validity”, keeping their weight undeservedly high. So yes: the metric is inflated and adaptive weighting is being fed a misleading signal.

## Would changing it be beneficial?

Yes—if your goal is adaptive weighting that actually selects for productive operators rather than “operators whose attempts often still lead to some evaluated genome”. With determinism, evaluating fallback clones is pure wasted budget and contributes essentially no evolutionary progress. Fixing this will make weighting meaningful and will also improve observability (you’ll finally be able to distinguish “valid evaluation” from “operator did something useful”).

# Spec: Productive Adaptive Operator Weighting (No Back-Compat)

## 1) What needs to change

### 1.1 Redefine operator telemetry to measure *productivity*, not just evaluability
Replace the current operator counters (attempts/validOffspring/acceptedOffspring) with a richer, explicit outcome model.

Per operator, persist these cumulative counters:

- `attempts`: number of times the operator was selected and invoked.
- `noOp`: operator was invoked but made no change (structural guard, missing prerequisites, “returns unchanged”).
- `repairFailed`: operator produced a mutated genome but repair returned `null`.
- `rejected`: mutated genome existed, but was rejected *before* fitness/descriptors for reasons:
  - `validationFailure`
  - `safetyFailure`
  - `evaluationError`
  - `evaluationNull` (fitness/descriptors missing)
- `evaluated`: number of mutated genomes actually sent to evaluation (post-repair).
- `validEvaluated`: number of evaluated mutated genomes that produced valid `{ fitness, descriptors }`.
- `gridContributions`:
  - `filledEmpty`
  - `improvedElite`

Derived:
- `productiveOffspring = validEvaluated`
  (note: only counts *mutated genomes*, not fallbacks or no-ops)

### 1.2 Stop “fallback to original genome” from polluting operator stats
Change `mutateAndRepairGenome` semantics:

- If repair returns `null`, do **not** return the original genome as the offspring for evaluation.
- Instead return a structured outcome (e.g. `{ outcome: "repairFailed" }`) so the runner can:
  - increment `repairFailed`
  - retry generation of offspring without consuming evaluation budget

Rationale:
- Evaluating the original genome again is deterministically redundant.
- It corrupts operator success metrics and wastes evaluation budget.

### 1.3 Make the runner generate a fixed number of *productive evaluation candidates*
Introduce a runner-level loop to generate offspring:

- Target: `offspringCountPerGen` (existing behavior or explicit config)
- For each offspring slot:
  - pick operator
  - invoke operator
  - if `noOp` → increment and retry
  - if `repairFailed` → increment and retry
  - else validate/safety/evaluate mutated genome
    - record `rejected.*` or `validEvaluated`
- Add a hard cap: `maxAttemptsPerOffspring` (e.g. 25) to prevent infinite loops.
  - If cap reached, stop early and proceed with fewer offspring (explicitly recorded in health metrics).

### 1.4 Update adaptive weighting to use productiveOffspring, not validOffspring
Redefine the per-operator failure/inefficiency rate as:

- `inefficiencyRate = 1 - (productiveOffspring / attempts)`
  where `productiveOffspring = validEvaluated`

Then keep your current threshold logic, but apply it to `inefficiencyRate`:

- penalize if `inefficiencyRate > 0.30`
- restore if `inefficiencyRate < 0.10`
- otherwise unchanged
- keep clamp floor `MIN_WEIGHT`

### 1.5 Fix health metrics naming + meaning
Your current `repairFailureRate = (attempts - validOffspring) / attempts` is not actually “repair failure”.
Replace with:

- `operatorInefficiencyRate = (attempts - totalValidEvaluatedMutations) / attempts`
- `evaluationRejectionRate = rejectedTotal / (rejectedTotal + totalValidEvaluatedMutations)`
- `noOpRate = totalNoOp / attempts`
- `repairFailureRate = totalRepairFailed / attempts` (this becomes truthful now)

## 2) What invariants should pass

### Determinism invariants
- Given identical seeds + inputs, the sequence of:
  - operator picks,
  - operator outcomes,
  - evaluated offspring,
  - resulting MAP-Elites placements,
  remains deterministic.
- The retry loop must be deterministic (no “retry until random works” without seeded RNG).

### Accounting invariants
For each operator `op`:

- `attempts = noOp + repairFailed + rejectedTotal + validEvaluated`
- `evaluated = rejectedTotal + validEvaluated`
- `validEvaluated <= evaluated <= attempts`
- `gridContributions.filledEmpty + gridContributions.improvedElite <= validEvaluated`

### Evolution invariants
- No evaluated offspring is identical-by-definition to its parent due to “repair fallback”.
- No-op attempts never consume evaluation budget (they only consume `attempts`).

## 3) What tests should pass

### Unit: operator outcome accounting
1. **No-op operator is penalized**
   - Given an operator that always returns `noOp`,
   - after one generation observe:
     - `attempts > 0`, `noOp == attempts`, `validEvaluated == 0`
   - `inefficiencyRate == 1.0`
   - weight is penalized (halved, clamped).

2. **Repair failure is penalized and does not increment evaluated/valid**
   - Operator returns a mutation; repair returns `null`.
   - Assert:
     - `repairFailed` increments
     - `evaluated` does not increment
     - `validEvaluated` does not increment

3. **Valid mutated offspring increments productive counters**
   - Operator returns a changed genome; repair ok; evaluation returns valid.
   - Assert:
     - `validEvaluated++`
     - `attempts++`
     - `inefficiencyRate` reflects productivity.

### Unit: adaptive weighting logic uses productiveOffspring
4. **Old bug regression test**
   - Simulate telemetry where `attempts=100`, `validOffspring=100` but `validEvaluated=0` (because all were fallback/no-op).
   - Assert new logic penalizes (inefficiency high), old logic would have restored.

### Integration: fixed offspring budget with retries
5. **Runner produces N evaluated mutations when possible**
   - Configure a mix where some attempts no-op/repair-fail.
   - Assert runner still reaches `offspringCountPerGen` evaluated *mutations* as long as retry cap isn’t hit.

6. **Retry cap behavior is explicit**
   - Force a scenario where all operators no-op (or always repair-fail).
   - Assert run completes deterministically with:
     - evaluated offspring < target
     - health metrics record `offspringShortfall` (or equivalent)
     - operator stats show the true cause distribution.

### Artifact schema/shape tests
7. **operator-stats.json conforms**
   - Validate persisted operator stats include the new counters and derived totals are consistent.

8. **health.json conforms**
   - Validate the renamed metrics exist and are internally consistent with operator stats.

## Addendum

The clean architecture move is what’s spec’d above: make “productive mutation evaluation” a first-class concept and drive both telemetry + weighting from it.

## Update architectural docs

Review the architectural docs at docs/architecture/ and make sure to update them as necessary given this implementation.