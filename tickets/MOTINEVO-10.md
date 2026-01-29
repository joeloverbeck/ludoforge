# MOTINEVO-10: Add motifMining config to runner schema

## Description
Add an optional `motifMining` configuration object to the evolution-runner JSON Schema. This config controls the motif mining pipeline parameters: whether mining is enabled, elite selection strategy, n-gram sizes, support thresholds, and RNG seed.

## Files to Touch
- `schemas/config/evolution-runner.schema.json`

## Out of Scope
- Runtime code that reads this config — handled in MOTINEVO-12
- Operator config changes — handled in MOTINEVO-09

## Acceptance Criteria

### Tests That Must Pass
- A valid `motifMining` config object passes schema validation with fields:
  - `enabled` (boolean)
  - `eliteSelection` (object with `perNicheTopK` int, `globalTopK` int)
  - `minSupport` (integer >= 1)
  - `maxMotifLength` (integer >= 2)
  - `ngramSizes` (array of integers)
  - `seed` (integer)
- `additionalProperties: false` rejects unknown fields inside `motifMining`
- Omitting `motifMining` entirely is valid (it's optional)
- Existing `configs/evolution-runner.json` still passes validation
- `npm run test:unit` passes

### Invariants That Must Remain True
- All existing runner config fields remain unchanged
- The `motifMining` object is optional (default: mining disabled)
- Schema follows project conventions for config schemas

## Dependencies
- Depends on: none
- Blocks: none
