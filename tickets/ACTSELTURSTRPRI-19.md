# ACTSELTURSTRPRI-19: Add Wave 2 mutation operators (`turn-order-effect-insert`, `choose-effect-insert`, `worker-count-tweak`)

## What

Create three new mutation operators for Wave 2 features:

1. **`turn-order-effect-insert`**: Inserts a `set_turn_order` effect into an `end_round` trigger. If no `end_round` trigger exists, creates one. References a random per-player variable with random direction.

2. **`choose-effect-insert`**: Wraps an existing effect in a `choose` block, offering the original effect plus an alternative (e.g., a different variable increment). Selects a random action's effect list.

3. **`worker-count-tweak`**: Adjusts the number of worker/token spawn operations in setup triggers or initial zone populations. Tweaks count by ±1 (clamped to min 1).

## Files to touch

- `src/evolutionary-engine/mutation/operators/turn-order-effect-insert.js` — new file
- `src/evolutionary-engine/mutation/operators/choose-effect-insert.js` — new file
- `src/evolutionary-engine/mutation/operators/worker-count-tweak.js` — new file
- `configs/evolution-operators.json` — register all three operators
- `src/evolutionary-engine/mutation/operators/index.js` (or registry) — export/register

## Out of scope

- Wave 1 mutation operators (separate tickets)
- Wave 3 mutation operators
- Repair operators

## Acceptance criteria

- Test: `turn-order-effect-insert` produces a valid `end_round` trigger with `set_turn_order` effect
- Test: `choose-effect-insert` wraps an effect in a valid `choose` block
- Test: `worker-count-tweak` adjusts spawn counts, clamped to min 1
- Test: All operators return null when preconditions not met (e.g., no per-player variables)
- Test: All operators are deterministic with seeded RNG
- Invariant: Output genomes pass DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-16 (set_turn_order effect)
- ACTSELTURSTRPRI-17 (choose effect)
- ACTSELTURSTRPRI-02 (round triggers)
