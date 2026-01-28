# SKIEXPISS-004: Update architecture docs for seat_imbalance and skill expression
Status: Completed (2026-01-28)

## Summary
Update the architecture docs under `docs/architecture/` to reflect `seat_imbalance` usage and the optional true skill expression metric that already exists in code.

## Assumptions check (current code/tests)
- Core metrics already emit `seat_imbalance` and omit `skill_expression` in
  `src/evaluation-analytics/metrics/core.js`.
- Default feature ordering already uses `seat_imbalance` in
  `src/evaluation-analytics/feature-vector.js`.
- Optional true skill expression metric (`skill_expression`) is already implemented in
  `src/evaluation-analytics/metrics/skill-expression.js` and wired into
  `src/evaluation-analytics/metrics/extended.js`.
- Unit tests for seat imbalance and skill expression already exist under
  `test/unit/evaluation-analytics/`.

## File list (expected to touch)
- docs/architecture/metrics-and-fitness.md

## Out of scope
- No production code changes.
- No test changes (tests already cover seat imbalance and skill expression).
- No changes to specs or tickets outside `docs/architecture/`.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Docs consistently use `seat_imbalance` as the win-rate spread metric id.
- The optional skill expression metric already implemented in extended metrics has
  its behavior and config gating accurately described.
- No documentation implies `skill_expression` is the win-rate spread proxy.

## Outcome
- Updated `docs/architecture/metrics-and-fitness.md` to document the optional
  `skill_expression` metric behavior and configuration in line with the existing
  implementation.
- No production code or test changes were needed beyond the documentation update.
