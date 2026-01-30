# ACTSELTURSTRPRI-18: Add `shuffle` effect (Wave 2)

**Status**: ✅ Completed

## What

Add a new effect kind `shuffle` that randomises the order of items in a target. Primary target: an ordered zone's token list. Schema: `{ kind: "shuffle", target: Ref }` where `target` references a zone. Uses seeded RNG for deterministic results.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `shuffle` to Effect oneOf with `target` (Ref)
- `src/dsl/types.ts` — add `{ kind: "shuffle"; target: Ref }` to Effect union
- `src/game-kernel/effect-application.js` — add `shuffle` handler with Fisher-Yates shuffle on the zone's token array using seeded RNG from context

## Assumptions corrected

- The ticket originally listed `src/game-kernel/token-effects.js` as an optional file to touch for an `applyTokenShuffle` helper. In practice, the shuffle handler was placed directly in `effect-application.js` alongside other non-token-target effects (`set_turn_order`, `choose`, etc.), since `shuffle` targets a zone ref, not a token ref. No changes to `token-effects.js` were needed.

## Out of scope

- Shuffling phase order (could be modeled but not required now)
- `set_turn_order` effect (ACTSELTURSTRPRI-16)
- `choose` effect (ACTSELTURSTRPRI-17)
- Dice rolling (different mechanic, similar RNG usage)

## Acceptance criteria

- ✅ Test: `shuffle` on an ordered zone randomises token order
- ✅ Test: Same seed produces identical shuffle result
- ✅ Test: Different seeds produce different orderings
- ✅ Test: Zone token count is preserved after shuffle
- ✅ Test: Shuffling an empty zone is a no-op
- ✅ Test: Shuffling a single-token zone is a no-op
- ✅ Invariant: Schema validates `shuffle` effects
- ✅ Invariant: `tsc -p tsconfig.json` passes
- ✅ Invariant: `npm run test:unit` passes (1298 tests, 0 failures)

## Dependencies

None (independent effect kind)

## Outcome

**What was actually changed vs originally planned:**

All three planned files were modified as expected:
1. **`schemas/dsl/game-definition.v1.json`** — Added `shuffle` variant to `Effect` oneOf with `{ kind: "shuffle", target: Ref }`.
2. **`src/dsl/types.ts`** — Added `{ kind: "shuffle"; target: Ref }` to the Effect union type.
3. **`src/game-kernel/effect-application.js`** — Added `applyShuffle()` function implementing Fisher-Yates shuffle with seeded RNG, plus dispatch in `applyEffect()`.

**Not changed** (deviation from ticket): `src/game-kernel/token-effects.js` was not modified. The shuffle logic lives in `effect-application.js` because it targets zones, not individual tokens — consistent with how `set_turn_order` and `choose` are handled.

**New test file**: `test/unit/game-kernel/shuffle-effect.test.mjs` — 9 tests covering all acceptance criteria plus error paths (non-zone target, unknown zone) and per-player zone support.
