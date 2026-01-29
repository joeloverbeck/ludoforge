# MOTINEVO-05: applyEffect returns structured trace data

**Status: COMPLETED**

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

## Outcome

### What was changed
- **`src/game-kernel/effects.js`**: `applyEffect()` now returns `appliedEffect` on success — a record with `kind`, `target` (ResolvedRef with `kind`, `id`, `scope`), and `value` (for set) or `amount` (for inc/dec). On failure or non-variable targets, `appliedEffect` is absent, preserving backward compatibility.
- **`src/game-kernel/triggers.js`**: `applyTriggers()` now collects an `appliedEffects` array from all fired trigger effects, each decorated with `source: "trigger"`. Returned in all success paths (empty array when no triggers match).
- **`src/game-kernel/effects.d.ts`**: Added `ResolvedRef`, `AppliedEffect` interfaces; extended `EffectResult` with optional `appliedEffect`.
- **`src/game-kernel/triggers.d.ts`**: Extended `TriggerResult` with optional `appliedEffects` array.
- **`test/unit/game-kernel/effect-trace.test.mjs`**: 10 new tests covering trace data emission for both functions.

### Versus originally planned
Implementation matched the ticket exactly. No assumptions needed correction — the ticket accurately described the current code structure and caller patterns. No breaking changes to public APIs; the return shape extensions are purely additive.
