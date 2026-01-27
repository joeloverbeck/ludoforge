# [PREMODBTUPD] PREMODBTUPD-001: Add preference model config fields
Status: Completed

## Goal
Extend preference model state and options to carry the new comparison/rating weights and clamp/decay settings, with sane defaults and non-finite fallbacks.

## File list (expected to touch)
- src/evaluation-analytics/types.ts
- src/evaluation-analytics/preference-model.d.ts
- src/evaluation-analytics/preference-model.js
- test/unit/evaluation-analytics/types.test.ts
- test/unit/evaluation-analytics/preference-model.test.mjs
- test/unit/evaluation-analytics/fitness.test.mjs
- test/unit/evaluation-analytics/active-learning.test.mjs
- test/e2e/mock-fitness.e2e.test.mjs
- test/unit/evolutionary-engine/preference-evaluator.test.mjs
- test/unit/data-persistence/types.test.ts
- test/unit/data-persistence/preference-model-store.test.mjs
- docs/architecture/human-feedback.md

## Scope
- Add the following fields to preference model state + options: `comparisonWeight`, `ratingWeight`, `weightDecay`, `maxWeightAbs`, `maxBiasAbs`.
- Ensure `createPreferenceModelState` and `updatePreferenceModelState` store these fields, defaulting to the spec values when inputs are missing or non-finite.
- Update tests and fixtures that construct `PreferenceModelState` literals to include the new fields.
- Extend snapshot fixtures in data-persistence tests to include the new hyperparams so they round-trip with the expanded configuration.
- Update architecture docs to reflect the new preference-model config fields (without changing update math).

## Out of scope
- No change to the comparison or rating update math (Bradley-Terry logic is handled in a later ticket).
- No regularization or clamp application yet (handled later).
- No new persistence writer logic beyond adjusting existing fixtures/tests.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/e2e/mock-fitness.e2e.test.mjs`

### Invariants that must remain true
- Preference model state remains immutable across updates (no mutation of prior state).
- Weights remain keyed by feature id in snapshots and in-memory state.
- Existing snapshot JSONL serialization remains deterministic.

## Outcome
- Added the preference-model config fields (comparison/rating weights and decay/clamp limits) to state/options
  with defaulting for non-finite inputs, without changing update math.
- Updated unit/e2e tests and snapshot fixtures to include the new hyperparams and added a defaulting test.
- Refreshed `docs/architecture/human-feedback.md` to reflect the new stored config fields.
