# SIMENG-004: Agent policy implementations (random + greedy)

## Summary
Add baseline agent policies and a policy interface that plugs into the simulation loop.

## Current state notes (reassessed)
- The simulation engine currently defines `AgentController` in `src/simulation-engine/types.d.ts`, but `AgentInput` does not include RNG access.
- `SimulationConfig.seed` exists but is not used by the simulation loop.
- There is no `src/simulation-engine/agents/` directory or agent policy tests yet.

## File list it expects to touch
- src/simulation-engine/agents/random.js
- src/simulation-engine/agents/greedy.js
- src/simulation-engine/index.js
- src/simulation-engine/index.d.ts
- src/simulation-engine/types.d.ts
- src/simulation-engine/loop.js
- test/simulation-engine/agents.test.mjs

## Work plan
1. Extend the agent input types to include an optional RNG and wire RNG into the simulation loop via `seed` or `rng`.
2. Implement a random policy that selects uniformly from legal actions using the provided RNG.
3. Implement a greedy policy with a heuristic hook (e.g., score callback) and a stable fallback to the first legal action.
4. Add tests for policy selection, RNG determinism, and fallback behavior.

## Out of scope
- MCTS or search-based agents.
- Training or learning systems.
- Batch or parallel execution.
- Changes to kernel scoring or evaluation semantics.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/simulation-engine/agents.test.mjs`
- `node --test test/simulation-engine/core-loop.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Policies never return actions outside the provided legal action list.
- Random policy behavior is fully driven by the provided RNG instance.
- Greedy policy falls back to a stable default (e.g., first legal action) when no heuristic data is available.

## Status
Completed.

## Outcome
- Implemented random and greedy policies with RNG-aware selection and a stable greedy fallback.
- Wired RNG into the simulation loop via `seed` or an explicit `rng` on the config and exposed the policy helpers.
- Added agent policy tests to cover deterministic RNG use and greedy selection behavior.
