# MOTINEVO-09: Typed mutation operators in config schema

## Description
Replace the generic `OperatorGroup` definition in the evolution-operators JSON Schema with a typed operator enum that explicitly lists all 14 existing mutation/crossover operator kinds plus the 7 new effect-level operator kinds introduced by the motif architecture. This provides compile-time validation of operator configuration and prevents typos or invalid operator names.

## Files to Touch
- `schemas/config/evolution-operators.schema.json`
- `configs/evolution-operators.json` (update if needed to match new schema)

## Out of Scope
- New operator implementations — handled in MOTINEVO-13
- `motifMining` config — handled in MOTINEVO-10
- Runner schema changes — handled in MOTINEVO-10

## Acceptance Criteria

### Tests That Must Pass
- A config with an unknown/misspelled operator name fails schema validation
- The existing `configs/evolution-operators.json` passes validation against the updated schema
- All 14 existing operator kinds are present in the enum
- All 7 new operator kinds (`effect-insert`, `effect-delete`, `effect-param-tweak`, `effect-kind-swap`, `effect-reorder`, `action-add-small`, `motif-inject`) are present in the enum
- `npm run test:unit` passes

### Invariants That Must Remain True
- Existing operator configurations remain valid without modification (or minimal update)
- The schema structure is consistent with other config schemas in the project
- `additionalProperties: false` is enforced where appropriate

## Dependencies
- Depends on: none
- Blocks: MOTINEVO-13
