# ACTSELTURSTRPRI-20: Add `reactive` scheduler (Wave 3)

## What

Add a `reactive` scheduler type. Players do not take turns in a fixed order. Instead, the kernel continuously evaluates trigger conditions, and players act when their conditions are met (e.g., a timer expires). This supports interrupts and action-timer mechanics. Schema: `{ scheduler: "reactive" }`.

The reactive scheduler maintains an interrupt stack for resolving out-of-order actions. When multiple players' conditions are met simultaneously, resolution follows a priority system (by player ID or by action priority metadata).

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"reactive"` to `TurnDef.scheduler` enum
- `src/dsl/types.ts` — add `"reactive"` to scheduler union
- `src/game-kernel/scheduler.js` — add `advanceReactive(definition, state)` function with condition evaluation and interrupt stack
- `src/simulation-engine/loop.js` — handle reactive scheduling flow (evaluate conditions each step, select eligible players)

## Out of scope

- Wave 1/2 schedulers (separate tickets)
- Complex interrupt priority systems beyond basic ordering
- Mutation operators for reactive scheduler

## Acceptance criteria

- Test: Player with a met condition (e.g., timer variable == 0) acts; others wait
- Test: Multiple eligible players resolve in player ID order
- Test: Interrupt stack resolves LIFO for nested reactions
- Test: Players with `metadata.speed: "reaction"` can act out of turn
- Test: No eligible players → step advances time (e.g., decrements timers)
- Invariant: Schema validates definitions using `reactive` scheduler
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking)
