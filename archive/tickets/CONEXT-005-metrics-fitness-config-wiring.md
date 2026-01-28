# CONEXT-005: Wire metrics, degeneracy, and fitness configs

## Goal
Replace hardcoded defaults in metrics/degeneracy/fitness with values loaded from `configs/metrics-core.json`, `configs/metrics-extended.json`, `configs/degeneracy.json`, and `configs/fitness.json`, and update the architecture doc accordingly.

## Current state (assumptions updated)
- `src/config/loader.js` already loads + validates config files from `configs/` against schemas.
- There is no single "metrics pipeline" module; callers compose metrics by calling
  `computeCoreMetrics`, `computeExtendedMetrics`, `assembleFeatureVector`,
  and `computePreferenceAwareFitness` directly (or via helpers like the mock fitness).
- Defaults are currently hardcoded in `feature-vector.js`, `degeneracy.js`,
  `metrics/extended.js`, and `fitness.js` / `scoring.js`.
- `configs/metrics-extended.json` currently sets `enabled=true` for optional metrics,
  but runtime behavior remains opt-in because no config wiring exists yet.

## Tasks
- Load metrics core config for default feature ordering and normalization policy.
- Use metrics-extended config to supply default parameter values for optional metrics,
  while keeping optional metrics opt-in (enabled only when explicitly requested).
- Apply degeneracy thresholds and default reject flags from `configs/degeneracy.json`.
- Apply fitness weights and preference/diversity defaults from `configs/fitness.json`
  in `computePreferenceAwareFitness` (no public API changes).
- Ensure feature ordering stays deterministic and weights remain keyed by metric id.
- Update `docs/architecture/metrics-and-fitness.md` with config references, key names,
  and the override policy (explicit options override config defaults).

## File list (expected to touch)
- src/evaluation-analytics/metrics/*
- src/evaluation-analytics/degeneracy.js
- src/evaluation-analytics/feature-vector.js
- src/evaluation-analytics/fitness.js
- src/evaluation-analytics/scoring.js
- configs/metrics-extended.json
- docs/architecture/metrics-and-fitness.md

## Out of scope
- Changes to metric algorithms or scoring formulas.
- Human feedback or preference model wiring.
- Schema or config file structure changes beyond the defined keys.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Default behavior with default config files matches current behavior.
- Feature vector ordering remains deterministic; weights are keyed by id.
- Validation errors are raised for invalid configs.

## Status
Completed (2026-01-28)

## Outcome
- Used config-backed defaults in evaluation modules (feature vector ordering,
  degeneracy thresholds/filters, extended metric parameters, skill-expression defaults,
  and fitness blend settings) without changing public APIs.
- Kept optional metrics opt-in by aligning `configs/metrics-extended.json` enabled flags
  with current behavior rather than auto-enabling via config.
- Updated `docs/architecture/metrics-and-fitness.md` to reference config keys and
  override policy; added unit coverage asserting defaults match config files.
