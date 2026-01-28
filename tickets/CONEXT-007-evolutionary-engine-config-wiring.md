# CONEXT-007: Wire evolutionary engine configs (MAP-Elites + operators)

## Goal
Parameterize the evolutionary engine using `configs/map-elites.json` and `configs/evolution-operators.json`, and update the architecture doc.

## Tasks
- Load MAP-Elites descriptor settings, fitness key, and tie-break/compare settings from config.
- Load mutation/crossover/repair operator enablement and weights from config.
- Ensure descriptor validation errors are surfaced for invalid bins or ranges.
- Update `docs/architecture/evolutionary-engine.md` with config references, key names, and override policy.

## File list (expected to touch)
- src/evolutionary-engine/map-elites.js
- src/evolutionary-engine/mutation.js
- src/evolutionary-engine/crossover.js
- src/evolutionary-engine/repair.js
- src/evolutionary-engine/engine.js
- docs/architecture/evolutionary-engine.md

## Out of scope
- Changes to evolutionary algorithms beyond config parameterization.
- Runner persistence and resume logic.
- Schema or config file structure changes beyond the defined keys.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Default behavior with default config files matches current behavior.
- Validation errors are raised for invalid configs (e.g., invalid descriptor bins).
- Determinism is preserved for identical seeds and configs.
