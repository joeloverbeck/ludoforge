# DEGFILISS-001: Replace `rejectOn` with `policyByFlag` in schema + config

**Status:** Completed
**Depends on:** None
**Blocks:** DEGFILISS-002, DEGFILISS-003, DEGFILISS-004

## Summary

Replace the `rejectOn` control surface with a `policyByFlag` model in the degeneracy config schema and default config file. This is the foundational change that all other tickets build upon.

## Files to Change

- `schemas/config/degeneracy.schema.json`
- `configs/degeneracy.json`
- `src/evaluation-analytics/degeneracy.js` (minimal: read `enabledFlags` instead of `flags`, derive `rejectFlags` from `policyByFlag` instead of `rejectOn`)
- `src/evaluation-analytics/feature-vector.js` (minimal: read `enabledFlags` instead of `flags`)
- `src/evaluation-analytics/degeneracy.d.ts` (no change needed — types already correct)
- `test/unit/evaluation-analytics/degeneracy.test.mjs` (update assertions on config shape, add schema validation tests)
- `test/unit/evaluation-analytics/feature-vector.test.mjs` (update config field name in assertion)

## Out of Scope

- Full runtime refactor of `degeneracy.js` detection logic (DEGFILISS-002)
- Runner config schema (DEGFILISS-003)
- Fitness penalty computation (DEGFILISS-004)

## Assumptions (verified against codebase)

- The `DegeneracyFlag` enum uses **kebab-case**: `loop`, `stalemate`, `forced-move`, `dominant-action`, `trivial-win`, `no-choices`, `non-terminating`. All `policyByFlag` keys must use these exact names.
- The runtime (`degeneracy.js`) reads `DEFAULT_DEGENERACY_CONFIG?.flags` (line 106-108) and `DEFAULT_DEGENERACY_CONFIG?.rejectOn` (line 111-113), both with fallbacks. Renaming `flags` → `enabledFlags` and removing `rejectOn` in the config requires a **minimal** runtime update to read the new field names. This does NOT change the public API (`detectDegeneracy`, `applyDegeneracyFilters`, `DEFAULT_DEGENERACY_FILTERS`, `DEFAULT_DEGENERACY_THRESHOLDS`).
- The test at lines 141-147 directly reads `configs/degeneracy.json` and asserts `config.rejectOn[0]` — this must be updated to validate the new config shape.

## Requirements

### Schema (`schemas/config/degeneracy.schema.json`)

1. Add required property `policyByFlag` — object mapping each flag name (kebab-case) to `"reject" | "penalize" | "ignore"`.
2. Add required property `penalties` — object with per-flag weight params (numeric).
3. Add property `minStepsForNoChoices` — integer, default `10`.
4. Rename `flags` to `enabledFlags` in the schema.
5. Remove `rejectOn` from the schema entirely (clean break — old configs must fail validation).
6. Bump config version to `2`.

### Default Config (`configs/degeneracy.json`)

1. Replace `rejectOn` with `policyByFlag`:
   - `loop` → `"reject"`
   - `non-terminating` → `"reject"`
   - `forced-move` → `"penalize"`
   - `no-choices` → `"penalize"`
   - `dominant-action` → `"penalize"`
   - `trivial-win` → `"penalize"`
   - `stalemate` → `"penalize"`
2. Add `penalties` object with default weights for each penalize flag.
3. Add `minStepsForNoChoices: 10`.
4. Rename `flags` to `enabledFlags`.

### Runtime (`src/evaluation-analytics/degeneracy.js`) — minimal change

1. Read `enabledFlags` instead of `flags` from loaded config.
2. Derive `rejectFlags` from `policyByFlag` (entries where value is `"reject"`) instead of reading `rejectOn` directly.
3. No public API changes.

### Tests

- Existing unit tests asserting old config shape must be updated to new shape.
- Add assertion that a config with `rejectOn` fails schema validation.
- Add assertion that new config validates against the new schema.

## Acceptance Criteria

- [x] Schema requires `policyByFlag` (object mapping each flag to `"reject"|"penalize"|"ignore"`)
- [x] Schema requires `penalties` object with per-flag weight params
- [x] Schema includes `minStepsForNoChoices` (integer, default 10)
- [x] Config renames `flags` to `enabledFlags`
- [x] Config version bumped to 2
- [x] Default: `loop`/`non-terminating` → `"reject"`, all others → `"penalize"`
- [x] Old configs with `rejectOn` fail validation (clean break)
- [x] Runtime reads new field names with backward-compatible fallbacks
- [x] `npm run test:unit` passes

## Outcome

### What changed vs originally planned

The original ticket scoped changes to only 3 files (schema, config, test). During implementation, the following discrepancies were found and corrected in the ticket before coding:

1. **Flag naming**: The ticket used camelCase (`nonTerminating`, `forcedMove`) for `policyByFlag` keys, but the `DegeneracyFlag` enum uses kebab-case (`non-terminating`, `forced-move`). Corrected to kebab-case.

2. **Additional runtime files needed**: Renaming `flags` → `enabledFlags` in the config required minimal updates in two runtime files (`degeneracy.js` and `feature-vector.js`) that read `config.flags`. The ticket originally declared runtime changes "out of scope" but these field-name reads are config-shape dependencies, not the full runtime refactor deferred to DEGFILISS-002.

3. **Additional test file**: `feature-vector.test.mjs` had an assertion on `config.flags` that needed updating to `config.enabledFlags`.

### Files actually changed (6 files)

| File | Change |
|------|--------|
| `schemas/config/degeneracy.schema.json` | Replaced `flags`/`rejectOn` with `enabledFlags`/`policyByFlag`/`penalties`/`minStepsForNoChoices`; added `DegeneracyPolicy` def; bumped version minimum to 2 |
| `configs/degeneracy.json` | Replaced `rejectOn` with `policyByFlag` (loop+non-terminating=reject, rest=penalize); added `penalties` with default weights; added `minStepsForNoChoices: 10`; renamed `flags` → `enabledFlags`; bumped to version 2 |
| `src/evaluation-analytics/degeneracy.js` | Read `enabledFlags` instead of `flags`; added `deriveRejectFlags()` to compute reject set from `policyByFlag` instead of `rejectOn` |
| `src/evaluation-analytics/feature-vector.js` | Read `enabledFlags` instead of `flags` |
| `test/unit/evaluation-analytics/degeneracy.test.mjs` | Updated filter tests for new default reject policy (only loop+non-terminating); added 3 schema validation tests (v2 validates, old config rejects, missing policyByFlag rejects) |
| `test/unit/evaluation-analytics/feature-vector.test.mjs` | Updated assertion from `config.flags` to `config.enabledFlags` |

### Public API preserved

`detectDegeneracy`, `applyDegeneracyFilters`, `DEFAULT_DEGENERACY_THRESHOLDS`, `DEFAULT_DEGENERACY_FILTERS` — all signatures and types unchanged. The `rejectFlags` array inside `DEFAULT_DEGENERACY_FILTERS` now contains only `["loop", "non-terminating"]` (derived from `policyByFlag`) instead of all 7 flags.
