# E2E Evolution Pipeline Test Suite Spec

## Purpose
Define an end-to-end test suite that validates the full evolutionary pipeline: seeding a population of game definitions, simulating games to completion, collecting mocked human evaluation, computing fitness, evolving the population, and re-simulating the next generation.

## Related Archived Specs
- `archive/specs/evolutionary-engine.md`
- `archive/specs/simulation-engine.md`
- `archive/specs/evaluation-analytics.md`
- `archive/specs/preference-learning.md`
- `archive/specs/human-interface.md`
- `archive/specs/game-kernel.md`
- `archive/specs/validation-safety.md`
- `archive/specs/e2e-human-loop.md`

## Goals
- Prove a seed population of game definitions is created and validated.
- Prove simulations run until terminal conditions or safety cutoffs are reached.
- Prove the human-in-the-loop evaluation path runs via mocked IO or mocked preference selection.
- Prove fitness is computed from evaluation metrics (and optionally preference model output).
- Prove evolution produces a next generation and that the pipeline re-simulates it.

## Non-Goals
- Performance benchmarking, scaling, or worker-thread orchestration.
- Full UI coverage beyond mocked IO or summary prompts.
- Exhaustive validation rule coverage (handled by unit tests).

## Scope and Assumptions
- Tests live under `test/e2e/` and use Node's test runner (`node --test`).
- Deterministic RNG seeds are required for reproducibility.
- Test fixtures remain small and deterministic to avoid flaky outcomes.
- Human evaluation is mocked at the interface boundary (no real stdin/stdout).
- Failing fast on invalid definitions or non-terminating games is a required behavior.

## Suite Structure (Proposed)
- `test/e2e/evolution-pipeline.e2e.test.mjs`
- `test/e2e/helpers/`
  - `mock-human-eval.js` (pairwise choice + rating stubs)
  - `mock-simulation.js` (optional stub for deterministic trajectories)
  - `mock-fitness.js` (optional wrapper for deterministic feature vectors)
- `test/e2e/fixtures/`
  - `evo-seed-1.json`, `evo-seed-2.json` (minimal but distinct games)
  - `evo-terminates.json` (short deterministic termination)
  - `evo-non-terminating.json` (used to test safety cutoffs)

## End-to-End Flow
1. **Seed**
   - Load or generate a fixed population (2-5 definitions).
   - Validate with schema + semantic checks.
   - Assign stable IDs for tracking (genome IDs or deterministic hashes).
2. **Simulate**
   - Run each candidate through the simulation engine with deterministic agents.
   - Capture terminal outcome and termination reason (normal win/loss/draw or safety cutoff).
3. **Evaluate (Mocked Human Loop)**
   - Select a subset for comparison or rating.
   - Use mocked human IO to return consistent preferences or ratings.
   - Record evaluation artifacts alongside feature vectors.
4. **Fitness**
   - Compute fitness from proxy metrics (evaluation analytics) and include preference score if enabled.
   - Apply hard rejects/penalties for degeneracy or safety violations.
5. **Evolve**
   - Generate a next population via mutation/crossover (or stubbed deterministic evolution for tests).
   - Preserve elite(s) and enforce diversity constraints.
6. **Re-simulate**
   - Run simulations for the new population and verify updated outcomes and metrics are logged.

## Test Cases
### Seeded Population
- Seeds load and validate successfully.
- Stable identifiers are assigned deterministically.
- Invalid seed is rejected with explicit errors.

### Simulation Completion
- A terminating game reaches a terminal outcome within a low turn cap.
- A non-terminating game triggers safety cutoff (max turns or loop detection) with a clear reason.

### Mocked Human Evaluation
- Mocked IO produces deterministic ratings or pairwise selections.
- Evaluations are attached to correct game IDs and feature vectors.
- Mixed path: some candidates skip human review, others receive it.

### Fitness Calculation
- Proxy metrics produce a non-null fitness score or vector.
- Preference model output, if enabled, is blended with proxy metrics.
- Hard rejects/penalties override preference scores.

### Evolution and Re-simulation
- Next generation size matches configuration.
- Elite retention occurs when configured.
- Mutations produce valid, schema-compliant candidates.
- New generation simulates end-to-end with logging and termination checks.

## Robustness Circumstances (Most Important)
- **Termination safety**: enforce max turns and loop detection; fail clearly when triggered.
- **Invalid or degenerate definitions**: seed or mutated candidates fail validation before simulation.
- **No legal actions**: simulation or evaluation fails with explicit error, not silent hang.
- **Determinism**: identical seeds and RNG produce identical fitness and evolution outcomes.
- **Human evaluation consistency**: mocked evaluations map to the correct candidate and do not leak across generations.
- **Fitness dominance**: degeneracy flags override high preference scores (no unsafe promotion).
- **Population integrity**: stable IDs persist across evaluation, fitness, and evolution.
- **Diversity pressure**: ensure niches or descriptors do not collapse to a single candidate.
- **Boundary sizes**: very small population (2) and slightly larger population (10) behave predictably.
- **Mixed outcomes**: population includes both terminal and cutoff-terminated games; pipeline still completes.

## Determinism Requirements
- RNG seed passed explicitly to simulation and evolution steps.
- Mocked human results are fixed per test case.
- Avoid wall-clock timestamps in snapshots unless normalized.

## Acceptance Criteria
- E2E suite proves the pipeline steps in order: seed -> simulate -> mock human eval -> fitness -> evolve -> re-simulate.
- At least one test demonstrates safety cutoff handling.
- Fitness is computed and recorded for all non-rejected candidates.
- Next generation is produced and simulated without runtime errors.

## Open Questions
- Whether to stub evolution operators in tests or exercise real mutation/crossover.
- Minimum fixture diversity needed to ensure MAP-Elites niche coverage.
- Whether preference learning should be a separate optional test when model training exists.
