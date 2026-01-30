# ACTSELTURSTRPRI-06: Add `token_holder` scheduler

## What

Add a `token_holder` scheduler type. The next player to act is the player whose per-player zone contains a specific token type. Schema additions to `TurnDef`: `holderOf: { tokenType: string, zone: string }`. Implement `advanceTokenHolder` in the scheduler. It scans all per-player zone instances for the specified token type and selects the owning player.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"token_holder"` to `TurnDef.scheduler` enum; add conditional `holderOf` object with `tokenType` (string) and `zone` (string) fields
- `src/dsl/types.ts` — add `"token_holder"` to `TurnDef.scheduler` union; add `holderOf?: { tokenType: string; zone: string }` to `TurnDef`
- `src/game-kernel/scheduler.js` — add `advanceTokenHolder(definition, state)` function; update `advanceTurnPhase` to dispatch to it; function scans per-player zones to find which player holds the specified token type
- `src/game-kernel/scheduler.d.ts` — update type declarations

## Out of scope

- `priority_queue` scheduler (ACTSELTURSTRPRI-05)
- `simultaneous`, `random_draw`, `reactive` schedulers (Wave 2/3)
- Mutation operators for scheduler
- Token transfer mechanics (move toPlayer is ACTSELTURSTRPRI-04)

## Acceptance criteria

- Test: Player holding the specified token type acts; other player(s) do not
- Test: After token is moved to another player's zone, that player acts next
- Test: If no player holds the token (e.g., token in global zone), scheduler returns error or selects fallback
- Test: Multiple tokens of the type exist → player with any instance acts (first found)
- Test: Phase cycling works within token_holder turns
- Test: Works correctly with `move` + `toPlayer` to transfer the token
- Invariant: Exactly one player holds the scheduling token at any time (game design constraint, not enforced by scheduler)
- Invariant: Schema validates definitions using `token_holder` scheduler
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking)
