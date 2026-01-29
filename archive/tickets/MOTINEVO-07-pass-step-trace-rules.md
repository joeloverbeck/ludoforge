# MOTINEVO-07: Pass-step trace rules

**Status: COMPLETED**

## Description
Ensure that pass steps (where `actionId === null`) emit proper trace fields: `bindings: {}`, `appliedEffects: []`, and a valid `stateHash`. This covers all pass-step paths in `loop.js`: `noLegalActions.policy = "pass"`, stalemate detection, and terminate paths.

## Files to Touch
- `src/simulation-engine/loop.js`

## Out of Scope
- Non-pass step trace emission — done in MOTINEVO-06
- Motif mining — handled in MOTINEVO-12

## Acceptance Criteria

### Tests That Must Pass
- T2: Simulate a game that forces a pass (no legal actions with pass policy), assert:
  - `actionId` is `null`
  - `bindings` is `{}`
  - `appliedEffects` is `[]`
  - `stateHash` is a valid non-empty string
- Pass steps from stalemate detection have same trace field shape
- Pass steps from terminate paths have same trace field shape
- `npm run test:unit` passes

### Invariants That Must Remain True
- Pass steps still correctly advance the game (turn rotation, phase progression)
- `stateHash` on pass steps reflects the actual game state at that point
- No mutation of game state objects

## Dependencies
- Depends on: MOTINEVO-06
- Blocks: MOTINEVO-08, MOTINEVO-14

## Outcome

### What was changed
- **`src/simulation-engine/loop.js`**: All three pass-step paths now emit trace data:
  - `policy === "pass"` path (line ~108): Added `defaultStateHasher(state)` call and passes `{ stateHash, bindings: {}, appliedEffects: [] }` to `buildStep`.
  - `policy === "terminate"` path (line ~166): Same trace data added; also normalized `actionId` from `undefined` to `null` for consistency with the spec's pass-step definition.
  - Stalemate fallback path (line ~192): Same trace data added; also normalized `actionId` from `undefined` to `null`.

### What was added (tests)
- **`test/unit/simulation-engine/pass-step-trace.test.mjs`** (5 tests):
  1. Pass policy emits `bindings: {}`, `appliedEffects: []`, and valid `stateHash`
  2. Stalemate detection emits the same trace field shape
  3. Terminate policy emits the same trace field shape
  4. `stateHash` is deterministic for identical game state
  5. Pass policy with loop detection emits trace on all accumulated pass steps

### Deviation from plan
- The ticket's scope was accurate. One minor normalization was applied beyond the ticket's explicit scope: `actionId` was changed from `undefined` to `null` on the terminate and stalemate paths, aligning them with the spec's definition that pass steps have `actionId === null`. This is consistent with MOTINEVO-06's trace emission contract and ensures uniform pass-step shape across all paths.
