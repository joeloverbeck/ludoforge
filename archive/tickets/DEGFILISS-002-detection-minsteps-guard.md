# DEGFILISS-002: Add `minStepsForNoChoices` guard + consume new config shape in detection

**Status:** Completed
**Depends on:** DEGFILISS-001
**Blocks:** DEGFILISS-004

## Summary

Add the `minStepsForNoChoices` guard to `detectDegeneracy` to prevent false-positive `noChoices` flags on short games, and update type definitions accordingly.

**Key finding:** `log-adapter.js:155` maps ALL `trajectory.steps` into `keySteps` — the detection code already uses the full trace. The actual code change for spec item B is adding the `minStepsForNoChoices` guard only.

### Assumptions Reassessed (post-DEGFILISS-001)

- **Requirement 4** (`applyDegeneracyFilters` derives reject set from `policyByFlag`): **Already implemented** by DEGFILISS-001 via `deriveRejectFlags()` in `degeneracy.js:110-117`. No code change needed.
- **Requirement 5** (module reads `enabledFlags` instead of `flags`): **Already implemented** by DEGFILISS-001 at `degeneracy.js:106-108`. No code change needed.
- **Requirement 3** (invariant 2: if any step has `legalActionCount > 1`, `noChoices` is `false`): **Already satisfied** by current logic (`forcedSteps === forcedSamples` at line 289), since any step with `legalActionCount > 1` means `forcedSteps < forcedSamples`. A dedicated test is still warranted.
- **Test 4** (config migration / `policyByFlag` derivation): **Already covered** by existing tests added in DEGFILISS-001. No new test needed.

### Remaining Scope (this ticket)

1. `detectDegeneracy` accepts `minStepsForNoChoices` in thresholds parameter.
2. If total forced-move sample count < `minStepsForNoChoices`, `noChoices` flag is never set.
3. Update `DegeneracyThresholds` type to include `minStepsForNoChoices`.
4. Add tests: min-steps guard, no-choices correctness invariant, determinism invariant.

## Files to Change

- `src/evaluation-analytics/degeneracy.js`
- `src/evaluation-analytics/degeneracy.d.ts`
- `test/unit/evaluation-analytics/degeneracy.test.mjs`

## Out of Scope

- Runner config schema (DEGFILISS-003)
- Fitness penalty computation (DEGFILISS-004)
- Changes to `preference-evaluator.js` (DEGFILISS-004)
- `applyDegeneracyFilters` policyByFlag derivation (done in DEGFILISS-001)
- `enabledFlags` config reading (done in DEGFILISS-001)

## Requirements

### Detection Logic (`degeneracy.js`)

1. `detectDegeneracy` accepts `minStepsForNoChoices` in thresholds parameter.
2. If total forced-move sample count < `minStepsForNoChoices`, `noChoices` flag is never set.
3. If any step has `legalActionCount > 1`, `noChoices` is `false` (invariant 2 from spec — already true, add test).

### Type Definitions (`degeneracy.d.ts`)

- Add `minStepsForNoChoices?: number` to `DegeneracyThresholds`.

### Tests

1. **Min-steps guard**: For `forcedSamples < minStepsForNoChoices`, assert `noChoices === false`.
2. **No-choices correctness invariant**: Construct trajectory where only one late step has `legalActionCount = 2`. Assert `noChoices === false`.
3. **Determinism invariant**: Identical summaries + thresholds produce identical output.

## Acceptance Criteria

- [x] `detectDegeneracy` accepts `minStepsForNoChoices` in thresholds
- [x] If total forced-move sample count < `minStepsForNoChoices`, `noChoices` flag is never set
- [x] If any step has `legalActionCount > 1`, `noChoices` is `false` (invariant 2)
- [x] `DegeneracyThresholds` type includes `minStepsForNoChoices`
- [x] Determinism invariant: identical summaries + thresholds produce identical output
- [x] `npm run test:unit` passes

## Outcome

### What changed vs originally planned

The original ticket assumed 5 requirements, but reassessment found that **requirements 4 and 5** (`applyDegeneracyFilters` policyByFlag derivation and `enabledFlags` reading) were **already implemented by DEGFILISS-001**. The ticket scope was narrowed accordingly.

### Actual changes

**`src/evaluation-analytics/degeneracy.js`** (3 minimal edits):
- Added `minStepsForNoChoices: 10` to `FALLBACK_DEGENERACY_THRESHOLDS`
- Added config-driven `minStepsForNoChoices` to `DEFAULT_DEGENERACY_THRESHOLDS`
- Added `minStepsForNoChoices` threshold resolution in `detectDegeneracy`
- Applied guard: `forcedSamples >= minStepsForNoChoices` condition to no-choices flag

**`src/evaluation-analytics/degeneracy.d.ts`** (1 line):
- Added `minStepsForNoChoices?: number` to `DegeneracyThresholds`

**`test/unit/evaluation-analytics/degeneracy.test.mjs`** (1 fix + 4 new tests):
- Fixed existing "forced-move and no-choices" test to pass explicit `minStepsForNoChoices: 3`
- Added: min-steps guard (short game suppressed)
- Added: min-steps guard (exact threshold triggers)
- Added: no-choices correctness invariant (single choice step prevents flag)
- Added: determinism invariant (identical inputs → identical outputs)

All 311 unit tests pass.
