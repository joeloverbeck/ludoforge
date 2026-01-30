# AGEENS-14: Deduplicate metric-id enum via shared JSON Schema

**Status**: TODO

**Goal**: Eliminate triple-maintenance of the metric ID list by making both schema enum fields reference a single shared JSON Schema definition.

**Description**: The canonical metric ID list is maintained in `schemas/shared/metric-ids.json`, but two JSON Schema files duplicate it as inline `enum` arrays. Every time a metric is added, all three must be updated in lockstep (as discovered during AGEENS-08). This ticket consolidates them so only one source of truth exists.

**Problem**: Three files contain the same ordered list of metric IDs:
- `schemas/shared/metric-ids.json` (canonical, loaded by `METRIC_IDS` at runtime)
- `schemas/config/map-elites.schema.json` (`$defs.DescriptorConfig.properties.id.enum`)
- `schemas/evolution-runner/runner-config.schema.json` (`$defs.MapElitesDescriptorConfig.properties.id.enum`)

**Proposed approach**:
1. Create `schemas/shared/metric-id.schema.json` wrapping the enum:
   ```json
   {
     "$schema": "https://json-schema.org/draft/2020-12/schema",
     "$id": "https://ludoforge.dev/schemas/shared/metric-id.schema.json",
     "type": "string",
     "enum": ["agency", "..."]
   }
   ```
   This file can be generated from or kept in sync with `metric-ids.json`, or `metric-ids.json` can be retired in favor of this schema (with `METRIC_IDS` reading the enum from it instead).

2. Modify `src/config/validator.js` to pre-register the shared schema via `ajv.addSchema()` before compiling dependent schemas.

3. Replace inline enums in both schema files with `{ "$ref": "https://ludoforge.dev/schemas/shared/metric-id.schema.json" }`.

4. Update `metric-ids-sync.test.mjs` if the source-of-truth file changes.

**Files to touch**:
- `schemas/shared/metric-id.schema.json` (new — shared enum schema)
- `schemas/shared/metric-ids.json` (possibly retire or derive from schema)
- `src/config/validator.js` (add `ajv.addSchema()` for shared schema)
- `src/evaluation-analytics/metric-ids.js` (update source path if canonical file changes)
- `schemas/config/map-elites.schema.json` (replace inline enum with `$ref`)
- `schemas/evolution-runner/runner-config.schema.json` (replace inline enum with `$ref`)
- `test/unit/evaluation-analytics/metric-ids-sync.test.mjs` (adapt assertions)

**Out of scope**:
- Adding new metric IDs (already done in AGEENS-08)
- Changing Ajv options beyond what's needed for `$ref` resolution

**Acceptance criteria**:
- [ ] Only one file contains the metric ID enum list
- [ ] Both schema files use `$ref` to the shared definition
- [ ] `METRIC_IDS` runtime value is unchanged
- [ ] All existing unit, integration, and E2E tests pass
- [ ] `metric-ids-sync.test.mjs` validates the single source of truth

**Dependencies**: AGEENS-08
