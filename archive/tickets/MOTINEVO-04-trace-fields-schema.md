# MOTINEVO-04: Add trace fields to TrajectoryStep schema

**Status: COMPLETED**

## Description
Extend the `$defs.TrajectoryStep` in the simulation-result JSON Schema with three new **optional** fields: `stateHash` (string), `bindings` (object), and `appliedEffects` (array of AppliedEffect). Define new `$defs` for `AppliedEffect`, `ResolvedRef`, and `BindingValue` to support the trace-based architecture that enables LTS construction and motif mining.

## Assumption Corrections (vs original ticket)
The original ticket specified these as **required** fields. This contradicts two facts:
1. The engine code that produces these fields is out of scope (MOTINEVO-05/06/07).
2. Existing tests (e.g., `simulation-result-schema.test.mjs`) run the engine and validate output against this schema — making them required would break `npm run test:unit`.
3. The ticket itself states "backward-compatible in structure (new fields are additive)".

**Resolution**: Fields are added as **optional** in the schema. A follow-up ticket (after MOTINEVO-05/06/07 land) should tighten them to required once the engine emits them. The acceptance criteria tests use hand-crafted schema-only validation (not engine output) to prove the type definitions are correct.

## Files to Touch
- `schemas/simulation-engine/simulation-result.schema.json`

## Out of Scope
- Engine code that produces these fields — handled in MOTINEVO-05, 06, 07
- LTS builder — handled in MOTINEVO-11
- Motif mining — handled in MOTINEVO-12
- Making the fields required — follow-up after engine emits them

## Acceptance Criteria

### Tests That Must Pass
- A complete TrajectoryStep with all trace fields passes validation
- `AppliedEffect` validates: requires `kind` (string), `target` (ResolvedRef), and `source` (enum: `"cost"`, `"effect"`, `"trigger"`)
- `ResolvedRef` validates: requires `kind` (enum: `"var"`, `"token"`, `"zone"`, `"player"`) and `id` (string)
- Invalid `AppliedEffect` (missing required sub-fields) fails validation
- Invalid `ResolvedRef` (bad `kind` enum) fails validation
- `bindings` values conform to `BindingValue` definition
- A TrajectoryStep without the new fields still passes (optional until engine emits them)
- `npm run test:unit` passes

### Invariants That Must Remain True
- All existing TrajectoryStep fields remain unchanged
- The schema is backward-compatible in structure (new fields are additive and optional)
- `additionalProperties` rules are consistent with existing schema patterns
- Existing engine-produced output continues to validate

## Dependencies
- Depends on: none
- Blocks: MOTINEVO-05

## Outcome
### What changed vs originally planned
- **Original**: Three new **required** fields (`stateHash`, `bindings`, `appliedEffects`) on `TrajectoryStep`.
- **Actual**: Three new **optional** fields. The engine does not yet produce them (MOTINEVO-05/06/07), so making them required would have broken all existing tests that validate engine output against this schema. A follow-up ticket should tighten them to required after the engine emits them.

### Files modified
- `schemas/simulation-engine/simulation-result.schema.json` — added `stateHash`, `bindings`, `appliedEffects` properties to `TrajectoryStep`; added `$defs` for `ResolvedRef`, `BindingValue`, `AppliedEffect`.

### Files created
- `test/unit/simulation-engine/trace-schema.test.mjs` — 24 tests validating the new schema types.

### Test results
- 382/382 unit tests pass (including 24 new trace schema tests).
