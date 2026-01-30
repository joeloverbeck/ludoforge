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
    `terminated = false` (no `outcome.reason` field).

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

- No-legal-actions policies (stalemate default, terminate, pass, error)
  - `test/e2e/state-transition.e2e.test.mjs`
  - Confirms the default stalemate draw, explicit terminate outcome, pass step, and error throw.

- Human loop skips prompting on pass policy
  - `test/e2e/human-loop.e2e.test.mjs`
  - When `turn.noLegalActions.policy = "pass"`, no prompt is emitted and the turn advances.

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
  - Builds feature vectors from real simulation logs, including `turn_taking_rate` and
    `interaction_rate`, and applies comparison updates.
  - Confirms deterministic metric values for identical seeds.

- Mutation + repair orchestration with crossover
  - `test/e2e/evolution-mutation-repair.e2e.test.mjs`
  - Confirms crossover, mutation, and repair produce valid child genomes at scale.

- Seed generation pipeline with default config
  - `test/e2e/seed-generation-pipeline.e2e.test.mjs`
  - Generates 16 genomes using the default experiment config (4 descriptors, uniform-bins
    coverage with accept-any-valid fallback) and asserts the evaluation-error rate stays
    below 50%. Exercises the grammar generator's dec-precondition logic, the evaluator's
    simulation-error resilience, and the seed population's null-fitness guard.

- Smoke test
  - `test/e2e/smoke.e2e.test.mjs`
  - Verifies the test runner process is alive (`process.pid` check).

- Evaluation fidelity
  - `test/e2e/evaluation-fidelity.e2e.test.mjs`
  - High-agency definitions produce higher agency scores than low-agency ones.
  - Degeneracy flags are raised for degenerate fixtures.
  - Metric values are deterministic across repeated evaluations with the same seed.

- Degeneracy accuracy
  - `test/e2e/degeneracy-accuracy.e2e.test.mjs`
  - Degenerate fixtures are detected and flagged.
  - Forced-move games produce the forced-move flag.
  - Healthy game definitions receive no reject-policy flags.
  - Fitness ordering: healthy > degenerate.
  - Reject-policy flags vs penalize-policy flags behave distinctly.

- Mutation operator effectiveness
  - `test/e2e/mutation-operator-effectiveness.e2e.test.mjs`
  - Each enabled operator produces a valid, different genome.
  - Add/remove structural operators maintain DSL validity.
  - `mutateAndRepairGenome` always returns a valid genome.

- Simulation correctness
  - `test/e2e/simulation-correctness.e2e.test.mjs`
  - Multi-phase games execute phase transitions correctly.
  - Token movement effects update zone state.
  - Per-player variable scoping isolates player state.
  - All DSL fixture files are simulatable without errors.

- Apply evolution chain
  - `test/e2e/apply-evolution-chain.e2e.test.mjs`
  - Full mutation+crossover+repair chain produces valid genomes.
  - Mutation-only and crossover-only chains produce valid output.
  - Repair survives destructive mutation sequences.

- Config-driven evolution
  - `test/e2e/config-driven-evolution.e2e.test.mjs`
  - Rate=0 skips mutation/crossover; rate=1 applies them.
  - Shortlist size is respected.
  - Generation count matches config.
  - Invalid configs are rejected with clear errors.

- Multi-generation evolution
  - `test/e2e/multi-generation-evolution.e2e.test.mjs`
  - Two-generation happy path produces valid populations.
  - Deterministic output for identical seeds.
  - Zero mutation/crossover rates preserve population.
  - Population size is maintained across generations.

- MAP-Elites diversity
  - `test/e2e/map-elites-diversity.e2e.test.mjs`
  - Multiple niches are occupied after evaluation.
  - Shortlist covers distinct niches.
  - Higher-fitness genomes win within a niche.
  - NaN descriptor values bin to `"unknown"`.
  - Niche diversity is maintained across multiple generations.

- Operator telemetry
  - `test/e2e/operator-telemetry.e2e.test.mjs`
  - `operator-stats.json` is persisted each generation.
  - Telemetry counters accumulate correctly on resume.

## Gaps and Not Yet Proven in E2E

- Extended metrics aggregation (including meaningful choice/comeback rollouts).
- Worker-thread batch simulations.
