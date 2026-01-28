# CONEXT-001: Create baseline config JSON files

## Status
- Completed on 2026-01-28.

## Goal
Add the `configs/` directory and populate each subsystem JSON file with default values that reflect current documented behavior. These files become the single source of defaults referenced by later code and docs.

## Assumptions & clarifications
- Defaults come from architecture docs plus current code constants where docs are silent.
- `configs/active-learning.json` should capture the code defaults for `maxPairs` (5) and `cadence` (1) in addition to `uncertaintyThreshold` and `diversityQuota`.
- `configs/degeneracy.json` should include `minActionSamples` (10) and `minTrivialWinSamples` (3), which are required by current logic but not called out in docs.
- `configs/fitness.json` should reflect the current composite-score defaults: all feature weights default to 1 except `interaction_rate` which defaults to 0.
- `configs/map-elites.json` has no documented default descriptor set; use the minimal placeholder descriptor set from current tests and note it as a baseline default.

## Tasks
- Create `configs/` if it does not exist.
- Add the config files listed in the spec and include `version` (integer) and `updatedAt` (ISO-8601 string) fields.
- Extract default values from existing architecture docs and current behavior notes, then encode them into the appropriate config files.
- Keep each file focused on a single subsystem (no cross-file duplication).
- Ensure JSON is valid, stable ordering, and human-readable (2-space indent).

## File list (expected to touch)
- configs/simulation.json
- configs/metrics-core.json
- configs/metrics-extended.json
- configs/degeneracy.json
- configs/fitness.json
- configs/preference-model.json
- configs/active-learning.json
- configs/map-elites.json
- configs/evolution-operators.json
- configs/evolution-runner.json
- configs/human-feedback.json

## Out of scope
- Any code changes (loaders, validators, runtime wiring).
- JSON Schema files.
- Documentation updates (handled in follow-on tickets like CONEXT-004/005/006/007/008/009).

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Default behavior with default config files matches current documented behavior.
- Determinism is preserved for identical seeds and configs.
- Feature vector ordering remains deterministic; weights are keyed by id.

## Outcome
- Added baseline config JSON files under `configs/` with defaults pulled from docs and current code constants; no runtime wiring changes were needed.
- Recorded missing defaults from code (active-learning maxPairs/cadence, degeneracy sample thresholds, interaction_rate default weight) directly in the configs.
