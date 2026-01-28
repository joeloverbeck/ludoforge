# SKIEXPISS-001: Rename skill_expression metric to seat_imbalance

## Summary
Rename the win-rate spread metric id from `skill_expression` to `seat_imbalance`, update default feature ordering, and align documentation language with the new name. Keep existing function exports (no public API break).

## Status
Completed (2026-01-28)

## File list (expected to touch)
- src/evaluation-analytics/metrics/core.js
- src/evaluation-analytics/feature-vector.js
- docs/architecture/metrics-and-fitness.md
- test/unit/evaluation-analytics/feature-vector.test.mjs
- test/unit/evaluation-analytics/core-metrics.test.mjs (existing)

## Out of scope
- No new skill-expression metric implementation.
- No config schema changes or new config flags.
- No changes to MAP-Elites descriptor handling or alias migration.
- No refactors outside the metric id rename and doc wording updates.
- No renaming of exported helper functions (retain `computeSkillExpression` for now).

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/unit/evaluation-analytics/feature-vector.test.mjs`
- `node --test test/unit/evaluation-analytics/core-metrics.test.mjs` (if the file exists or is added)

### Invariants that must remain true
- For identical simulation batches, `seat_imbalance` equals the previous `skill_expression` value within float tolerance.
- `seat_imbalance` remains within `[0, 1]`.
- Core metrics output no longer includes `skill_expression` and includes `seat_imbalance` instead.
- Default feature vector ordering uses `seat_imbalance` in the same position as the prior `skill_expression`.

### Note

We're not supporting backward compatibility; we've yet to run any evolutions.

## Outcome
- Renamed the core metric id to `seat_imbalance`, kept `computeSkillExpression` as the helper name, and updated docs + default ordering accordingly.
- Added a core-metrics unit test to assert the new id and absence of `skill_expression`.
