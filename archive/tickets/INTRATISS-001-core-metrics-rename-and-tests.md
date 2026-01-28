# INTRATISS-001: Redefine core interaction metrics and update unit tests

## Context
The current `interaction_rate` metric is a turn-taking proxy. We need to rename that behavior to `turn_taking_rate` and redefine `interaction_rate` as cross-player impact, then update the core metrics unit tests accordingly.

### Reassessed assumptions
- Current summaries only include `playerId`, `actionId`, and `legalActionCount` in `keySteps`. There is no guaranteed `affectedPlayerIds` data in real summaries yet.
- No schema/type guarantees for `affectedPlayerIds` exist in this repo today.
- The change must be metrics-only and defensive: compute interaction from `affectedPlayerIds` when present, but treat missing/invalid data as no cross-player impact.

## Work
- Add `computeTurnTakingRate` (based on active player transitions).
- Redefine `computeInteractionRate` to count action steps that affect a non-active player.
  - Ignore steps with `actionId = null`.
  - Count a step when `affectedPlayerIds` contains any id != `playerId`.
  - Treat missing or non-array `affectedPlayerIds` as empty.
- Update `computeCoreMetrics` to emit both `turn_taking_rate` and `interaction_rate` ids.
- Update unit tests in `test/unit/evaluation-analytics/core-metrics.test.mjs` to match the new definitions.

## File list it expects to touch
- `src/evaluation-analytics/metrics/core.js`
- `test/unit/evaluation-analytics/core-metrics.test.mjs`

## Out of scope
- Any simulation-engine instrumentation to populate `affectedPlayerIds`.
- Schema or type updates for trajectory steps.
- Feature vector ordering changes.
- E2E tests or doc updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/core-metrics.test.mjs`

### Invariants that must remain true
- `turn_taking_rate` and `interaction_rate` remain in the `[0, 1]` range.
- Single-player summaries still yield `turn_taking_rate = 0` and `interaction_rate = 0`.
- Pass steps (`actionId = null`) do not affect the interaction_rate denominator.
- Missing `affectedPlayerIds` does not throw and does not count as interaction.

## Status
Completed on 2026-01-28.

## Outcome
- Added `computeTurnTakingRate` and emitted `turn_taking_rate` from core metrics.
- Repurposed `computeInteractionRate` to count cross-player effects using `affectedPlayerIds` when present; missing data treated as empty.
- Updated core metrics unit tests to cover the new definitions, pass-step handling, and metric id list.
