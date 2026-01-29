# MOTINEVO-10: Add motifMining config to runner schema ✅ COMPLETED

## Description
Add an optional `motifMining` configuration object to the evolution-runner JSON Schema. This config controls the motif mining pipeline parameters: whether mining is enabled, elite selection strategy, n-gram sizes, support thresholds, and RNG seed.

## Files to Touch
- `schemas/evolution-runner/runner-config.v1.json` — add `motifMining` as an optional property inside `EvolutionConfig` (the `$defs.EvolutionConfig` definition)
- `test/unit/evolution-runner/schema.test.mjs` — add tests for the new `motifMining` block

### Assumption Corrections (discovered during reassessment)
- The original ticket targeted `schemas/config/evolution-runner.schema.json`, but that schema governs the file-level runner config (artifact paths, resume settings). The evolution parameters (mutation, crossover, repair) live in `schemas/evolution-runner/runner-config.v1.json` under `$defs.EvolutionConfig`. That is the correct target.
- The existing test file for this schema is `test/unit/evolution-runner/schema.test.mjs`, which validates against `runner-config.v1.json`.

## Out of Scope
- Runtime code that reads this config — handled in MOTINEVO-12
- Operator config changes — handled in MOTINEVO-09

## Acceptance Criteria

### Tests That Must Pass
- A valid `motifMining` config object passes schema validation when nested under `evolution` with fields:
  - `enabled` (boolean, required)
  - `eliteSelection` (object with `perNicheTopK` int >= 1, `globalTopK` int >= 1; required)
  - `minSupport` (integer >= 1, required)
  - `maxMotifLength` (integer >= 2, required)
  - `ngramSizes` (array of integers >= 1, minItems 1; required)
  - `seed` (integer, optional)
- `additionalProperties: false` rejects unknown fields inside `motifMining` and `eliteSelection`
- Omitting `motifMining` from `evolution` is valid (it's optional)
- Existing `configs/evolution-runner.json` still passes validation (it has no `evolution` block, which is itself optional)
- `npm run test:unit` passes

### Invariants That Must Remain True
- All existing runner config fields remain unchanged
- The `motifMining` object is optional within the optional `evolution` block
- Schema follows project conventions (strict additionalProperties, $defs for sub-objects)

## Dependencies
- Depends on: none
- Blocks: none

## Outcome

### What was actually changed
1. **`schemas/evolution-runner/runner-config.v1.json`** — Added `motifMining` optional property to `$defs.EvolutionConfig`, plus two new `$defs`: `MotifMiningConfig` and `EliteSelectionConfig`. Both use `additionalProperties: false` per project conventions.
2. **`test/unit/evolution-runner/schema.test.mjs`** — Added 13 tests covering acceptance of valid configs, optional seed, omission of motifMining, and rejection of: unknown properties, missing required fields, boundary violations on minSupport/maxMotifLength/ngramSizes/perNicheTopK/globalTopK.

### Vs originally planned
- The original ticket targeted `schemas/config/evolution-runner.schema.json` (the file-level runner config). This was incorrect — the evolution parameters live in `schemas/evolution-runner/runner-config.v1.json`. The ticket was corrected before implementation.
- All acceptance criteria met. All 437 unit tests pass.
