# ACTSELTURSTRPRI-19: Add Wave 2 mutation operators (`turn-order-effect-insert`, `choose-effect-insert`, `worker-count-tweak`)

**Status**: Completed

## What

Create three new mutation operators for Wave 2 features:

1. **`turn-order-effect-insert`**: Inserts a `set_turn_order` effect into an `end_round` trigger. If no `end_round` trigger exists, creates one. References a random per-player variable with random direction (`asc` or `desc`).

2. **`choose-effect-insert`**: Wraps an existing effect in a `choose` block, offering the original effect plus an alternative (e.g., a different variable increment). Selects a random action's effect list.

3. **`worker-count-tweak`**: Adjusts the `count` field on `spawn` effects found in triggers or action effect lists. Tweaks count by ±1 (clamped to min 1).

## Files to touch

- `src/evolutionary-engine/mutation/operators/turn-order-effect-insert.js` — new file
- `src/evolutionary-engine/mutation/operators/choose-effect-insert.js` — new file
- `src/evolutionary-engine/mutation/operators/worker-count-tweak.js` — new file
- `configs/evolution-operators.json` — register all three operators
- `src/evolutionary-engine/mutation/orchestrator.js` — import and register in ALL_MUTATION_OPERATORS
- `src/evolutionary-engine/mutation.js` — re-export from barrel

## Assumptions corrected during implementation

- **No `index.js`**: The original ticket referenced `src/evolutionary-engine/mutation/operators/index.js`. This file does not exist. Operator registration happens in `orchestrator.js` (imports + ALL_MUTATION_OPERATORS array) and `mutation.js` (barrel re-exports).
- **`worker-count-tweak` scope**: The DSL has no "initial zone populations" concept. Spawn effects in triggers and action effect lists carry a `count` field (or default to 1). The operator targets `spawn` effects across triggers and actions.
- **`choose` effect structure**: The `choose` effect uses `{ kind: "choose", options: Effect[][], count: 1 }` where each option is an array of effects. The operator wraps an existing effect as one option and generates an alternative as the second option.

## Out of scope

- Wave 1 mutation operators (separate tickets)
- Wave 3 mutation operators
- Repair operators

## Acceptance criteria

- Test: `turn-order-effect-insert` produces a valid `end_round` trigger with `set_turn_order` effect
- Test: `turn-order-effect-insert` returns unchanged genome when no per-player int variables exist
- Test: `choose-effect-insert` wraps an effect in a valid `choose` block with two options
- Test: `choose-effect-insert` returns unchanged genome when no action effects exist
- Test: `worker-count-tweak` adjusts spawn counts, clamped to min 1
- Test: `worker-count-tweak` returns unchanged genome when no spawn effects exist
- Test: All operators are deterministic with seeded RNG
- Test: All operators do not mutate the input genome
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-16 (set_turn_order effect) ✅
- ACTSELTURSTRPRI-17 (choose effect) ✅
- ACTSELTURSTRPRI-02 (round triggers) ✅

## Outcome

**What was actually changed vs originally planned:**

All three mutation operators were implemented as planned. Additional changes beyond the original ticket:

1. **Schema update**: `schemas/config/evolution-operators.schema.json` — added the three new operator names to the `MutationOperatorKind` enum. The original ticket did not mention this file but it was required for config validation.
2. **Corrected registration files**: The ticket referenced a non-existent `operators/index.js`. Registration was done in `orchestrator.js` (import + array entry) and `mutation.js` (barrel re-export) instead.
3. **Clarified `worker-count-tweak` scope**: Targets `spawn` effects in both triggers and action effect lists (not "initial zone populations" which don't exist in the DSL).
4. **17 unit tests added** covering all acceptance criteria: effect shape, no-op on missing preconditions, determinism, immutability, edge cases (count clamping, missing count field, appending to existing triggers).
