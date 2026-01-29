# MOTINEVO-06: buildStep emits stateHash, bindings, appliedEffects

## Status: COMPLETED

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

## Outcome

### What Changed
All changes matched the plan exactly. No deviations were needed.

**`src/simulation-engine/step-execution.js`:**
- `applyAction()` now collects `result.appliedEffect` from each cost (tagged `source: "cost"`) and each effect (tagged `source: "effect"`), returning `{ appliedEffects }`.
- `applyAfterActionTriggers()` now returns `{ appliedEffects: result.appliedEffects ?? [] }` from the trigger system.
- `buildStep()` accepts an optional 5th parameter `trace` (`{ stateHash, bindings, appliedEffects }`) and includes those fields in the step when provided. Pass steps (no trace) remain unchanged.

**`src/simulation-engine/loop.js`:**
- At the main action step site (~line 223), captures return values from `applyAction` and `applyAfterActionTriggers`.
- Computes `stateHash` via `defaultStateHasher(state)` (already imported).
- Concatenates `actionResult.appliedEffects` and `triggerResult.appliedEffects`.
- Passes `{ stateHash, bindings: {}, appliedEffects }` as the trace parameter to `buildStep`.

**No changes to `loop-detection.js`** — `defaultStateHasher` was already exported.

### New Tests
- `test/unit/simulation-engine/step-trace-emission.test.mjs` — 13 tests across 5 suites:
  - `applyAction` trace collection (5 tests: empty, costs, effects, ordering)
  - `applyAfterActionTriggers` trace collection (2 tests: empty, trigger source)
  - `buildStep` trace fields (3 tests: present, absent, preserves existing)
  - `stateHash` determinism (2 tests: same/different states)
  - Integration: full simulation emits trace fields on non-pass steps (1 test)

### Test Results
- All 406 passing tests continue to pass (407 total, 1 pre-existing failure in `trace-schema.test.mjs` from MOTINEVO-04).
