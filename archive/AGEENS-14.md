# AGEENS-14: Deduplicate metric-id enum via shared JSON Schema

**Status**: Done

**Goal**: Eliminate triple-maintenance of the metric ID list by making both schema enum fields reference a single shared JSON Schema definition.

**Description**: The canonical metric ID list is currently embedded in multiple places (a shared JSON list plus two schema enums). Every time a metric is added, multiple files must be updated in lockstep (as discovered during AGEENS-08). This ticket consolidates schema references so there is a single shared enum definition.

**Assumptions to reassess**:
- `configs/metrics-core.json` also embeds the metric ID list (`enabled` + `featureOrder`) and is asserted by `metric-ids-sync.test.mjs`. That config list must remain aligned but is not a schema enum.
- Config validation uses two Ajv entrypoints: `src/config/validator.js` for config files and `src/evolution-runner/config.js` for runner configs. Any shared `$ref` schema must be registered in both.

**Problem**: Three files contain the same ordered list of metric IDs:
- `schemas/shared/metric-ids.json` (legacy canonical list, loaded by `METRIC_IDS` at runtime)
- `schemas/config/map-elites.schema.json` (`$defs.DescriptorConfig.properties.id.enum`)
- `schemas/evolution-runner/runner-config.schema.json` (`$defs.MapElitesDescriptorConfig.properties.id.enum`)

**Proposed approach**:
1. Create `schemas/shared/metric-id.schema.json` wrapping the enum as the canonical source:
   ```json
   {
     "$schema": "https://json-schema.org/draft/2020-12/schema",
     "$id": "https://ludoforge.dev/schemas/shared/metric-id.schema.json",
     "type": "string",
     "enum": ["agency", "..."]
   }
   ```
   Retire `metric-ids.json` and have `METRIC_IDS` read from the enum in this schema.

2. Modify `src/config/validator.js` and `src/evolution-runner/config.js` to pre-register the shared schema via `ajv.addSchema()` before compiling dependent schemas.

3. Replace inline enums in both schema files with `{ "$ref": "https://ludoforge.dev/schemas/shared/metric-id.schema.json" }`.

4. Update `metric-ids-sync.test.mjs` to read the shared schema enum and assert `$ref` wiring.

**Files to touch**:
- `schemas/shared/metric-id.schema.json` (new — shared enum schema)
- `schemas/shared/metric-ids.json` (retire)
- `src/config/validator.js` (add `ajv.addSchema()` for shared schema)
- `src/evolution-runner/config.js` (add `ajv.addSchema()` for shared schema)
- `src/evaluation-analytics/metric-ids.js` (update source path if canonical file changes)
- `schemas/config/map-elites.schema.json` (replace inline enum with `$ref`)
- `schemas/evolution-runner/runner-config.schema.json` (replace inline enum with `$ref`)
- `test/unit/evaluation-analytics/metric-ids-sync.test.mjs` (adapt assertions)

**Out of scope**:
- Adding new metric IDs (already done in AGEENS-08)
- Changing Ajv options beyond what's needed for `$ref` resolution

**Acceptance criteria**:
- [ ] Only one schema file contains the metric ID enum list used by validators and `METRIC_IDS`
- [ ] Both schema files use `$ref` to the shared definition
- [ ] `METRIC_IDS` runtime value is unchanged
- [ ] All existing unit, integration, and E2E tests pass
- [ ] `metric-ids-sync.test.mjs` validates the shared schema enum and `$ref` wiring (configs remain aligned)

**Dependencies**: AGEENS-08

## Outcome
- Implemented a shared metric ID schema at `schemas/shared/metric-id.schema.json` and retired `schemas/shared/metric-ids.json`.
- Updated schema enum usage in `map-elites.schema.json` and `runner-config.schema.json` to `$ref` the shared schema.
- Registered the shared schema in both config validators (`src/config/validator.js` and `src/evolution-runner/config.js`) and updated tests to load the shared schema when compiling.
