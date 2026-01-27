# Preference Learning Spec

## Purpose
Learn a model of human fun/preferences from pairwise comparisons and use it as a fitness function for evolution.

## Responsibilities
- Collect and store pairwise comparison data.
- Train a model that predicts preference score from feature vectors.
- Provide predicted fun scores for candidate games.
- Support active learning (query uncertain comparisons).

## Data
- Input features: evaluation metric vector per game.
- Labels: pairwise preference (A > B).
- Optional context tags ("quick", "deep") for conditioning.

## Modeling Options
- Bradley-Terry/Elo style ranking (simple, fast).
- Logistic regression over feature vectors (TS implementation).
- If needed, call out to external services instead of Python-only libs.

## Training Loop
1. Gather comparisons from UI.
2. Fit/update model parameters.
3. Score new candidates.
4. Periodically query uncertain pairs.

## Safeguards
- Keep hard degeneracy filters regardless of model score.
- Maintain diversity to avoid overfitting to model quirks.

## Interfaces
- Input: feature vectors, preference records.
- Output: predicted fun score + confidence.

## Open Questions
- Minimum comparisons for first model training.
- Active learning policy (uncertainty threshold vs scheduled).
- Whether to keep all learning in TS or integrate a separate service.
