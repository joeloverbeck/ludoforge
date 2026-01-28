# CONEXT-003: Implement config loading and validation core

## Goal
Introduce a shared config loading/validation module that reads JSON from the existing `configs/`, validates against the existing schemas in `schemas/config/`, and exposes a stable fingerprint for resume compatibility checks.

## Current State (assumptions updated)
- `configs/` and `schemas/config/` already exist and are validated by `test/unit/config-schemas.test.mjs`.
- There is no shared `src/config/` loader module yet.
- Runtime modules are implemented in `.js` with `.d.ts` for types; `index.ts` files are used for type exports only.

## Tasks
- Add a `src/config/` module that:
  - Loads JSON by conventional filename from `configs/`.
  - Validates against the schema files from `schemas/config/` using Ajv.
  - Produces a deterministic resolved-config object (stable key ordering).
  - Computes a composite `configVersion` map and hash/fingerprint for resume checks.
- Add unit tests covering:
  - Successful load of valid JSON.
  - Failure path for invalid JSON (type errors, enum violations).
  - Deterministic fingerprint across identical inputs.
- Wire the loader in a minimal entry point (export from `src/config/index.ts`) without changing subsystem behavior yet.

## File list (expected to touch)
- src/config/index.ts
- src/config/loader.js
- src/config/loader.d.ts
- src/config/validator.js
- src/config/validator.d.ts
- src/config/fingerprint.js
- src/config/fingerprint.d.ts
- test/unit/config-loader.test.mjs

## Out of scope
- Subsystem wiring (simulation, metrics, runner, etc.).
- Any changes to existing runtime defaults beyond adding the loader.
- Documentation updates.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Validation errors are raised for invalid configs.
- Determinism is preserved for identical seeds and configs.
- Resume checks can rely on a stable config fingerprint.

## Status
Completed (2026-01-28)

## Outcome
- Added a `src/config/` loader/validator/fingerprint module for existing `configs/` + `schemas/config/`.
- Implemented deterministic config normalization and sha256 fingerprinting with a composite `configVersion` snapshot.
- Added unit tests for load success, schema violations, and deterministic fingerprinting.
- No subsystem wiring changes were needed; exports are limited to the new `src/config/index.ts` entrypoint.
