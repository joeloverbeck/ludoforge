# ACTSELTURSTRPRI-20: Add `reactive` scheduler (Wave 3)

**Status**: ✅ Completed

## What

Add a `reactive` scheduler type. Players do not take turns in a fixed order. Instead, the kernel evaluates per-player conditions each turn and selects the first eligible player (by player ID). If no player is eligible, the turn's `stepEffects` are applied to advance game time (e.g., decrement timers), and the scheduler re-evaluates. Schema: `{ scheduler: "reactive" }`.

The reactive scheduler uses condition evaluation to determine eligible players. When multiple players' conditions are met simultaneously, the player with the lowest ID acts first. Each advance checks all players and selects one — this is a scheduler strategy, not a fundamentally different simulation loop.

## Corrected assumptions (vs. original ticket)

1. **Strategy functions** live in `src/game-kernel/scheduler-strategies.js`, not `scheduler.js`. The `scheduler.js` file is the orchestrator that delegates to strategies.
2. **`src/simulation-engine/loop.js`** does NOT need changes. The reactive scheduler integrates into the existing non-simultaneous loop — it just picks the next player differently via `advanceReactive()`.
3. **Interrupt stack / LIFO** and `metadata.speed: "reaction"` out-of-turn actions are **out of scope**. These belong to mechanic #13 (Interrupts) and require deep simulation-loop changes. The reactive scheduler focuses on condition-based player selection only.
4. **Scheduler-swap mutation operator** (`scheduler-swap.js`) needs to include `"reactive"` in its `SCHEDULER_TYPES` array.

## Files touched

- `schemas/dsl/game-definition.v1.json` — added `"reactive"` to `TurnDef.scheduler` enum
- `src/dsl/types.ts` — added `"reactive"` to scheduler union
- `src/game-kernel/scheduler-strategies.js` — added `findEligibleReactivePlayers()` and `advanceReactive()`
- `src/game-kernel/scheduler.js` — wired `advanceReactive` into scheduler dispatch and guard check
- `src/evolutionary-engine/mutation/operators/scheduler-swap.js` — added `"reactive"` to `SCHEDULER_TYPES`
- `test/unit/game-kernel/scheduler-reactive.test.mjs` — new, 16 tests
- `test/unit/evolutionary-engine/scheduler-swap.test.mjs` — new, 3 tests
- `test/unit/evolutionary-engine/mutation.test.mjs` — updated 2 existing tests affected by new swap candidate

## Out of scope

- Interrupt stack / LIFO resolution (mechanic #13, Interrupts)
- `metadata.speed: "reaction"` out-of-turn actions
- Changes to `src/simulation-engine/loop.js`
- Mutation operators specific to reactive scheduler

## Acceptance criteria

- ✅ Player with a met condition acts; others wait
- ✅ Multiple eligible players resolve in player ID order (lowest first)
- ✅ No eligible players → fallback to player 1 with `_noEligible` flag
- ✅ Phases cycle before player selection
- ✅ Round tracking works correctly
- ✅ Round triggers fire at round boundary
- ✅ Step effects apply during end_phase
- ✅ Schema validates definitions using `reactive` scheduler
- ✅ `tsc -p tsconfig.json` passes
- ✅ `npm run test:unit` passes (1375 tests, 0 failures)

## Outcome

**What changed vs. originally planned**: The original ticket assumed reactive scheduling required changes to `scheduler.js` directly and to `loop.js`. In practice, the reactive scheduler is a pure strategy function in `scheduler-strategies.js` that integrates via the existing dispatch chain — no simulation loop changes needed. The interrupt stack/LIFO features were descoped as they belong to a separate mechanic (Interrupts). The scheduler-swap mutation operator was updated to include `reactive` as a swap target, which was not in the original ticket but was necessary for correctness. Two existing tests in `mutation.test.mjs` were updated because adding `reactive` to the candidate pool changed which scheduler gets selected by the deterministic RNG.
