# Decision-Quality Metrics

## Overview

Add two optional metrics that are more causally tied to gameplay outcomes than
simple counts: meaningful choice and comeback potential. These should live in
extended metrics and be opt-in due to computation cost and extra data needs.

## Motivation

Current metrics are useful descriptors but do not measure whether decisions
matter or whether early advantages lock in wins. The new metrics target those
properties directly and are expected to be more informative for search and
preference learning when used sparingly.

## Proposed Metrics

### Meaningful Choice (choice_value_spread)

- Goal: measure how much action selection changes expected outcome.
- Definition (per sampled decision point):
  - For each legal action, run `R` rollouts from the same state using a fixed
    rollout policy.
  - Compute the expected value for the acting player for each action.
  - Value = win/lose/draw score (1/0/0.5) or scoring expression result if
    available.
  - Spread = `max(actionValues) - min(actionValues)`.
- Metric value = average spread across sampled decision points.

### Comeback Potential (comeback_potential)

- Goal: quantify how predictive early advantage is of final outcome.
- Definition (per run):
  - Pick an early sampling point (e.g., 25% of steps, clamped to at least 1).
  - Compute per-player scores at that state.
  - Early advantage = leader score - runner-up score.
  - Outcome value for leader = 1 win, 0 loss, 0.5 draw at termination.
- Metric value:
  - Compute Pearson correlation between early advantage and outcome value for
    the early leader across runs.
  - Comeback potential = `1 - clamp(correlation, 0, 1)`.
  - If correlation cannot be computed (too few valid samples), return 0.

## Data Requirements

- Meaningful choice requires access to a decision state and legal actions.
- Comeback potential requires evaluating scores at an early state snapshot.
- Logs currently only store reduced trajectory summaries; they do not retain
  state. These metrics should be computed during live evaluation or
  require additional log sampling fields.

## Required Engine/Analytics Changes

- Add an evaluation helper to compute per-player scores at any state:
  - `game-kernel/scores.js` (new) or expose a function from termination logic.
  - Must use the same scoring expression as termination scoring.
- Add a rollout utility to simulate from arbitrary state using a fixed policy.
- Extend analytics to accept an optional sampling config and rollout agent.

## Sampling and Configuration

- Default: disabled.
- Suggested config fields:
  - `decisionSamplesPerRun` (default 8)
  - `rolloutsPerAction` (default 8)
  - `rolloutMaxSteps` (default 64)
  - `earlyStepPercent` (default 0.25)
  - `rolloutAgent` (default random)
  - `seedStrategy` (deterministic per run and action)
- Guardrails:
  - Cap total rollouts per run.
  - Skip runs with no decision points or missing score expressions.

## Integration Points

- New metrics in `src/evaluation-analytics/metrics/extended.js`.
- Optional metrics in `docs/architecture/metrics-and-fitness.md`.
- Feature vector assembly automatically includes new metric ids.

## Test Plan

- Unit tests for:
  - Rollout value spread with deterministic policy and seeded RNG.
  - Comeback potential correlation on synthetic runs with known outcomes.
  - Graceful handling of missing scoring expression or insufficient samples.

## Risks and Tradeoffs

- Meaningful choice is expensive; sampling must be conservative.
- Comeback potential depends on scoring semantics; may be noisy in games
  without meaningful score gradients.
- Logged replays will not contain enough state unless logging is extended.

## Open Questions

- Should outcome value for meaningful choice prefer scoring over win/loss
  when available, or combine them?
- Should comeback potential use early leader win rate instead of correlation
  for interpretability?
