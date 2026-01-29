# DEGFILISS-001: Replace `rejectOn` with `policyByFlag` in schema + config

**Status:** Open
**Depends on:** None
**Blocks:** DEGFILISS-002, DEGFILISS-003, DEGFILISS-004

## Summary

Replace the `rejectOn` control surface with a `policyByFlag` model in the degeneracy config schema and default config file. This is the foundational change that all other tickets build upon.

## Files to Change

- `schemas/config/degeneracy.schema.json`
- `configs/degeneracy.json`
- `test/unit/evaluation-analytics/degeneracy.test.mjs` (update assertions on config shape)

## Out of Scope

- Runtime code in `degeneracy.js` consuming new schema (DEGFILISS-002)
- Runner config schema (DEGFILISS-003)
- Fitness penalty computation (DEGFILISS-004)

## Requirements

### Schema (`schemas/config/degeneracy.schema.json`)

1. Add required property `policyByFlag` — object mapping each flag name to `"reject" | "penalize" | "ignore"`.
2. Add required property `penalties` — object with per-flag weight params (numeric).
3. Add property `minStepsForNoChoices` — integer, default `10`.
4. Rename `flags` to `enabledFlags` in the schema.
5. Remove `rejectOn` from the schema entirely (clean break — old configs must fail validation).
6. Bump config version to `2`.

### Default Config (`configs/degeneracy.json`)

1. Replace `rejectOn` with `policyByFlag`:
   - `loop` → `"reject"`
   - `nonTerminating` → `"reject"`
   - `forcedMove` → `"penalize"`
   - `noChoices` → `"penalize"`
   - `dominantAction` → `"penalize"`
   - `trivialWin` → `"penalize"`
   - `stalemate` → `"penalize"`
2. Add `penalties` object with default weights for each penalize flag.
3. Add `minStepsForNoChoices: 10`.
4. Rename `flags` to `enabledFlags`.

### Tests

- Existing unit tests asserting old config shape must be updated to new shape.
- Add assertion that a config with `rejectOn` fails schema validation.

## Acceptance Criteria

- [ ] Schema requires `policyByFlag` (object mapping each flag to `"reject"|"penalize"|"ignore"`)
- [ ] Schema requires `penalties` object with per-flag weight params
- [ ] Schema includes `minStepsForNoChoices` (integer, default 10)
- [ ] Config renames `flags` to `enabledFlags`
- [ ] Config version bumped to 2
- [ ] Default: `loop`/`nonTerminating` → `"reject"`, all others → `"penalize"`
- [ ] Old configs with `rejectOn` fail validation (clean break)
- [ ] `npm run test:unit` passes
