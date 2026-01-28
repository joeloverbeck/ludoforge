# Simulation Engine Methodology

## Entry Points

- `runSimulation(config)` in `src/simulation-engine/loop.js` executes a single playthrough.
- `createSimulationEngine(config)` in `src/simulation-engine/index.js` wraps the same loop.

## Configuration

Defaults are loaded from `configs/simulation.json` (validated by `schemas/config/simulation.schema.json`).
Per-run values passed to the entry points override file defaults, and explicit
`definition.turn.noLegalActions` values remain authoritative over config defaults.

Config keys used by the simulation engine:

- `maxTurns`, `maxSteps`
- `loopDetection.enabled`, `loopDetection.maxRepeatedStates`
- `turn.noLegalActions.policy`, `turn.noLegalActions.reason`
- `rng.seed` (numeric only), `rng.algorithm` (documentation only; `lcg32`)

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
   - `terminate`: return the configured default outcome with
     `terminationReason = "no-legal-actions"` and `terminationDetail` set to the
     configured reason (if provided).
   - `pass`: record a pass step (`actionId = null`) and advance the turn/phase.
   - `error`: throw a structured error.
   - unset: default to stalemate draw.
6. Ask the active agent for an action id or action object.

The effective `turn.noLegalActions` policy is taken from the game definition when set;
otherwise it falls back to `configs/simulation.json`.
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
  `maxTurns` defaults to `configs/simulation.json` if not provided per run.

## Loop Detection

- Optional loop tracking uses a state hasher to detect repeated states.
- The default hasher records variables, tokens, zones, and turn metadata.
- If repetitions exceed `maxRepeatedStates`, termination reason is `"loop-detected"`.
  Loop detection defaults come from `configs/simulation.json` when enabled.

## Determinism

- `createSeededRng(seed)` uses a 32-bit LCG:
  - `state = (1664525 * state + 1013904223) >>> 0`.
  - `next()` returns `state / 2^32`.
- Providing a seed makes simulation reproducible across runs; `rng.seed` in
  `configs/simulation.json` is used only when no per-run seed or RNG is provided.

## Outputs

Simulation returns:

- `trajectory.steps`: ordered snapshots including `legalActionCount`, `affectedPlayerIds`,
  and `affectedGlobal` for metrics.
- `trajectory.events`: internal event stream (state updates and termination).
- `outcome`: per-player outcomes (win/lose/draw) with optional scores.
- `terminationReason`: `condition`, `stalemate`, `no-legal-actions`, `max-turns`,
  `max-steps`, or `loop-detected`.
- `terminated`: boolean (true for game-terminal ends; false for safety cutoffs).
- `terminationDetail?`: optional string for human-readable/configured detail.

## Canonical SimulationResult (Normative)

This section is the single source of truth for SimulationResult.

Required fields:

- `trajectory.steps`: ordered snapshots (must include `legalActionCount`,
  `affectedPlayerIds`, and `affectedGlobal`).
- `trajectory.events`: internal event stream.
- `terminationReason`: enum
  `condition | stalemate | no-legal-actions | max-turns | max-steps | loop-detected`.
- `terminated`: boolean
  - true for game-terminal endings (`condition`, `stalemate`, `no-legal-actions`).
  - false for safety cutoffs (`max-turns`, `max-steps`, `loop-detected`).
- `outcome`: per-player outcomes only (`win | lose | draw`) with optional scores.

Optional fields:

- `terminationDetail?`: optional string for configured/human-readable detail
  (e.g., `turn.noLegalActions.reason`).

Hard rules:

- `outcome` must not include `reason` or `terminated`.
- All termination reasoning lives in `terminationReason` plus optional
  `terminationDetail`.
