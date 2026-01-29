# MOTINEVO-09: Typed mutation operators in config schema

**Status: COMPLETED**

## Description
Replace the generic `OperatorGroup` definition in the evolution-operators JSON Schema with per-group typed operator enums that explicitly list all existing operator kinds plus the 7 new effect-level operator kinds introduced by the motif architecture. This provides schema-time validation of operator configuration and prevents typos or invalid operator names.

### Assumption corrections (vs original draft)
- The original ticket said "14 existing mutation/crossover operator kinds." Actual count: **14 mutation** + **1 crossover** (`subtree-swap`) + **1 repair** (`dsl-safety`) = **16 total** across 3 groups. Each group gets its own enum.
- The `weights` object also needs `propertyNames` constrained to the same enum so weight keys stay in sync with `enabled`.

## Files to Touch
- `schemas/config/evolution-operators.schema.json`
- `configs/evolution-operators.json` (no changes needed — existing config already valid)
- `test/unit/config-schemas.test.mjs` (add rejection tests for unknown operator names)

## Out of Scope
- New operator implementations — handled in MOTINEVO-13
- `motifMining` config — handled in MOTINEVO-10
- Runner schema changes — handled in MOTINEVO-10

## Acceptance Criteria

### Tests That Must Pass
- A config with an unknown/misspelled operator name in `enabled` fails schema validation
- A config with an unknown/misspelled key in `weights` fails schema validation
- The existing `configs/evolution-operators.json` passes validation against the updated schema
- All 14 existing mutation operator kinds are present in the mutation enum
- The 1 existing crossover kind (`subtree-swap`) is present in the crossover enum
- The 1 existing repair kind (`dsl-safety`) is present in the repair enum
- All 7 new operator kinds (`effect-insert`, `effect-delete`, `effect-param-tweak`, `effect-kind-swap`, `effect-reorder`, `action-add-small`, `motif-inject`) are present in the mutation enum
- `npm run test:unit` passes

### Invariants That Must Remain True
- Existing operator configurations remain valid without modification
- The schema structure is consistent with other config schemas in the project
- `additionalProperties: false` is enforced where appropriate

## Dependencies
- Depends on: none
- Blocks: MOTINEVO-13

## Outcome

### What changed vs originally planned
- The original ticket assumed a single unified enum of "14 existing mutation/crossover operator kinds." In reality there are 3 separate groups (mutation: 14, crossover: 1, repair: 1). The schema was split into `MutationGroup`, `CrossoverGroup`, and `RepairGroup`, each with its own typed enum (`MutationOperatorKind`, `CrossoverOperatorKind`, `RepairOperatorKind`).
- `propertyNames` constraints were added to `weights` objects (not mentioned in original ticket) to prevent weight keys from drifting out of sync with `enabled`.
- A pre-existing bug in `test/unit/config-schemas.test.mjs` was fixed: `readJson` paths used `../../../` (3 levels up) but the file is at depth 2 from project root, so `../../` is correct.
- A pre-existing Ajv `$id` collision in rejection tests was fixed by using fresh Ajv instances per test.

### Files modified
- `schemas/config/evolution-operators.schema.json` — replaced generic `OperatorGroup` with typed per-group definitions
- `test/unit/config-schemas.test.mjs` — fixed path bug, fixed Ajv collision, added 8 new tests
- `configs/evolution-operators.json` — no changes needed (existing config already valid)
