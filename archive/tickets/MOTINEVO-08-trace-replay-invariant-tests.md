# MOTINEVO-08: Trace emission + replay invariant tests (T1, T3)

## Description
Create dedicated test files for trace emission correctness (T1) and replay invariant verification (T3). Create a `replay.js` utility (required) that reconstructs state from appliedEffects and verifies stateHash consistency.

## Corrections (from plan review)
1. **Bindings are always `{}`**: `loop.js` always passes `bindings: {}`. No code populates bindings yet. T1 criterion: "bindings is present as empty object `{}`."
2. **T1 scope**: `step-trace-emission.test.mjs` (MOTINEVO-06) already covers cost/effect/trigger source tagging and ordering at the unit level. The new `trace-emission.test.mjs` focuses on **combined integration scenarios** (cost + effect + trigger together through the full loop) to avoid duplication.
3. **Replay utility is required**: T3 tests cannot verify the replay invariant without it. Marked as required, not optional.

## Files to Touch
- `test/unit/simulation-engine/trace-emission.test.mjs` (new — T1)
- `test/unit/simulation-engine/replay-invariant.test.mjs` (new — T3)
- `src/simulation-engine/replay.js` (new, **required** — replay utility)

## Out of Scope
- Motif mining tests (T4) — handled in MOTINEVO-12
- Operator tests (T5) — handled in MOTINEVO-13

## Acceptance Criteria

### Tests That Must Pass
- **T1 (trace-emission)**: An action with costs + effect + trigger through the full simulation loop produces:
  - `bindings` present as empty object `{}`
  - `appliedEffects` with proper `source` tags (`"cost"`, `"effect"`, `"trigger"`)
  - Deterministic ordering of `appliedEffects` (costs first, then effects, then triggers)
  - `stateHash` matching `defaultStateHasher(step.state)`
- **T3 (replay-invariant)**: Replaying `appliedEffects` step-by-step:
  - Reconstructed state variables at each step match the recorded `step.state.variables`
  - `stateHash` at each step matches the recorded `stateHash` sequence
  - Works for multi-step trajectories with varying action types
- All tests use seeded RNG for determinism
- `npm run test:unit` passes

### Invariants That Must Remain True
- Tests are self-contained with fixture factories (no external file dependencies)
- Tests follow project conventions: `node:test`, `node:assert/strict`, ESM
- Replay utility is a pure function with no side effects

## Dependencies
- Depends on: MOTINEVO-06, MOTINEVO-07
- Blocks: none

## Status: COMPLETE

## Outcome
- **Planned**: T1 + T3 test files, optional replay utility
- **Actual**: Created `replay.js` (required for T3), `trace-emission.test.mjs` (5 tests), `replay-invariant.test.mjs` (6 tests). Corrected ticket assumptions: bindings always `{}`, replay utility required not optional, T1 scoped to integration-level to avoid duplicating MOTINEVO-06 unit tests.
