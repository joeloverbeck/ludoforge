# Data and Persistence Spec

## Purpose
Store game definitions, simulation logs, evaluation metrics, and human feedback for replay, analysis, and training.

## Responsibilities
- Serialize/deserialize DSL game definitions.
- Store simulation results and summary metrics per candidate.
- Persist optional full trajectories for replay and deeper analysis.
- Record preference comparisons and user ratings.
- Provide reproducibility metadata (RNG seeds, versioning).

## Data Entities
- GameDefinition: DSL AST + metadata (id, version, descriptors).
- SimulationRun: game id, seed, agents, trajectory summary.
- TrajectoryLog (optional): event stream of state/action changes for replay.
- Metrics: per-game feature vectors and fitness scores.
- Feedback: pairwise comparisons, ratings, tags, optional rationale.

## Storage Options
- JSONL files for MVP.
- SQLite for structured querying and joins.
  - Prefer Node SQLite drivers to avoid Python dependencies.

## Interfaces
- Input: data from kernel/sim/eval/UI.
- Output: data retrieval for training and analysis.

## Open Questions
- Minimum metadata for reproducibility.
- Retention policy for full trajectories vs summaries.
