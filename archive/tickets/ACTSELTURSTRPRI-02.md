# ACTSELTURSTRPRI-02: Add `start_round` / `end_round` trigger events

**Status: COMPLETED**

## What

Add `start_round` and `end_round` to the trigger event enum in both JSON Schema and TypeScript types. Fire `end_round` triggers at the round boundary (just before the round counter increments) and `start_round` triggers just after the round counter increments, inside `advanceTurnPhase`. Add `clearFlags(state, "round")` at round boundary if flags support a `"round"` duration.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"start_round"`, `"end_round"` to `TriggerDef.event` enum; add `"round"` to flag duration enum
- `src/dsl/types.ts` — add `"start_round"` and `"end_round"` to `TriggerDef.event` union type
- `src/game-kernel/scheduler.js` — in `advanceTurnPhase`, detect round boundary (`nextRound !== state.turn.round`), fire `end_round` triggers before updating state, fire `start_round` triggers after updating state, clear round-duration flags
- `src/game-kernel/triggers.js` — no code change expected (generic event dispatch), but verify `start_round`/`end_round` events flow through correctly

## Out of scope

- New scheduler types (`priority_queue`, `token_holder`, etc.)
- New effect kinds (`conditional`, etc.)
- Mutation operators that use these trigger events
- `start_turn` / `end_turn` trigger changes (already exist)

## Acceptance criteria

- Test: A trigger with `event: "start_round"` fires at the beginning of each new round ✅
- Test: A trigger with `event: "end_round"` fires at the end of each completed round ✅
- Test: `end_round` fires before `start_round` (ordering) ✅
- Test: `end_round` trigger effects can modify state (e.g., reset a variable) before the new round ✅
- Test: `start_round` trigger effects see the updated round number ✅
- Test: Triggers with conditions on `start_round` only fire when condition is true ✅
- Test: In a 2-player game, round triggers fire once per full cycle (not once per player turn) ✅
- Invariant: Schema validates game definitions using `start_round`/`end_round` triggers ✅
- Invariant: `tsc -p tsconfig.json` passes ✅
- Invariant: `npm run test:unit` passes ✅

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking in state) ✅ Already implemented

## Outcome

### What was actually changed vs originally planned

**Aligned with plan:**
- Added `"start_round"` and `"end_round"` to `TriggerDef.event` enum in JSON Schema and TypeScript types
- Modified `advanceTurnPhase()` in scheduler.js to detect round boundaries and fire `end_round` before state update and `start_round` after state update
- Confirmed triggers.js needed no changes (generic event dispatch handles new events transparently)
- Added `clearFlags(state, "round")` at round boundary

**Additional change beyond ticket scope (minor):**
- Added `"round"` to the `set_flag` effect's `duration` enum in JSON Schema — the ticket mentioned `clearFlags(state, "round")` "if flags support a round duration" but didn't explicitly list the schema change for the duration enum. This was necessary to make round-scoped flags schema-valid.

**No discrepancies found in ticket assumptions.** All file paths, function names, and behavioral expectations were accurate.

### Files modified
- `schemas/dsl/game-definition.v1.json` — added 2 trigger events + 1 flag duration value
- `src/dsl/types.ts` — added 2 trigger event variants
- `src/game-kernel/scheduler.js` — added round boundary detection with end_round/start_round trigger firing and round flag clearing

### Tests added
- 8 new tests in `test/unit/game-kernel/scheduler.test.mjs` under "round triggers" describe block
- All 999 unit tests pass, 0 failures
