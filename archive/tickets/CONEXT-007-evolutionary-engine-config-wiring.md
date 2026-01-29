# CONEXT-007: Wire evolutionary engine configs (MAP-Elites + operators)

## Goal
Parameterize the evolutionary engine using `configs/map-elites.json` and `configs/evolution-operators.json`, and update the architecture doc.

## Tasks
- Load MAP-Elites descriptor settings, fitness key, and tie-break/compare settings from config.
- Load mutation/crossover/repair operator enablement and weights from config.
- Ensure descriptor validation errors are surfaced for invalid bins or ranges.
- Update `docs/architecture/evolutionary-engine.md` with config references, key names, and override policy.

## File list (corrected)
- src/evolutionary-engine/map-elites.js — config loading + DEFAULT_MAP_ELITES_CONFIG export
- src/evolutionary-engine/operator-config.js — **new**, shared config loader for evolution-operators
- src/evolutionary-engine/mutation/orchestrator.js — filter by config (not mutation.js which is a barrel)
- src/evolutionary-engine/crossover.js — filter by config
- src/evolutionary-engine/repair.js — filter by config
- docs/architecture/evolutionary-engine.md — Configuration Files section added
- test/unit/evolutionary-engine/config-wiring.test.mjs — **new**, config wiring assertions

### Not modified (correction from original ticket)
- src/evolutionary-engine/engine.js — receives config from callers, no changes needed
- src/evolutionary-engine/mutation.js — barrel re-export only, no changes needed

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

## Outcome

**Completed.** All evolutionary engine modules now load validated config defaults
at module init following the CONEXT-004 pattern.

### Key design decisions
- **Shared operator-config.js**: The `evolution-operators` config is loaded once
  in `operator-config.js` and shared across orchestrator, crossover, and repair
  modules. This avoids AJV duplicate schema errors from loading the same schema
  multiple times.
- **filterOperatorsByEnabled**: A shared utility filters hardcoded operator
  registries by the config's `enabled` lists. Falls back to full array if
  `enabled` is missing/empty.
- **No engine.js changes**: `engine.js` receives all config from callers via
  options — no config loading needed there.

### Test coverage
- 5 new tests in `config-wiring.test.mjs` verifying config-derived defaults
- All 270 unit tests pass
