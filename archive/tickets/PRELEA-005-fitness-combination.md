# PRELEA-005: Combine preference score with fitness

## Context
Preference scores should influence fitness without bypassing hard validity filters or overwhelming diversity pressure.

## Assumptions check
- There is no existing fitness-combination helper; the only scoring utilities today are `computeCompositeScore` and `computePreferenceScore`.
- Degeneracy filtering happens inside evaluation analytics (not the evaluation adapter), so preference blending must be gated by the caller after degeneracy filters run.
- There is no existing diversity-pressure calculation in the engine; it must be provided to the blend helper as a numeric input.

## Scope
- Add a helper in evaluation analytics to blend composite score, preference score, and diversity pressure.
- Provide bootstrap preference caps based on comparison count (defaults: cap 0.25, bootstrap cap 0.1 until sampleCount >= 20).
- Allow callers to disable preference contribution (used when degeneracy filters reject a candidate).
- Add tests that verify the combination math and caps.

## File list
- src/evaluation-analytics/scoring.js
- src/evaluation-analytics/scoring.d.ts
- src/evaluation-analytics/index.ts
- test/evaluation-analytics/scoring.test.mjs

## Out of scope
- No changes to MAP-Elites placement logic.
- No changes to simulation metrics or degeneracy detection rules.
- No changes to preference model update or storage.

## Acceptance criteria
### Specific tests that must pass
- `npm test`
- `node --test test/evolutionary-engine/evaluation-adapter.test.mjs`
 - `node --test test/evaluation-analytics/scoring.test.mjs`

### Invariants that must remain true
- Candidates failing degeneracy/validity filters never receive a preference-based fitness boost (caller must set `allowPreference: false`).
- Preference influence is bounded by a configurable cap.
- Existing fitness behavior remains unchanged when preference scoring is disabled.

## Status
Completed (2026-01-27)

## Outcome
- Added `combineFitnessScores` with bootstrap preference caps and diversity contribution in evaluation analytics.
- Updated scoring exports/types and added combination tests; no evaluation-adapter changes were needed.
