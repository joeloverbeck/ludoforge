# Effect/Trigger Failure Handling

This spec addresses two distinct concerns around effects and triggers that can fail:

1. **Structural Integrity** — genomes containing effects/triggers that reference non-existent definition IDs. The repair pipeline should catch all of these before evaluation.
2. **Runtime Integrity** — effects that fail during simulation due to transient game state (token destroyed mid-turn, variable at bounds, etc.). These are expected at runtime and must be handled with correct semantics and observability.

---

## Section 1: Structural Integrity

### Problem

The repair pipeline (`dsl-safety` operator) repairs effects and triggers that reference removed variables, zones, or token types. However, three gaps existed:

1. **Trigger conditions** — `repairTriggers()` repaired trigger *effects* but never checked trigger *conditions* for dangling variable references.
2. **Step effects** — `definition.turn.stepEffects` were not passed through `repairEffects()`.
3. **Phase removal** — `phase-remove` mutation spliced the phase array but did not rebind actions whose `metadata.phase` pointed to the removed phase.

### Resolution

1. `repairTriggers()` now checks `trigger.condition` with `exprReferencesMissingVariable()` and strips invalid conditions (making the trigger unconditional).
2. The orchestrator now runs `repairEffects()` on each entry in `definition.turn.stepEffects`.
3. `phase-remove` now iterates `definition.actions` after splicing. Actions referencing the removed phase are rebound to a random remaining phase, or their `metadata.phase` is removed if no phases remain.

### Invariants

- After repair, no trigger condition references a non-existent variable.
- After repair, no step effect references a non-existent zone, variable, or token type.
- After phase removal, no action references a non-existent phase.

---

## Section 2: Runtime Integrity

### Part A: Cost Atomicity

**Problem:** The simulation engine previously skipped failed cost effects (e.g., `dec` on a variable already at its minimum) but continued executing the action's other effects. This created "free actions" where costs were silently waived, distorting evolution.

**Changes:**

1. `isActionLegal()` now includes a **cost-feasibility check**: it trial-applies all cost effects on a cloned state with `boundsMode: "reject"`. If any cost fails, the action is illegal and excluded from `listLegalActions()`.
2. `applyAction()` now **aborts the entire action** if any cost effect fails (returns `costAborted: true` with no applied effects). This is a safety net — with the legality check in place, cost failures should be unreachable during normal execution.

**Invariants:**

- **No free actions:** If a cost cannot be applied, the action is illegal.
- **Cost atomicity:** Either all costs apply, or the action does not execute.
- **Determinism:** Cost legality is deterministic given the same state and seed.

### Part B: Failure Observability

**Problem:** Skipped effects and trigger failures were computed at runtime but not persisted into `SimulationResult` trajectory steps, making them invisible to analytics.

**Changes:**

1. `loop.js` now extracts `skippedEffects` from `applyAction()` and `skippedTriggers` from `applyAfterActionTriggers()`, passing both to `buildStep()`.
2. `buildStep()` includes optional `skippedEffects` and `skippedTriggers` arrays on the trajectory step (only when non-empty).
3. The `SimulationResult` JSON Schema adds `$defs/SkippedEffect` and `$defs/SkippedTrigger` as optional properties on `TrajectoryStep`. Old logs without these fields remain valid.

**Invariants:**

- Any skipped effect/trigger during a non-pass step is represented in the trajectory.
- Skipped effects do not mutate state (failures are no-op with record).
- Pass steps never contain skipped records.

### Part C: Degeneracy Detection for High Skip Rates

**Problem:** Degeneracy detection did not account for genomes with high effect skip rates. A genome could "survive" with many broken dynamics that never apply.

**Changes:**

1. `buildTrajectorySummary()` accumulates `totalSkippedEffects` and `totalAppliedEffects` from trajectory steps.
2. `accumulateStatistics()` sums these across all summaries.
3. `checkFlags()` computes `skipped_effect_rate = skipped / (skipped + applied)` and fires `high-skipped-effects` when rate ≥ threshold AND total attempts ≥ minimum.
4. Config: `configs/degeneracy.json` adds `thresholds.highSkippedEffects` (`rate: 0.10`, `minAttempts: 50`).
5. Default policy: `"high-skipped-effects": "penalize"` (not reject).
6. `schemas/shared/metric-id.schema.json` includes `"skipped_effect_rate"`.

**Invariants:**

- Existing core metrics remain unchanged.
- `high-skipped-effects` is deterministically derived from summaries.
- Policy application is stable across runs.

---

## Tests

### Structural integrity (Phase 1)
1. Trigger with condition referencing non-existent variable → condition stripped after repair.
2. stepEffects referencing removed zone → repaired or removed.
3. Phase-remove with actions bound to removed phase → actions rebound to remaining phase.

### Cost integrity (Phase 2)
4. Variable at min, action cost is `dec` → action not in `listLegalActions()`.
5. Cost failure past legality check → action aborts entirely (`costAborted: true`).

### Observability (Phase 3)
6. Action with effect targeting missing token → step contains `skippedEffects`.
7. Schema validates old logs (without skipped fields) and new logs (with skipped fields).

### Degeneracy (Phase 4)
8. Synthetic trajectory with known skip counts → correct `skipped_effect_rate`.
9. Below threshold → no flag; above threshold with sufficient attempts → `high-skipped-effects` fires.
10. `skipped_effect_rate` appears in metric-id schema.
