# ACTSELTURSTRPRI-18: Add `shuffle` effect (Wave 2)

## What

Add a new effect kind `shuffle` that randomises the order of items in a target. Primary target: an ordered zone's token list. Schema: `{ kind: "shuffle", target: Ref }` where `target` references a zone. Uses seeded RNG for deterministic results.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `shuffle` to Effect oneOf with `target` (Ref)
- `src/dsl/types.ts` — add `{ kind: "shuffle"; target: Ref }` to Effect union
- `src/game-kernel/effect-application.js` — add `case "shuffle"` handler; Fisher-Yates shuffle on the zone's token array using seeded RNG from context
- `src/game-kernel/token-effects.js` — optionally add `applyTokenShuffle` helper

## Out of scope

- Shuffling phase order (could be modeled but not required now)
- `set_turn_order` effect (ACTSELTURSTRPRI-16)
- `choose` effect (ACTSELTURSTRPRI-17)
- Dice rolling (different mechanic, similar RNG usage)

## Acceptance criteria

- Test: `shuffle` on an ordered zone randomises token order
- Test: Same seed produces identical shuffle result
- Test: Different seeds produce different orderings
- Test: Zone token count is preserved after shuffle
- Test: Shuffling an empty zone is a no-op
- Test: Shuffling a single-token zone is a no-op
- Invariant: Schema validates `shuffle` effects
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (independent effect kind)
