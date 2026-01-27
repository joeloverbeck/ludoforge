# Simulation Engine Spec

## Purpose
Run automated playthroughs of generated games using AI agents to produce trajectories and metrics for evaluation.

## Responsibilities
- Instantiate games in the kernel and execute turns.
- Provide agent controllers (heuristic, random, MCTS-lite).
- Support 1..N agents; cooperative and competitive modes.
- Log trajectories: state snapshots, actions, outcomes, turn counts.
- Batch run simulations for evaluation at scale.

## Core Loop
1. Initialize game state and agents.
2. Repeat until termination:
   - Query kernel for legal actions.
   - Agent selects action based on policy.
   - Apply action via kernel.
   - Record state/action in trajectory log.
3. Emit terminal outcome and trajectory summary.

## Determinism and RNG
- RNG seed per simulation for reproducibility.
- Controlled randomness for stochastic actions.

## Performance Considerations
- Fast state cloning for branching/search agents.
- Parallel runs across candidates (worker threads).
- Option to compute metrics on the fly to reduce storage.

## Interfaces
- Input: game definition, agent policies, RNG seed.
- Output: trajectories, terminal outcomes, metric hooks.

## Open Questions
- Minimum agent set for MVP (random + greedy).
- Max simulation length and early cutoff rules.
- Preferred JS/TS runtime target (Node LTS + ESM).
