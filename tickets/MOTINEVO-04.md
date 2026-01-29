# MOTINEVO-04: Add trace fields to TrajectoryStep schema

## Description
Extend the `$defs.TrajectoryStep` in the simulation-result JSON Schema with three new required fields: `stateHash` (string), `bindings` (object), and `appliedEffects` (array of AppliedEffect). Define new `$defs` for `AppliedEffect`, `ResolvedRef`, and `BindingValue` to support the trace-based architecture that enables LTS construction and motif mining.

## Files to Touch
- `schemas/simulation-engine/simulation-result.schema.json`

## Out of Scope
- Engine code that produces these fields — handled in MOTINEVO-05, 06, 07
- LTS builder — handled in MOTINEVO-11
- Motif mining — handled in MOTINEVO-12

## Acceptance Criteria

### Tests That Must Pass
- A TrajectoryStep missing `stateHash` fails Ajv validation
- A TrajectoryStep missing `bindings` fails Ajv validation
- A TrajectoryStep missing `appliedEffects` fails Ajv validation
- A complete TrajectoryStep with all trace fields passes validation
- `AppliedEffect` requires `kind` (string), `target` (ResolvedRef), and `source` (enum: `"cost"`, `"effect"`, `"trigger"`)
- `ResolvedRef` requires `kind` (enum: `"var"`, `"token"`, `"zone"`, `"player"`) and `id` (string)
- `npm run test:unit` passes

### Invariants That Must Remain True
- All existing TrajectoryStep fields remain unchanged
- The schema is backward-compatible in structure (new fields are additive)
- `additionalProperties` rules are consistent with existing schema patterns

## Dependencies
- Depends on: none
- Blocks: MOTINEVO-05
