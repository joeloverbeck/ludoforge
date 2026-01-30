# ACTSELTURSTRPRI-05: Add `priority_queue` scheduler

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
