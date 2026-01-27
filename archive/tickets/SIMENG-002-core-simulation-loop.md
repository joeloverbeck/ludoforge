# SIMENG-002: Core simulation loop and trajectory logging

## Summary
Implement the core simulation loop that drives the game-kernel and records per-turn trajectory data with termination safeguards.

## Assumptions (reassessed)
- The kernel does not provide a single "apply action" API, so the loop applies action costs/effects via `applyEffect`.
- `TrajectoryStep` does not include outcome data; terminal outcomes are captured in `SimulationResult` (and optional events).
- Loop detection in the simulation layer uses a state-hash window separate from the scheduler's internal loop detection.
- `stepControl.onStep` is a synchronous hook; pausing/resuming mid-run is deferred to a future async API.

## File list it expects to touch
- src/simulation-engine/loop.js
- src/simulation-engine/index.js
- src/simulation-engine/index.d.ts
- test/simulation-engine/core-loop.test.mjs
- test/simulation-engine/fixtures.mjs

## Work plan
1. Implement `runSimulation` in `loop.js` using the kernel APIs to fetch legal actions, apply actions, and detect termination.
2. Record trajectory entries (state snapshot, action, legal action count, turn index) and surface terminal outcomes via `SimulationResult`/events.
3. Add loop safeguards: max turn cap plus a repeated-state cutoff (configurable) with a clear termination reason.
4. Provide an optional step callback hook (`onStep`) that fires per step without altering loop semantics.
5. Add minimal fixtures that build a tiny kernel state for deterministic tests.
6. Add tests that validate the loop terminates, logs entries, and surfaces terminal outcomes and cutoff reasons.

## Out of scope
- RNG utilities and seeding.
- Agent policy implementations beyond a test stub policy.
- Batch or parallel simulation execution.
- On-the-fly metrics computation.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/simulation-engine/core-loop.test.mjs`
- `node --test test/game-kernel/scheduler.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- The simulation loop only advances state via game-kernel APIs (no direct mutation).
- Trajectory logging preserves the order of turns; terminal outcomes are recorded on the simulation result and events.
- The loop respects a maximum turn limit to avoid infinite runs, with a clear cutoff result.
- The loop detects repeated-state loops (or stalemates) and emits an explicit termination reason.

## Status
Completed.

## Outcome
- Added a simulation loop implementation with trajectory logging, loop detection, stalemate handling, and max-turn enforcement via the scheduler.
- Introduced simulation-engine fixtures and core-loop tests to validate termination, loop detection, and logging behavior.
- Adjusted the loop to own repeated-state detection (disabling scheduler state-loop checks) to avoid premature termination in single-phase games.
