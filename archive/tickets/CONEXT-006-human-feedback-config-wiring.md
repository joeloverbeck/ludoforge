# CONEXT-006: Wire human feedback, preference model, and active learning configs

Status: Completed (2026-01-28)

## Goal
Wire existing `configs/human-feedback.json`, `configs/preference-model.json`, and
`configs/active-learning.json` into runtime defaults (via `src/config/loader.js`),
then update the architecture doc to reference those configs.

## Tasks
- Load `configs/human-feedback.json` for rating range, comparison choices, and prompt text overrides.
- Load `configs/preference-model.json` for model hyperparameters.
- Load `configs/active-learning.json` for active-learning thresholds/quotas plus cadence/maxPairs.
- Ensure defaults remain unchanged when using baseline configs.
- Update `docs/architecture/human-feedback.md` with config references, key names, and override policy.

## File list (expected to touch)
- src/human-interface/feedback.js
- src/evaluation-analytics/preference-model.js
- src/evaluation-analytics/active-learning.js
- docs/architecture/human-feedback.md
- test/unit/human-interface/feedback.test.mjs
- test/unit/evaluation-analytics/preference-model.test.mjs
- test/unit/evaluation-analytics/active-learning.test.mjs

## Out of scope
- Changes to UI rendering or feedback flow logic beyond parameterization.
- Metrics or evolutionary engine wiring.
- Schema or config file structure changes beyond the defined keys.
- Introducing new config discovery mechanisms (stick to `src/config/loader.js`).

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Default behavior with default config files matches current behavior.
- Determinism is preserved for identical seeds and configs.
- Validation errors are raised for invalid configs.

## Assumptions checked
- Config files and schemas already exist under `configs/` and `schemas/config/`.
- `src/config/loader.js` provides validated loading helpers used by other subsystems.
- Unit tests already cover feedback parsing, preference model updates, and active-learning selection.

## Outcome
Wired `configs/human-feedback.json`, `configs/preference-model.json`, and
`configs/active-learning.json` into module defaults (no new override mechanisms),
updated `docs/architecture/human-feedback.md`, and added unit tests to assert
defaults match config files. Scope did not include `prompt.js` or `router.js`
since only feedback/pref-model/active-learning defaults needed wiring.
