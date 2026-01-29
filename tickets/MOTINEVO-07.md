# MOTINEVO-07: Pass-step trace rules

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
