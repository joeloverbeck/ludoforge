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

## Addendum: Pipeline Integration and Safety Alignment

This addendum aligns the evolutionary engine spec with the broader system pipeline described in `brainstorming/ludo-forge-system.md`. It clarifies interfaces, safety gates, and the human-in-the-loop fitness lifecycle without redefining the full architecture.

### Pipeline Contracts
- **Upstream Inputs**
  - **Candidate source:** seed population or generators that emit valid DSL ASTs.
  - **Validation results:** syntactic + semantic checks; invalid candidates are rejected before simulation.
  - **Evaluation context:** simulation budget, RNG seeds, and feature descriptor configuration for QD.
- **Downstream Outputs**
  - **Evaluated candidates:** genomes plus fitness, descriptors, and diagnostics (e.g., degeneracy flags).
  - **Selection metadata:** niche placements, elite markers, and novelty scores.
  - **Feedback hooks:** candidate identifiers and metadata needed for human preference collection.

### Safety and Degeneracy Gates
- **Hard rejects:** invalid DSL, failed safety constraints, or non-terminating behavior detected by loop/turn caps.
- **Soft penalties:** trivial strategies (one-step wins), no meaningful choices, or repeated stalemates.
- **Boundedness enforcement:** all state variables and collections remain within defined limits.

### Evaluation Integration
- **Simulation-driven metrics:** fitness uses proxy metrics derived from simulation (agency, depth, variety, pacing, interaction, degeneracy signals).
- **Model-driven fitness:** a learned preference model can replace or weight proxy metrics once trained.
- **Diagnostics:** log feature vectors and failure reasons for targeted mutation and analysis.

### Human Preference Loop
- **Candidate selection for review:** pick diverse, high-variance, or model-uncertain candidates for comparison.
- **Data collection:** pairwise preference outcomes tied to candidate IDs and their feature vectors.
- **Model update cadence:** periodic retraining (e.g., every N generations) with active-learning bias toward uncertain comparisons.
- **Fitness override:** learned model output becomes primary fitness signal, with hard safety filters retained.

### Minimum Viable Path (Evolutionary Engine Scope)
1. Validate genomes → simulate → compute proxy metrics.
2. Apply hard safety rejects and soft penalties.
3. Rank within MAP-Elites niches and emit next generation.
4. Emit a small, diverse shortlist for optional human comparison.
5. Allow plug-in of a simple preference model (e.g., Bradley–Terry or logistic regression) when available.
