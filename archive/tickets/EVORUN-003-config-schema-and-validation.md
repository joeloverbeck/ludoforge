# EVORUN-003: Runner config schema and validation

## Goal

Add a versioned JSON Schema for the evolution runner configuration and a validation module that uses Ajv. The validator should produce actionable diagnostics for missing fields or invalid values.

## Assumptions (rechecked)

- The evolution runner module currently only exposes run layout helpers (`src/evolution-runner/run-layout.js`) and has no config schema or validator yet.
- There is no `schemas/evolution-runner/` directory yet; it should be introduced alongside the schema.
- Ajv (2020-12) is already used for DSL validation and can be reused for runner config validation.

## File list (expected to touch)

- `schemas/evolution-runner/runner-config.v1.json`
- `src/evolution-runner/config.js`
- `src/evolution-runner/config.d.ts`
- `src/evolution-runner/index.ts`
- `test/unit/evolution-runner/config.test.mjs`

## Out of scope

- CLI argument parsing.
- Persisting generation artifacts.
- Changes to existing DSL schemas under `schemas/dsl/`.

## Acceptance criteria

### Tests

- `node --test test/unit/evolution-runner/config.test.mjs`
- `npm run test:unit`

### Invariants

- The schema is versioned and does not modify existing DSL schema behavior.
- Validation rejects invalid MAP-Elites descriptors (bad ranges, duplicate ids, missing required fields) and returns clear error messages.
- Default values, if applied, must be explicit and documented in the validator.

## Status

Completed on 2026-01-28.

## Outcome

- Added a versioned runner config schema (`runner-config.v1.json`) under a new `schemas/evolution-runner/` folder.
- Implemented an Ajv-backed validator with MAP-Elites descriptor checks and exported it from the evolution runner module.
- Added unit tests for valid configs, schema violations, and descriptor edge cases.
