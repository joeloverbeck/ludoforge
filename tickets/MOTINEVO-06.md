# MOTINEVO-06: buildStep emits stateHash, bindings, appliedEffects

## Description
Modify the simulation engine to emit full trace data in every non-pass trajectory step. Specifically:
1. `applyAction()` in `step-execution.js` collects `appliedEffects` from costs (`source: "cost"`) and effects (`source: "effect"`).
2. `buildStep()` includes `stateHash`, `bindings`, and `appliedEffects` in the returned step object.
3. `loop.js` computes `stateHash` via `defaultStateHasher` (exported from `loop-detection.js`) and passes trace data through to `buildStep`.

## Files to Touch
- `src/simulation-engine/step-execution.js`
- `src/simulation-engine/loop.js`
- `src/simulation-engine/loop-detection.js` (export `defaultStateHasher`)

## Out of Scope
- Pass-step trace logic (actionId === null) — handled in MOTINEVO-07
- Motif mining — handled in MOTINEVO-12
- LTS builder — handled in MOTINEVO-11

## Acceptance Criteria

### Tests That Must Pass
- Every non-pass trajectory step contains `stateHash` (non-empty string), `bindings` (object), and `appliedEffects` (array)
- `stateHash` is deterministic: same state produces same hash across runs
- `appliedEffects` entries have correct `source` tags (`"cost"` or `"effect"`)
- All existing simulation-engine unit tests pass
- `npm run test:unit` passes

### Invariants That Must Remain True
- Existing step fields (`actionId`, `playerId`, `state`, etc.) are unchanged
- `defaultStateHasher` is a pure function with no side effects
- Simulation results remain deterministic with seeded RNG
- No performance regression in simulation loop (hashing is O(state size))

## Dependencies
- Depends on: MOTINEVO-05
- Blocks: MOTINEVO-07, MOTINEVO-08, MOTINEVO-11, MOTINEVO-14
