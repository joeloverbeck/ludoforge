# Simulation Engine Methodology

## Entry Points

- `runSimulation(config)` in `src/simulation-engine/loop.js` executes a single playthrough.
- `createSimulationEngine(config)` in `src/simulation-engine/index.js` wraps the same loop.

## State Initialization

- A fresh state is created from the game definition: `createInitialState(definition)`.
- The trajectory starts empty and accumulates per-step snapshots and events.

## Agent Selection

- Agents are normalized from the config via `normalizeAgents`.
- Selection logic:
  - First, match the active player id.
  - Next, match the active player's role.
  - Finally, fall back to positional ordering.

## Action Resolution

Per step:

1. List legal actions (`listLegalActions`).
2. Build meta (`legalActionCount`, `hasLegalActions`) for termination evaluation.
3. Evaluate termination conditions (`evaluateTermination`) with meta.
4. If terminated, stop and return the outcome.
5. If no legal actions exist, apply the `turn.noLegalActions` policy:
   - `terminate`: return the configured default outcome with the configured reason.
   - `pass`: record a pass step (`actionId = null`) and advance the turn/phase.
   - `error`: throw a structured error.
   - unset: default to stalemate draw.
6. Ask the active agent for an action id or action object.
7. Validate action legality (`validateActionChoice`).
8. Apply action costs, then action effects (`applyEffect`).
9. Apply after-action triggers (`applyTriggers`).
10. Record state update in the event stream.
11. Persist the step snapshot (turn, phase, player, action, legalActionCount).

No-legal-actions handling never prompts the agent. The pass policy does not run
after-action triggers because no action occurred.

## Turn Advancement and Cutoffs

- `advanceTurnPhase` controls phase and player rotation.
- If `maxTurns` is exceeded, termination reason is `"max-turns"` and the outcome is computed
  via `evaluateTermination` with `maxTurnsReached: true`.

## Loop Detection

- Optional loop tracking uses a state hasher to detect repeated states.
- The default hasher records variables, tokens, zones, and turn metadata.
- If repetitions exceed `maxRepeatedStates`, termination reason is `"loop-detected"`.

## Determinism

- `createSeededRng(seed)` uses a 32-bit LCG:
  - `state = (1664525 * state + 1013904223) >>> 0`.
  - `next()` returns `state / 2^32`.
- Providing a seed makes simulation reproducible across runs.

## Outputs

Simulation returns:

- `trajectory.steps`: ordered snapshots including legalActionCount for metrics.
- `trajectory.events`: internal event stream (state updates and termination).
- `outcome`: terminal outcome object (per-player win/lose/draw).
- `terminationReason`: `condition`, `stalemate`, `no-legal-actions`, `max-turns`,
  `max-steps`, or `loop-detected`.
