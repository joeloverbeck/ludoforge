# ACTSELTURSTRPRI-21: Add queue effects (`queue_push`, `queue_pop`) (Wave 3)

## What

Add two new effect kinds for FIFO queue semantics on ordered zones:

1. **`queue_push`**: Appends a token to the end of an ordered zone. Schema: `{ kind: "queue_push", target: Ref, toZone: string }`.
2. **`queue_pop`**: Removes and returns the first token from an ordered zone, optionally moving it to another zone or destroying it. Schema: `{ kind: "queue_pop", fromZone: string, toZone?: string }`.

These enable action-queue mechanics where players plan actions into a queue, then actions execute from the front.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `queue_push` and `queue_pop` to Effect oneOf
- `src/dsl/types.ts` — add both variants to Effect union
- `src/game-kernel/effect-application.js` — add handlers for both effects
- `src/game-kernel/token-effects.js` — add `applyQueuePush` and `applyQueuePop` helpers

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
