# Seeded Population Loop Overview

## Purpose

Describe the deterministic pipeline that starts from a seeded population of game definitions,
executes simulations, collects human preference signals, computes fitness, evolves the population,
then repeats.

## Core Data Types

- Genome: `{ id, definition }`, where `definition` is a DSL game definition.
- Evaluation result: `{ fitness, descriptors, diagnostics }` returned by the evaluator.
- Map-Elites config: descriptor binning rules plus optional fitness key and tie-breaking.

## Pipeline Stages

1. Seed population (external input)
   - The engine expects an array of genomes; no generator exists in-core.
   - Validation occurs during evaluation via schema + semantic checks.
   - Relevant code: `src/evolutionary-engine/engine.js`, `src/evolutionary-engine/serialization.js`.

2. Evaluate each genome
   - `evaluateGenome` validates the DSL and runs optional safety gates.
   - If validation or gates fail, the genome is rejected before scoring.
   - Relevant code: `src/evolutionary-engine/evaluation-adapter.js`.

3. Simulate and compute analytics
   - Simulation produces trajectories and termination outcomes.
   - Analytics convert trajectories into metrics, degeneracy flags, and descriptors.
   - Relevant code: `src/simulation-engine/loop.js`, `src/evaluation-analytics/*`.

4. Human feedback capture
   - Human ratings or comparisons are collected and stored as preference samples.
   - These samples update the preference model used during fitness computation.
   - Active learning can prioritize pairwise comparisons using preference-model
     uncertainty and niche diversity.
   - Relevant code: `src/human-interface/feedback.js`,
     `src/evaluation-analytics/preference-model.js`,
     `src/evaluation-analytics/active-learning.js`.

5. Fitness computation
   - Metrics + degeneracy flags become a feature vector.
   - Composite score + preference score + diversity pressure blend into fitness.
   - Relevant code: `src/evaluation-analytics/feature-vector.js`, `src/evaluation-analytics/fitness.js`.

6. MAP-Elites placement
   - Evaluated genomes are binned into descriptor niches.
   - The best genome per niche becomes the elite for the next generation.
   - Relevant code: `src/evolutionary-engine/map-elites.js`.

7. Shortlisting (optional)
   - Elites can be ranked and diversified into a shortlist for human review.
   - Relevant code: `src/evolutionary-engine/engine.js`.

8. Evolution operators (optional between generations)
   - Mutation, crossover, and repair can generate new genomes from elites.
   - Relevant code: `src/evolutionary-engine/mutation.js`, `src/evolutionary-engine/crossover.js`,
     `src/evolutionary-engine/repair.js`.

## Determinism Controls

- Simulation RNG uses a seeded LCG for repeatable runs.
- Mock evaluators in `test/e2e/` use stable hashing of candidate ids + feature vectors.
- MAP-Elites placement is deterministic for identical inputs.

## Loop Control

The engine returns `nextGeneration` and optional `shortlist` for the caller to
re-seed the next iteration. Repetition is orchestrated outside core modules.
