# Preference Learning Spec

## Purpose
Learn a model of human fun/preferences from pairwise comparisons and use it as a fitness function for evolution.

## Responsibilities
- Collect and store pairwise comparison data.
- Train a model that predicts preference score from feature vectors.
- Provide predicted fun scores for candidate games.
- Support active learning (query uncertain comparisons).
- Integrate with evaluation pipeline without bypassing hard validity checks.

## Data
- Input features: evaluation metric vector per game.
- Labels: pairwise preference (A > B).
- Optional context tags ("quick", "deep") for conditioning.
- Store comparison metadata (timestamps, user id, game ids, context, notes).

## Integration Notes
- Preference model scores do not replace validity filters (degeneracy, non-termination, trivial wins).
- Fitness combines preference score with diversity pressure (e.g., MAP-Elites niches).
- Preference learning is downstream of simulation metrics; it consumes the same feature vectors.

## Data Schema (Minimum)
- Game record: id, feature_vector, simulation_summary, created_at.
- Comparison record: id, game_a_id, game_b_id, winner_id, context_tag?, confidence?, notes?, created_at, user_id?.
- Model snapshot: id, version, training_window, context_tag?, hyperparams, metrics, created_at.

## Modeling Options
- Bradley-Terry/Elo style ranking (simple, fast).
- Logistic regression over feature vectors (TS implementation).
- If needed, call out to external services instead of Python-only libs.

## Training Loop
1. Gather comparisons from UI.
2. Fit/update model parameters.
3. Score new candidates.
4. Periodically query uncertain pairs.

## Active Learning Policy (MVP)
- Uncertainty sampling: query pairs with predicted win probability near 0.5.
- Diversity sampling: include candidates from underrepresented niches.
- Cadence: request comparisons every N generations or when model confidence drops.

## Model Lifecycle
- Bootstrap: start with automated metrics only until minimum comparisons reached.
- Update: train on a rolling window to reduce stale preference drift.
- Version: store snapshots to allow rollback and A/B evaluation.

## Evaluation
- Track predictive accuracy on held-out comparisons.
- Track calibration (are 70% predictions correct ~70% of the time).
- Monitor preference vs. proxy divergence to detect model exploitation.

## Safeguards
- Keep hard degeneracy filters regardless of model score.
- Maintain diversity to avoid overfitting to model quirks.
- Cap preference score influence early to avoid rapid overfitting.

## Interfaces
- Input: feature vectors, preference records.
- Output: predicted fun score + confidence.

## Open Questions
- Minimum comparisons for first model training.
- Active learning policy (uncertainty threshold vs scheduled).
- Whether to keep all learning in TS or integrate a separate service.
