# ACTSELTURSTRPRI-05: Add `priority_queue` scheduler

**Status: COMPLETED**

## What

Add a `priority_queue` scheduler type. Instead of cycling players round-robin, the next player is the one with the minimum (or maximum) value of a specified per-player variable. Schema additions to `TurnDef`: `orderBy: { variable: string, direction: "asc" | "desc" }`. Implement `advancePriorityQueue` in the scheduler. The scheduler reads all per-player variable values, sorts, and picks the next player. Tie-breaking: lowest player ID wins.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"priority_queue"` to `TurnDef.scheduler` enum; add conditional `orderBy` object with `variable` (string) and `direction` (`"asc"` | `"desc"`) fields
- `src/dsl/types.ts` — add `"priority_queue"` to `TurnDef.scheduler` union; add `orderBy?: { variable: string; direction: "asc" | "desc" }` to `TurnDef`
- `src/game-kernel/scheduler.js` — add `advancePriorityQueue(definition, state)` function; update `advanceTurnPhase` to dispatch to it when `scheduler === "priority_queue"`; handle phases (same phase cycling as round_robin, but player selection differs)
- `src/game-kernel/scheduler.d.ts` — update type declarations
- `src/simulation-engine/turn-advance.js` — ensure `advanceAndCheck` handles the new scheduler result (may need no change if advanceTurnPhase returns same shape)

## Out of scope

- `token_holder` scheduler (ACTSELTURSTRPRI-06)
- `simultaneous`, `random_draw`, `reactive` schedulers (Wave 2/3)
- Round trigger firing (handled by ACTSELTURSTRPRI-02, but must integrate correctly)
- Mutation operators for scheduler swap

## Acceptance criteria

- Test: In a 2-player game with `priority_queue` / `asc` on variable `time`, player with lower `time` value acts next
- Test: After player acts and increments their `time`, the other player (now lower) acts next
- Test: Same player acts consecutively if their variable remains the minimum
- Test: Tie-breaking: equal variable values → lower player ID goes first
- Test: `desc` direction: player with highest value acts next
- Test: Phase cycling works correctly within priority_queue turns
- Test: Round boundary detection works (all players have acted → round increments)
- Test: Integration with `start_round`/`end_round` triggers
- Invariant: `advanceTurnPhase` returns `{ ok: true }` for valid priority_queue games
- Invariant: Schema validates definitions using `priority_queue` scheduler
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking)

## Outcome

### What changed vs originally planned

All planned changes were implemented as specified. No ticket corrections were needed — assumptions matched the codebase.

**Files modified:**
- `schemas/dsl/game-definition.v1.json` — added `"priority_queue"` to scheduler enum, added `orderBy` object property
- `src/dsl/types.ts` — added `"priority_queue"` to scheduler union, added `orderBy?` field to `TurnDef`
- `src/game-kernel/scheduler.js` — added `advancePriorityQueue` function, updated dispatch in `advanceTurnPhase`, added `_actedThisRound` Set persistence for round boundary tracking, added `turn` counter to `snapshotLoopState` to prevent false state-loop detection

**Files not modified (no changes needed):**
- `src/game-kernel/scheduler.d.ts` — public API signature of `advanceTurnPhase` is unchanged
- `src/simulation-engine/turn-advance.js` — already handles the return shape correctly

**New test file:**
- `test/unit/game-kernel/scheduler-priority-queue.test.mjs` — 14 tests covering all acceptance criteria plus edge cases

**Unplanned fixes:**
- `snapshotLoopState` in `scheduler.js` needed the `turn` counter added to prevent false state-loop detection when the same player acts in consecutive turns with identical variable/phase/round state (valid in priority_queue but not distinguishable without the turn counter).

### Test results
- 14/14 new priority_queue tests pass
- 21/21 existing scheduler tests pass (no regressions)
- 1098/1098 full unit test suite passes
- `tsc -p tsconfig.json` passes cleanly
