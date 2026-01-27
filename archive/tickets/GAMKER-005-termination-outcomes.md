# GAMKER-005: Termination and Outcome Evaluation

## Goal
Add termination checks and outcome evaluation with minimal event logging hooks.

## Scope
- Provide a termination evaluation helper that checks conditions and computes per-agent outcomes.
- Provide optional per-agent scoring evaluation at termination.
- Provide minimal event stream helpers to record state updates and terminal outcomes.

## Assumptions (revised)
- The game kernel is implemented in JavaScript with `.d.ts` typings (no `.ts` files yet).
- There is no main game loop in the kernel; termination is exposed as a helper for callers.
- Outcome targeting rules:
  - `outcome.players` defaults to `all` when omitted.
  - `active` resolves to `state.turn.currentPlayer` when available.
  - Players not targeted by the outcome receive the inverse result for `win`/`lose`, or `draw` for `draw`.

## File list it expects to touch
- `src/game-kernel/termination.js`
- `src/game-kernel/termination.d.ts`
- `src/game-kernel/events.js`
- `src/game-kernel/events.d.ts`
- `src/game-kernel/index.js`
- `src/game-kernel/index.d.ts`
- `test/game-kernel/termination.test.mjs`

## Out of scope
- Advanced analytics or external persistence
- UI rendering or visualization
- Action legality or scheduler changes
- Integrating termination checks into a game loop (not yet present in kernel)

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/game-kernel/termination.test.mjs`

### Invariants that must remain true
- Termination evaluation is deterministic given the same state and RNG seed.
- Outcomes are reported for every agent defined in the game.
- Event stream ordering is stable: state update events occur before terminal outcome events.

## Status
Completed (2026-01-27).

## Outcome
- Implemented `evaluateTermination` with outcome + scoring evaluation plus max-turns fallback.
- Added minimal event stream helpers for state updates and termination events.
- Added termination tests; no integration into a game loop because none exists yet.
