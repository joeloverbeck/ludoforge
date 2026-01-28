# E2E Coverage and Proven Uses

This document summarizes what the end-to-end tests in `test/e2e/` demonstrate
about the seeded simulation and evolution loop.

## Proven Uses

- Seed population evaluation and evolution
  - `test/e2e/evolution-pipeline.e2e.test.mjs`
  - Confirms the ordered phases: seed -> simulate -> eval -> fitness -> evolve -> re-simulate.
  - Ensures evaluator runs once per genome and MAP-Elites produces a next generation
    with stable ids.

- Seed rejection on invalid DSL
  - `test/e2e/evolution-pipeline.e2e.test.mjs`
  - Invalid definitions are rejected before evaluator invocation.

- Safety cutoffs for non-terminating simulations
  - `test/e2e/evolution-pipeline.e2e.test.mjs`
  - Simulations that hit max turns produce `terminationReason = "max-turns"` and
    `outcome.reason = "max-turns"`.

- Deterministic evaluation for seeded runs
  - `test/e2e/evolution-pipeline.e2e.test.mjs`
  - Equal seeds produce identical evaluation outputs and next-generation ids.

- Human loop prompting and action application
  - `test/e2e/human-loop.e2e.test.mjs`
  - Prompts, validates input, applies effects, advances turn and player.

- Invalid human input handling
  - `test/e2e/human-loop.e2e.test.mjs`
  - Prompts repeat until a valid action is selected.

- Mixed human/AI routing
  - `test/e2e/human-loop.e2e.test.mjs`
  - Human prompt for human players; AI action provider for AI players.

- Deterministic state transitions
  - `test/e2e/state-transition.e2e.test.mjs`
  - Confirms action effects alter state consistently between runs.

- Human loop failure on no legal actions
  - `test/e2e/state-transition.e2e.test.mjs`
  - The human prompt loop throws "No legal actions available" when the legal action
    list is empty (simulation engine treats this case as a stalemate draw).

- DSL validation and deterministic serialization
  - `test/e2e/game-definition.e2e.test.mjs`
  - Schema + semantic validation passes for valid fixtures; serialization is stable
    under key reordering.

- Rendering with visibility rules
  - `test/e2e/rendering.e2e.test.mjs`
  - Private zones are hidden from non-active viewers; large zones are collapsed
    with a truncation indicator.

- Mock simulation behavior
  - `test/e2e/mock-simulation.e2e.test.mjs`
  - Terminal and cutoff modes yield expected termination reasons and step counts.
  - Deterministic results for identical seeds.

- Mock human evaluation behavior
  - `test/e2e/mock-human-eval.e2e.test.mjs`
  - Ratings and comparisons are deterministic and id-stable; swap inversion is verified.

- Mock fitness behavior and gating
  - `test/e2e/mock-fitness.e2e.test.mjs`
  - Fitness deterministic for identical artifacts; preference gating on degeneracy
    and safety flags behaves as expected.

- Fixture coverage for DSL features
  - `test/e2e/fixtures.e2e.test.mjs`
  - Validates game definitions with multiple actions, visibility, phases,
    token movement, and per-player variables.

- Active learning pair selection
  - `test/e2e/active-learning.e2e.test.mjs`
  - Prioritizes uncertain comparisons while ensuring underrepresented niches
    are surfaced for human review.

- Preference model updates from real feature vectors
  - `test/e2e/preference-model-update.e2e.test.mjs`
  - Builds feature vectors from real simulation logs and applies comparison updates.

- Mutation + repair orchestration with crossover
  - `test/e2e/evolution-mutation-repair.e2e.test.mjs`
  - Confirms crossover, mutation, and repair produce valid child genomes at scale.

## Gaps and Not Yet Proven in E2E

- Active learning selection is already covered; gaps below exclude it.
- Extended metrics aggregation (including meaningful choice/comeback rollouts).
- Worker-thread batch simulations.
