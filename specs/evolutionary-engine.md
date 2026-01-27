# Evolutionary Engine Spec

## Purpose
Generate and refine game candidates using evolutionary search, guided by fitness metrics and diversity constraints.

## Responsibilities
- Maintain a population of candidate games (DSL ASTs).
- Perform mutation and crossover operations on ASTs.
- Enforce validity via DSL validation and safety checks.
- Score candidates via evaluation module (proxy metrics + learned model).
- Maintain diversity via MAP-Elites or similar QD approach.

## Key Concepts
- Genome: serialized AST of a game definition.
- Population: set of genomes evaluated per generation.
- Fitness: scalar or vector based on evaluation metrics.
- Niches: buckets defined by descriptors (player count, randomness, length).

## Operators
- Mutation: add/remove/modify variables, actions, effects, conditions.
- Crossover: merge subtrees (actions, state sections) across two parents.
- Repair: post-mutation fixes to maintain constraints.

## Selection
- QD approach favored: MAP-Elites grid with best per niche.
- Elitism: preserve top candidates per niche.
- Novelty bias: reward underrepresented descriptors.

## Interfaces
- Input: seed population or generators, evaluation results.
- Output: next generation candidate list with metadata.

## Open Questions
- Descriptor set and bin sizes for MAP-Elites.
- Mutation probabilities and limits for MVP.
- Preferred JS/TS implementation details (data structures, worker model).
