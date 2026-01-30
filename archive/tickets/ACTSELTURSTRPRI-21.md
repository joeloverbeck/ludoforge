# ACTSELTURSTRPRI-21: Add queue effects (`queue_push`, `queue_pop`) (Wave 3)

**Status**: Completed

## What

Add two new effect kinds for FIFO queue semantics on ordered zones:

1. **`queue_push`**: Appends a token to the end of an ordered zone. Schema: `{ kind: "queue_push", target: Ref, toZone: string }`.
2. **`queue_pop`**: Removes and returns the first token from an ordered zone, optionally moving it to another zone or destroying it. Schema: `{ kind: "queue_pop", fromZone: string, toZone?: string }`.

These enable action-queue mechanics where players plan actions into a queue, then actions execute from the front.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `queue_push` and `queue_pop` to Effect oneOf
- `src/dsl/types.ts` — add both variants to Effect union
- `src/game-kernel/effect-application.js` — add routing for both effects
- `src/game-kernel/zone-effects.js` — add `applyQueuePush` and `applyQueuePop` helpers (corrected from ticket's original `token-effects.js` — these are zone-centric operations matching the `applyShuffle` pattern)

## Assumption corrections

- **Original**: ticket listed `src/game-kernel/token-effects.js` for the helpers. **Corrected**: queue operations are zone-centric (like `shuffle`), so they belong in `src/game-kernel/zone-effects.js`, following the established codebase pattern.
- **`queue_push`** targets a token ref and a destination zone (append to end).
- **`queue_pop`** targets a source zone; the first token is removed. If `toZone` is provided, the token moves there; otherwise, the token is destroyed.

## Out of scope

- Deque semantics (front push, back pop)
- Priority queue data structures
- Action queue scheduling logic (that's game design, not kernel)

## Acceptance criteria

- Test: `queue_push` appends token to end of ordered zone
- Test: `queue_pop` removes and returns first token from ordered zone
- Test: `queue_pop` with `toZone` moves the popped token to the target zone
- Test: `queue_pop` without `toZone` destroys the popped token
- Test: `queue_pop` on empty zone is a no-op or returns error
- Test: FIFO ordering preserved: push A, push B, pop → A, pop → B
- Invariant: Token count conservation (push adds, pop removes/moves)
- Invariant: Schema validates both effect kinds
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (uses existing zone and token infrastructure)

## Outcome

### What changed vs originally planned

- **File location corrected**: The ticket originally listed `src/game-kernel/token-effects.js` for the helpers. Queue operations are zone-centric (like `shuffle`), so `applyQueuePush` and `applyQueuePop` were implemented in `src/game-kernel/zone-effects.js` instead.
- All other planned changes matched the original scope exactly.

### Files modified

| File | Change |
|------|--------|
| `schemas/dsl/game-definition.v1.json` | Added `queue_push` and `queue_pop` to Effect oneOf (2 new schema entries) |
| `src/dsl/types.ts` | Added 2 new Effect union variants |
| `src/game-kernel/zone-effects.js` | Added `applyQueuePush()` and `applyQueuePop()` with import of shared helpers |
| `src/game-kernel/effect-application.js` | Added import and routing for both new effect kinds |
| `docs/architecture/simulation-engine.md` | Updated effect kinds list and added dispatch documentation |

### New tests

| Test file | Tests | Purpose |
|-----------|-------|---------|
| `test/unit/game-kernel/queue-effects.test.mjs` | 15 tests (6 push, 9 pop) | Covers all acceptance criteria: append order, FIFO semantics, per_player zones, destroy-on-pop, move-on-pop, empty-zone no-op, error cases |

### Verification

- `tsc -p tsconfig.json`: passes
- `npm run test:unit`: 1390 tests, 0 failures
