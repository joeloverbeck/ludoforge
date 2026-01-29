# MOTINEVO-08: Trace emission + replay invariant tests (T1, T3)

## Description
Create dedicated test files for trace emission correctness (T1) and replay invariant verification (T3). Optionally add a `replay.js` utility that reconstructs state from appliedEffects and verifies stateHash consistency.

## Files to Touch
- `test/unit/simulation-engine/trace-emission.test.mjs` (new — T1)
- `test/unit/simulation-engine/replay-invariant.test.mjs` (new — T3)
- `src/simulation-engine/replay.js` (new, optional — replay utility)

## Out of Scope
- Motif mining tests (T4) — handled in MOTINEVO-12
- Operator tests (T5) — handled in MOTINEVO-13

## Acceptance Criteria

### Tests That Must Pass
- **T1 (trace-emission)**: An action with costs + trigger produces:
  - Correct `bindings` reflecting variable state
  - `appliedEffects` with proper `source` tags (`"cost"`, `"effect"`, `"trigger"`)
  - Deterministic ordering of `appliedEffects` (costs first, then effects, then triggers)
- **T3 (replay-invariant)**: Replaying `appliedEffects` step-by-step:
  - Reconstructed `stateHash` at each step matches the recorded `stateHash` sequence
  - Works for multi-step trajectories with varying action types
- All tests use seeded RNG for determinism
- `npm run test:unit` passes

### Invariants That Must Remain True
- Tests are self-contained with fixture factories (no external file dependencies)
- Tests follow project conventions: `node:test`, `node:assert/strict`, ESM
- Replay utility (if created) is a pure function with no side effects

## Dependencies
- Depends on: MOTINEVO-06, MOTINEVO-07
- Blocks: none
