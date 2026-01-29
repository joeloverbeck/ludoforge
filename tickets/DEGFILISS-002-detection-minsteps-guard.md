# DEGFILISS-002: Add `minStepsForNoChoices` guard + consume new config shape in detection

**Status:** Open
**Depends on:** DEGFILISS-001
**Blocks:** DEGFILISS-004

## Summary

Update the degeneracy detection runtime code to consume the new `policyByFlag` config shape and add the `minStepsForNoChoices` guard to prevent false-positive `noChoices` flags on short games.

**Key finding:** `log-adapter.js:155` maps ALL `trajectory.steps` into `keySteps` — the detection code already uses the full trace. The actual code change for spec item B is adding the `minStepsForNoChoices` guard only.

## Files to Change

- `src/evaluation-analytics/degeneracy.js`
- `src/evaluation-analytics/degeneracy.d.ts`
- `test/unit/evaluation-analytics/degeneracy.test.mjs`

## Out of Scope

- Runner config schema (DEGFILISS-003)
- Fitness penalty computation (DEGFILISS-004)
- Changes to `preference-evaluator.js` (DEGFILISS-004)

## Requirements

### Detection Logic (`degeneracy.js`)

1. `detectDegeneracy` accepts `minStepsForNoChoices` in thresholds parameter.
2. If total forced-move sample count < `minStepsForNoChoices`, `noChoices` flag is never set.
3. If any step has `legalActionCount > 1`, `noChoices` is `false` (invariant 2 from spec).
4. `applyDegeneracyFilters` derives reject set from `policyByFlag` entries where policy is `"reject"` (replaces `rejectFlags` / `rejectOn`).
5. Module reads `enabledFlags` instead of `flags` from config.

### Type Definitions (`degeneracy.d.ts`)

- Update types to reflect `minStepsForNoChoices` in thresholds.
- Update `applyDegeneracyFilters` signature for `policyByFlag`.

### Tests

1. **Min-steps guard**: For `stepCount < minStepsForNoChoices`, assert `noChoices === false`.
2. **No-choices correctness invariant**: Construct trajectory where only one late step has `legalActionCount = 2`. Assert `noChoices === false`.
3. **Full-trace ratio**: Assert `forcedMoveRatio` matches full-step ratio.
4. **Config migration**: `applyDegeneracyFilters` correctly derives reject set from `policyByFlag`.
5. **Determinism invariant**: Identical summaries + thresholds produce identical output.

## Acceptance Criteria

- [ ] `detectDegeneracy` accepts `minStepsForNoChoices` in thresholds
- [ ] If total forced-move sample count < `minStepsForNoChoices`, `noChoices` flag is never set
- [ ] If any step has `legalActionCount > 1`, `noChoices` is `false` (invariant 2)
- [ ] `applyDegeneracyFilters` derives reject set from `policyByFlag` entries where policy is `"reject"`
- [ ] Module reads `enabledFlags` instead of `flags` from config
- [ ] Determinism invariant: identical summaries + thresholds produce identical output
- [ ] `npm run test:unit` passes
