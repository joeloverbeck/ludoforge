# PRELEA-003: Add preference scoring API

## Context
The preference model should output a predicted fun score and confidence from a feature vector so it can be consumed by the evaluation pipeline.

## Assumptions (updated)
- Evaluation analytics modules are authored in JS with matching `.d.ts` typings, so new helpers need both.
- Public API for downstream use is surfaced via `src/evaluation-analytics/index.ts`.
- Existing composite scoring lives in `scoring.js`; preference scoring should be a separate helper.

## Scope
- Add a `computePreferenceScore` helper that maps `PreferenceModelState` + `FeatureVector` to `{ score, confidence }`.
- Use a deterministic sigmoid score (0-1) and confidence as distance from 0.5, documented in code.
- Expose the scoring helper from `evaluation-analytics` for downstream use.
- Add tests covering scoring, confidence bounds, and zero-weight behavior.

## File list
- src/evaluation-analytics/preference-scoring.js
- src/evaluation-analytics/preference-scoring.d.ts
- src/evaluation-analytics/index.ts
- src/evaluation-analytics/types.ts
- test/evaluation-analytics/preference-scoring.test.mjs
- test/evaluation-analytics/types.test.ts

## Out of scope
- No active learning pair selection.
- No changes to preference model update logic.
- No changes to fitness combination or MAP-Elites integration.

## Acceptance criteria
### Specific tests that must pass
- `npm test`
- `node --test test/evaluation-analytics/preference-scoring.test.mjs`

### Invariants that must remain true
- Scoring is pure and deterministic for the same inputs.
- Confidence is always between 0 and 1 inclusive.
- Missing or non-finite feature values do not crash scoring.

## Status
- Completed (2026-01-27)

## Outcome
- Added a preference scoring helper with sigmoid scoring + confidence heuristic, plus typings and exports.
- Expanded the file list to include new typings and type references; no changes to preference model updates or evaluation pipeline wiring beyond the API export.
