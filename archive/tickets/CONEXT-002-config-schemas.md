# CONEXT-002: Add JSON Schemas for config files

## Goal
Define JSON Schema files for each config JSON so validation can be centralized and referenced by loaders and docs.

## Assumptions (updated)
- The config JSON files already exist under `configs/` and are the source of truth for keys and types.
- Configs include fields beyond the draft spec (e.g., `active-learning.json` has `maxPairs` + `cadence`, and `metrics-extended.json` uses `skillExpression.agentTiers`).
- Schema files live under `schemas/` in this repo, so new config schemas should live under `schemas/config/` to match existing schema organization.
- No runtime wiring exists yet for these config schemas; this ticket only defines schemas and tests that validate the config files.

## Tasks
- Create a schema directory under `schemas/` (e.g., `schemas/config/`).
- Add one schema per config file, aligned to keys and types in `configs/*.json`.
- Include required/optional fields, enum constraints, numeric bounds, and array item shapes.
- Add a short README in the schema directory documenting file purpose and naming conventions.
- Add unit tests that validate each config file against its schema.

## File list (expected to touch)
- schemas/config/README.md
- schemas/config/simulation.schema.json
- schemas/config/metrics-core.schema.json
- schemas/config/metrics-extended.schema.json
- schemas/config/degeneracy.schema.json
- schemas/config/fitness.schema.json
- schemas/config/preference-model.schema.json
- schemas/config/active-learning.schema.json
- schemas/config/map-elites.schema.json
- schemas/config/evolution-operators.schema.json
- schemas/config/evolution-runner.schema.json
- schemas/config/human-feedback.schema.json
- test/unit/config-schemas.test.mjs

## Out of scope
- Loader/validator implementation.
- Any runtime behavior changes.
- Architecture doc edits.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Validation errors are raised for invalid configs once a validator is wired.
- Feature vector ordering remains deterministic; weights are keyed by id.

## Status
Completed (2026-01-28)

## Outcome
- Added config schemas under `schemas/config/` plus a README to document naming and conventions.
- Added unit coverage to validate `configs/*.json` against the new schemas.
- Scope aligned to actual config fields (e.g., `agentTiers`, `maxPairs`, `cadence`, `trivialWin.minSamples`).
