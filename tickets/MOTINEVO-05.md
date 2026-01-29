# MOTINEVO-05: applyEffect returns structured trace data

## Description
Modify `applyEffect()` in `src/game-kernel/effects.js` to return `{ ok, appliedEffect }` where `appliedEffect` is a structured record containing the resolved target reference, effect kind, and applied values. Modify `applyTriggers()` in `src/game-kernel/triggers.js` to collect and return an `appliedEffects` array with `source: "trigger"` for each triggered effect. These changes provide the raw trace data needed by the simulation engine to build trajectory steps with full effect provenance.

## Files to Touch
- `src/game-kernel/effects.js`
- `src/game-kernel/triggers.js`

## Out of Scope
- `buildStep` changes — handled in MOTINEVO-06
- `loop.js` changes — handled in MOTINEVO-06
- Schema changes — done in MOTINEVO-04

## Acceptance Criteria

### Tests That Must Pass
- `applyEffect()` returns an object with `{ ok: boolean, appliedEffect: AppliedEffect }` where `appliedEffect` contains `kind`, `target` (as ResolvedRef), and applied values
- `applyTriggers()` returns an `appliedEffects` array where each entry has `source: "trigger"`
- All existing game-kernel unit tests remain green (callers handle new return shape)
- `npm run test:unit` passes

### Invariants That Must Remain True
- `applyEffect()` still correctly modifies game state (new return value is additive)
- `applyTriggers()` still correctly fires all matching triggers
- No mutation of input parameters (immutability preserved)
- Existing callers that destructure only `ok` continue to work

## Dependencies
- Depends on: MOTINEVO-04
- Blocks: MOTINEVO-06
