# CONEXT-004: Wire simulation engine to configs/simulation.json

## Goal
Replace hardcoded simulation defaults with values loaded from `configs/simulation.json`, and update the architecture doc to reference the config file and keys.

## Assumptions (reassessed)
- Simulation engine entry points are synchronous (`runSimulation`, `createSimulationEngine`, `runRollout`), while the config loader is async. We will not change public APIs to async.
- `configs/simulation.json` already exists and is validated via `src/config/loader.js` + `schemas/config/simulation.schema.json`.
- The simulation loop currently reads `turn.noLegalActions` only from the game definition; config defaults must not override an explicit definition.

## Tasks
- Load and validate `configs/simulation.json` once at module init (top-level await) and use it as defaults without changing public APIs.
- Map defaults for:
  - `maxTurns`, `maxSteps`
  - loop detection (`loopDetection.enabled`, `loopDetection.maxRepeatedStates`)
  - no-legal-actions policy (`turn.noLegalActions.policy`, `turn.noLegalActions.reason`)
  - RNG seed metadata (`rng.seed`, with `rng.algorithm` documented only)
- Apply defaults only when per-run config values are not provided; game-definition `turn.noLegalActions` remains authoritative.
- Allow tests to inject an alternate simulation config object (validated via the existing config loader) to avoid mutating repo config files.
- Ensure behavior is unchanged when using the default config file.
- Update `docs/architecture/simulation-engine.md` to reference `configs/simulation.json`, list key names, and describe override policy.

## File list (expected to touch)
- src/simulation-engine/index.js
- src/simulation-engine/loop.js
- src/simulation-engine/rng.js
- src/simulation-engine/batch.js
- docs/architecture/simulation-engine.md
- src/simulation-engine/types.d.ts
- test/unit/simulation-engine/*

## Out of scope
- Any changes to simulation algorithms.
- Changes to other subsystems (metrics, runner, etc.).
- Schema changes or config file structure changes beyond the defined keys.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Default behavior with default config files matches current behavior.
- Determinism is preserved for identical seeds and configs.
- Validation errors are raised for invalid configs.

## Status
Completed on 2026-01-28.

## Outcome
- Loaded and validated `configs/simulation.json` once at module init to provide defaults without changing the sync API.
- Applied defaults for max turn/step cutoffs, loop detection, no-legal-actions policy, and numeric seed only when per-run values are absent.
- Added test-only support by allowing an injected simulation config object and covered it with unit tests.
- Updated the simulation engine architecture doc to point at the config file and override policy.
