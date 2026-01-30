# MUTOPEISS-01: Stricter config validation for mutation weights

**Status**: Completed
**Priority**: High
**Depends on**: None
**Blocks**: MUTOPEISS-03

## Summary

Make `weights` required in the MutationGroup schema and add semantic validation ensuring every enabled operator has a finite weight > 0.

## Files to Touch

- `schemas/config/evolution-operators.schema.json` — add `"weights"` to `MutationGroup.required`, add `exclusiveMinimum: 0` constraint
- `src/evolutionary-engine/operator-config.js` — add post-schema semantic check: every name in `mutation.enabled` must exist in `mutation.weights` with a finite value > 0
- `configs/evolution-operators.json` — no content change needed (already valid), but crossover/repair groups left as-is (weights remain optional there)

## Out of Scope

- Crossover/repair weight validation
- Any selection logic changes
- Telemetry

## Acceptance Criteria

- New test: `test/unit/evolutionary-engine/operator-config-validation.test.mjs`
  - Missing weight for enabled operator → throws
  - Weight = 0 → throws
  - Weight = NaN → throws
  - Weight = -1 → throws
  - Weight = Infinity → throws
  - All weights present and > 0 → passes
- Existing E2E tests remain green (current config already has all weights = 1)

## Outcome

- Updated the mutation group schema to require weights and enforce `> 0` values.
- Added semantic validation in `operator-config` to ensure every enabled mutation operator has a finite weight.
- Added unit coverage for missing/invalid weights; crossover/repair weights remain optional.
