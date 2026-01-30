# Effect Trigger Failures

We fed our architectural docs to ChatGPT so that it could find bugs. ChatGPT said: "Effect/Trigger Failures are Silently Skipped The simulation engine silently skips failed effects/triggers instead of flagging them. This allows genomes to "win" by exploiting this inaction, relying on only a subset of effects that occur. This issue hides defects in the ruleset and undermines fair evolution. Identifying limitations and lies in the system's current behavior The current setup may appear robust, but it's actually an exploitable loophole."

Yes — the core factual claim is valid, and it’s not just “possible”: it’s explicitly documented behavior.

- The simulation engine skips failed effects instead of throwing, and it does so for both costs and normal effects (“source: cost|effect”), returning a list of skipped items alongside applied effects. 

- After-action triggers also don’t throw on failure; failures are recorded as skippedTrigger and execution continues. 

- However, that skip/failure information is not represented in the canonical persisted SimulationResult schema (trajectory steps only include appliedEffects, not skipped effects/triggers), so from the evaluator/metrics layer it can be effectively “silent” unless you’re separately logging internals.

## Is the “genomes can win by exploiting this” part correct?

It’s plausible and partially supported, but not proven purely by the docs.

- The docs explicitly justify skipping as a way to let “structurally complex genomes survive evaluation even when some effects target non-existent structures.”  Note by the reviewer: this sounds wrong. If some effect exists it's either because it's been seeded in, which should have seeded it in a valid state, or has mutated in, and if the mutation was incorrect, then the unmutated genome should have been returned. The only other cases I imagine an effect could end up targetting non-existent structures is if those other structures have been removed, and in that case, some code should also remove either the entirety of other structures that refer to the removed part, or if the element is the kind that can just remove the referral to the removed part and turn it into something else (as in refer to itself, or to another), then it should likely be mutated in company. I don't think we want to have genomes with invalid parts in any circumstance.

- That means: a genome can carry broken dynamics yet still be scored.

Your degeneracy detection list does not include anything about skipped/failed effect rates. So a genome that “works” primarily because large chunks of its rules never apply may not be penalized/rejected at all.

- There’s also an evaluator note that engine.runBatch() can throw on bounds issues (example: “dec-at-zero”), so some failures are catastrophic while others are silently skipped — an inconsistency that can bias evolution toward “survive-by-skipping” patterns. 

My take: keeping “skip” for some runtime failures is beneficial for exploration, but skipping action cost failures is a serious integrity problem. Costs are the accounting system of the game; if they can fail and be skipped, you can get “free actions” in edge states. Even if some bounds are caught earlier, you don’t want correctness to depend on that.

Below is a concrete spec that improves integrity without killing evolvability.

# Spec: Effect/Trigger Failure Observability + Cost Integrity

## 1) What needs to change

### A. Costs must be atomic and non-skippable (default behavior)
**Problem:** Current engine may skip failed *cost* effects (documented), which can create “free actions” and distort evolution.

**Change:**
1. Extend `isActionLegal` / `validateActionChoice` to include a **trial-application of action costs** under the same bounds/validation rules as execution.
2. If any cost effect would fail (bounds reject, missing token instance, invalid zone/node, etc.), then the action is **illegal** and must not appear in `listLegalActions`.
3. `applyAction` may still *internally* be able to “skip” cost effects, but under default policy this becomes unreachable because illegal actions are filtered earlier.

**Default policy (recommended):**
- `costFailurePolicy = "illegal"` (new)
- Alternative debug policy: `costFailurePolicy = "error"` (throw hard when attempted)

### B. Persist skipped failures into the trajectory (stop being “silent”)
**Problem:** Skip events are documented, but `SimulationResult` trajectory steps don’t carry them, so analytics can’t see them.

**Change:**
Add optional fields to `TrajectoryStep`:
- `skippedEffects?: SkippedEffect[]`
- `skippedTriggers?: SkippedTrigger[]`

Where:
- `SkippedEffect` includes at minimum:
  - `kind: string`
  - `source: "cost" | "effect"`
  - `reason: string` (human-readable or enum-like)
  - `target?: ResolvedRef` (when available)
- `SkippedTrigger` includes at minimum:
  - `triggerId?: string` (if triggers have IDs; otherwise index)
  - `reason: string`
  - `effectsAttempted?: number`
  - `effectsApplied?: number`

**Pass-step rule update:**
When `actionId === null`:
- `skippedEffects` must be `[]` or absent
- `skippedTriggers` must be `[]` or absent

### C. Add a degeneracy signal for “high skip rate”
**Problem:** Current degeneracy flags do not cover skipped/failed rules. A genome can “survive” by having lots of dead/broken dynamics.

**Change:**
1. Add extended metric(s):
   - `skipped_effect_rate = totalSkippedEffects / (totalAppliedEffects + totalSkippedEffects)`
   - `skipped_trigger_rate = totalSkippedTriggers / totalTriggersFired` (or per-step normalization)
2. Add degeneracy flag:
   - `high-skipped-effects` when `skipped_effect_rate >= threshold` AND sample size sufficient
3. Default policy:
   - `high-skipped-effects -> penalize` (not reject), so evolution can still explore but is pressured away.

**Config:**
- Add to `configs/degeneracy.json`:
  - `thresholds.highSkippedEffects.rate` (default e.g. `0.10`)
  - `thresholds.highSkippedEffects.minAttempts` (default e.g. `50`)
- Add to `configs/metrics-extended.json` an enable switch if you want this optional.

### D. Schema updates (backward compatible)
Update `simulation-result.schema.json`:
- Add `skippedEffects` and `skippedTriggers` as optional properties on `TrajectoryStep`.
- Add `$defs/SkippedEffect` and `$defs/SkippedTrigger`.

This is backward-compatible because old logs simply omit the new fields.

---

## 2) What invariants should pass

### Action-cost integrity invariants
1. **No free actions:** If a chosen action’s cost cannot be applied, the action must be illegal (and therefore unselectable via `listLegalActions`).
2. **Cost atomicity:** Either all costs apply or the action does not execute.
3. **Determinism:** Legality of an action w.r.t cost applicability must be deterministic given the same state + seed.

### Failure observability invariants
4. **No silent skipping at the result level:** Any skipped effect/trigger during a non-pass step must be represented in that step’s persisted `TrajectoryStep` (unless logging is explicitly disabled).
5. **No mutation on failure:** Skipped effects/triggers must not partially mutate the state (i.e., failures are “no-op with record”).
6. **Pass-step cleanliness:** Pass steps never record skipped effects/triggers.

### Analytics invariants
7. **Metrics stability:** Existing core metrics must remain computable and unchanged in meaning.
8. **Degeneracy integration:** `high-skipped-effects` must be deterministically derived from summaries, and policy application must be stable across runs.

---

## 3) What tests should pass

### Unit tests: simulation engine
1. **Cost failure makes action illegal**
   - Setup: variable at min; action cost is `dec` that variable (bounds reject mode).
   - Assert: `listLegalActions` does not include that action (or `validateActionChoice` rejects it).
2. **Effect failure is recorded (not thrown)**
   - Setup: action effect targets a missing token instance at runtime.
   - Assert: step contains `skippedEffects` with correct `kind/source/reason`; state is unchanged by that effect.
3. **Trigger failure is recorded (not thrown)**
   - Setup: after-action trigger references something invalid at runtime.
   - Assert: `skippedTriggers` is present; other triggers/effects still apply.
4. **Pass step has no skipped records**
   - Setup: `turn.noLegalActions.policy = "pass"` produces pass step.
   - Assert: `skippedEffects`/`skippedTriggers` absent or empty.

### Schema/adapter tests
5. **SimulationResult schema accepts old and new logs**
   - Old: no skipped fields -> valid.
   - New: includes skipped fields -> valid.
6. **Log adapter preserves skipped fields**
   - If you have `adaptSimulationLog()`, ensure it does not drop these fields and still returns `ok: true`.

### Metrics/degeneracy tests
7. **skipped_effect_rate computes correctly**
   - Given synthetic trajectories with known applied/skipped totals.
8. **high-skipped-effects flag fires at threshold**
   - Below threshold -> not set.
   - Above threshold with enough attempts -> set.
9. **Penalty application**
   - Genome with `high-skipped-effects` receives penalty (or reject) according to `policyByFlag`.

### End-to-end evolution sanity test
10. **No “free cost” genomes surviving unpenalized**
   - Construct a tiny DSL where “winning” would require skipping costs.
   - Assert: either the action is illegal (preferred) or the genome is penalized/rejected via `high-skipped-effects`.

If you want the sharpest “tell it like it is” summary: skipping effects can be a pragmatic evolvability hack; skipping costs is a correctness bug. The best fix is: make cost failures illegal, and make all skips visible + selectable pressure via metrics/degeneracy.   