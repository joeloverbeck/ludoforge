# ACTSELTURSTRPRI-04: Extend `move` effect with `toPlayer` field

## What

Add an optional `toPlayer` field to the existing `move` effect. Valid values: `"self"`, `"opponent"`, `"next"`, `"previous"`. When `toPlayer` is set, `applyTokenMove` resolves the target player ID and moves the token to that player's instance of the `toZone`. This enables inter-player token transfer (e.g., passing an advantage token to an opponent).

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add optional `toPlayer` property (enum: `["self", "opponent", "next", "previous"]`) to the `move` effect variant
- `src/dsl/types.ts` — add `toPlayer?: "self" | "opponent" | "next" | "previous"` to the `move` variant in `Effect` union
- `src/game-kernel/token-effects.js` — extend `applyTokenMove` to resolve `toPlayer` to a numeric player ID using `context.playerId` and `definition.players.count`; use that player ID when targeting per-player zones
- `src/game-kernel/token-effects.d.ts` — update if types are declared

## Out of scope

- `transfer_token` as a separate effect kind (not needed; this extension covers it)
- `toPlayer` on `spawn` or `destroy` effects
- Multi-hop spatial movement
- New scheduler types

## Acceptance criteria

- Test: `move` with `toPlayer: "self"` moves token to acting player's zone (same as no `toPlayer`)
- Test: `move` with `toPlayer: "opponent"` in a 2-player game moves token to the other player's zone
- Test: `move` with `toPlayer: "next"` moves token to player (current + 1), wrapping around
- Test: `move` with `toPlayer: "previous"` moves token to player (current - 1), wrapping around
- Test: `move` without `toPlayer` works exactly as before (backward-compatible)
- Test: `move` with `toPlayer` targeting a global zone (non-per-player) ignores `toPlayer` or errors cleanly
- Invariant: Token count is conserved across move operations
- Invariant: Schema validates `move` effects with and without `toPlayer`
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None
