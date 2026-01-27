# Evaluation and Analytics Spec

## Purpose
Compute proxy "fun" metrics and filter degenerate games. Produce feature vectors for preference learning and evolutionary fitness.

## Responsibilities
- Derive metrics from simulation trajectories.
- Detect degeneracy (loops, dominant moves, trivial wins).
- Produce a feature vector per game candidate.
- Compute a composite score or multi-objective vector.

## Metrics (Initial Set)
- Agency: outcome sensitivity to choices.
- Strategic depth: branching factor over time.
- Skill expression: win-rate gap between strong vs weak agents.
- Variety: entropy of trajectories.
- Pacing/tension: change in win probability over time.
- Interaction rate: frequency of meaningful opponent impact.
- Degeneracy flags: repeated states, stalemates, forced moves.

## Filtering Rules
- Reject games with infinite loops or no termination signals.
- Reject if no meaningful choices (branching factor too low).
- Reject if dominant action trivially wins in most states.

## Interfaces
- Input: simulation logs, game definitions.
- Output: feature vectors, flags, composite fitness.

## Open Questions
- Minimum simulation count per candidate for stable metrics.
- Weighting scheme for initial proxy fitness.
