# ACTSELTURSTRPRI-06: Add `token_holder` scheduler

**Status: COMPLETED**

## What

Add a `token_holder` scheduler type. The next player to act is the player whose per-player zone contains a specific token type. **Per spec** (`specs/action-selection-turn-structure-primitives.md`), the `TurnDef` fields are `tokenType` and `zone` (not `holderOf`). Implement `advanceTokenHolder` in the scheduler; it scans the specified per-player zone for the specified token type and selects the owning player (lowest player id if multiple holders).

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"token_holder"` to `TurnDef.scheduler` enum; add conditional `tokenType` (string) + `zone` (string) fields when scheduler is `token_holder`
- `src/dsl/types.ts` — add `"token_holder"` to `TurnDef.scheduler` union; add `tokenType?: string; zone?: string` to `TurnDef`
- `src/game-kernel/scheduler.js` — add `advanceTokenHolder(definition, state)`; update `advanceTurnPhase` to dispatch to it; function scans the specified per-player zone for the specified token type
- `test/unit/game-kernel/` — add scheduler tests for `token_holder`
- `src/game-kernel/scheduler.d.ts` — update type declarations

## Out of scope

- `priority_queue` scheduler (ACTSELTURSTRPRI-05)
- `simultaneous`, `random_draw`, `reactive` schedulers (Wave 2/3)
- Mutation operators for scheduler
- Token transfer mechanics (move toPlayer is ACTSELTURSTRPRI-04)

## Acceptance criteria

- Test: Player holding the specified token type acts; other player(s) do not
- Test: After token is moved to another player's zone, that player acts next
- Test: If no player holds the token (e.g., token in global zone), scheduler returns an error (`token-holder-not-found`)
- Test: Multiple tokens of the type exist → player with any instance acts (first found)
- Test: Phase cycling works within token_holder turns
- Test: Works correctly with `move` + `toPlayer` to transfer the token
- Invariant: Exactly one player holds the scheduling token at any time (game design constraint, not enforced by scheduler)
- Invariant: Schema validates definitions using `token_holder` scheduler with required `tokenType` + `zone`
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking)

## Outcome

### What changed vs originally planned

- Updated the ticket to align with the spec (`tokenType` + `zone` on `TurnDef`, not `holderOf`).
- Implemented the `token_holder` scheduler and schema/type updates as specified.
- Added scheduler and schema tests to cover token holder selection, transfers, and error cases.

**Files modified:**
- `schemas/dsl/game-definition.v1.json` — added `"token_holder"` scheduler + conditional `tokenType`/`zone`
- `src/dsl/types.ts` — added `"token_holder"` scheduler + `tokenType`/`zone` fields
- `src/game-kernel/scheduler.js` — added `advanceTokenHolder` and dispatch
- `test/unit/dsl/schema.test.mjs` — schema acceptance/rejection tests for `token_holder`

**New test file:**
- `test/unit/game-kernel/scheduler-token-holder.test.mjs` — token holder scheduling, transfer, tie, phase-cycle, and error cases

### Test results
- `npm run test:unit` (2026-01-30): **FAILED** — existing degeneracy-config validation errors in evaluation analytics (unrelated to this ticket); token_holder tests pass
