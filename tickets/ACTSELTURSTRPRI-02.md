# ACTSELTURSTRPRI-02: Add `start_round` / `end_round` trigger events

## What

Add `start_round` and `end_round` to the trigger event enum in both JSON Schema and TypeScript types. Fire `end_round` triggers at the round boundary (just before the round counter increments) and `start_round` triggers just after the round counter increments, inside `advanceTurnPhase`. Add `clearFlags(state, "round")` at round boundary if flags support a `"round"` duration.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"start_round"`, `"end_round"` to `TriggerDef.event` enum
- `src/dsl/types.ts` — add `"start_round"` and `"end_round"` to `TriggerDef.event` union type
- `src/game-kernel/scheduler.js` — in `advanceTurnPhase`, detect round boundary (`nextRound !== state.turn.round`), fire `end_round` triggers before updating state, fire `start_round` triggers after updating state
- `src/game-kernel/triggers.js` — no code change expected (generic event dispatch), but verify `start_round`/`end_round` events flow through correctly

## Out of scope

- New scheduler types (`priority_queue`, `token_holder`, etc.)
- New effect kinds (`conditional`, etc.)
- Mutation operators that use these trigger events
- `start_turn` / `end_turn` trigger changes (already exist)

## Acceptance criteria

- Test: A trigger with `event: "start_round"` fires at the beginning of each new round
- Test: A trigger with `event: "end_round"` fires at the end of each completed round
- Test: `end_round` fires before `start_round` (ordering)
- Test: `end_round` trigger effects can modify state (e.g., reset a variable) before the new round
- Test: `start_round` trigger effects see the updated round number
- Test: Triggers with conditions on `start_round` only fire when condition is true
- Test: In a 2-player game, round triggers fire once per full cycle (not once per player turn)
- Invariant: Schema validates game definitions using `start_round`/`end_round` triggers
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking in state)
