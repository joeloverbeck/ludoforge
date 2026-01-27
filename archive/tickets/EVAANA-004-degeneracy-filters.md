# [EVAANA] EVAANA-004: Implement degeneracy detection and filtering
Status: Completed (2026-01-27)

## Goal
Detect degenerate games and emit structured flags for rejection or review.

## File list (expected to touch)
- src/evaluation-analytics/degeneracy.js
- src/evaluation-analytics/degeneracy.d.ts
- src/evaluation-analytics/index.ts
- test/evaluation-analytics/degeneracy.test.mjs

## Scope
- Implement detection for: repeated states/loops, stalemates/no termination signals, forced-move dominance, trivially dominant action, trivial wins.
- Return a structured flag set with reasons and supporting counters.
- Provide a helper to apply filtering rules and return an allow/reject decision.
- Keep `DegeneracyReport.details` compatible with existing type (primitive values); encode counts/thresholds as readable strings.

## Out of scope
- No metric computation beyond what is required for degeneracy checks.
- No changes to simulation policies or game definitions.
- No composite scoring.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/evaluation-analytics/degeneracy.test.mjs`

### Invariants that must remain true
- Filtering rules are deterministic for identical inputs.
- Flags include enough detail for auditability (counts, thresholds used).
- Existing test suites remain green.

## Notes
- Keep thresholds configurable via function parameters with sensible defaults.
- Current runtime modules live in `.js` with `.d.ts` typings; follow that pattern instead of introducing new `.ts` runtime modules.

## Outcome
- Added degeneracy detection with configurable thresholds (loops, stalemates, non-terminating runs, forced moves, dominant actions, trivial wins) and a filter helper for allow/reject decisions.
- Encoded per-flag counts and thresholds as human-readable strings in `DegeneracyReport.details` to preserve the existing API shape.
- Added focused degeneracy tests and exported the new helpers via `src/evaluation-analytics/index.ts`.
