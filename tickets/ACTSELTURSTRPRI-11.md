# ACTSELTURSTRPRI-11: Add `round-trigger-add` mutation operator

## What

Create a new mutation operator `round-trigger-add` that adds a `start_round` or `end_round` trigger to the game definition's `triggers` array. The trigger has a randomly generated effect (e.g., `set` a variable, `move` tokens) and optionally a condition. This enables the evolutionary engine to discover round-boundary behaviors like pool resets, worker returns, and variable reinitialization.

## Files to touch

- `src/evolutionary-engine/mutation/operators/round-trigger-add.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `round-trigger-add` with `enabled: true` and a weight (suggest 2.0)
- `src/evolutionary-engine/mutation/operators/index.js` (or registry file) — export/register the new operator

## Out of scope

- `start_round`/`end_round` trigger implementation (ACTSELTURSTRPRI-02)
- Trigger removal operators
- Wave 2/3 trigger events

## Acceptance criteria

- Test: Operator adds a `start_round` trigger with a valid effect
- Test: Operator adds an `end_round` trigger with a valid effect
- Test: Generated effects reference valid variables/zones from the game definition
- Test: Operator is deterministic with seeded RNG
- Test: Operator can add triggers to definitions that already have triggers
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-02 (start_round / end_round trigger events)
