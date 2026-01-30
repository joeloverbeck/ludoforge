# ACTSELTURSTRPRI-17: Add `choose` effect (Wave 2)

## What

Add a new effect kind `choose` that presents the acting player with a choice between multiple effect branches. Schema: `{ kind: "choose", options: Effect[][], count: number }`. The player (or their agent policy in simulation) selects `count` option(s) from the available `options` array, and only those effects are applied. This enables mechanics like "choose one of these three bonuses".

In the simulation engine, the agent policy must handle `choose` effects by selecting from the options (e.g., randomly, heuristically, or via a dedicated choice policy).

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `choose` to Effect oneOf with `options` (array of Effect arrays) and `count` (integer, default 1)
- `src/dsl/types.ts` — add `{ kind: "choose"; options: Effect[][]; count?: number }` to Effect union
- `src/game-kernel/effect-application.js` — add `case "choose"` handler; in simulation context, delegates to agent policy for selection; applies selected option effects
- `src/simulation-engine/loop.js` — ensure agent policies can handle choice resolution

## Out of scope

- `set_turn_order` effect (ACTSELTURSTRPRI-16)
- `shuffle` effect (ACTSELTURSTRPRI-18)
- Human interface for choose (simulation agents only)
- Mutation operators for choose effects

## Acceptance criteria

- Test: `choose` with 2 options and `count: 1` applies exactly one option's effects
- Test: Agent policy selects deterministically with seeded RNG
- Test: `choose` with `count: 2` applies two distinct options
- Test: `choose` with 0 options is a no-op
- Test: Nested `choose` inside `conditional` works
- Invariant: Schema validates `choose` effects
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (independent effect kind)
