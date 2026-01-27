# PRELEAINT-003: Preference feedback assembly for comparisons
Status: Completed

## Context
Human interface prompts collect pairwise comparison choices, but feedback records in data persistence require feature vectors and candidate identifiers. We need a small adapter to assemble complete preference feedback samples from UI prompts + candidate metadata.

## Assumptions (reassessed)
- `promptForPairwiseComparison` currently only returns `preferred: "a" | "b"` (no tie option).
- `PreferenceFeedbackComparison` already exists in `src/evaluation-analytics/types.ts` with `preferred: "a" | "b" | "tie"`.
- The adapter should pass through `preferred: "tie"` only when explicitly provided by the caller (e.g., non-UI usage).

## Scope
- Add an adapter in the human-interface module that:
  - Accepts two candidate records (ids + feature vectors) and a prompt result from `promptForPairwiseComparison`.
  - Emits a `PreferenceFeedbackComparison` record with `featureA`, `featureB`, `gameAId`, `gameBId`, and `winnerId` when applicable.
  - Preserves optional tags/rationale into `notes` in a consistent, documented format.
- Add type definitions and exports for the adapter.
- Add tests validating:
  - Correct winner mapping for preferred A/B.
  - Tie preference maps to `preferred: "tie"` and no `winnerId` when supplied to the adapter.
  - Input candidates are not mutated.

## File list
- src/human-interface/feedback.js
- src/human-interface/feedback.d.ts
- src/human-interface/index.js
- src/human-interface/index.d.ts
- src/evaluation-analytics/types.ts (if new adapter types are needed)
- test/human-interface/feedback.test.mjs

## Out of scope
- No persistence layer changes.
- No changes to prompt UI labels or interaction flow.
- No changes to preference model training logic.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/human-interface/feedback.test.mjs`
- `npm test`

### Invariants that must remain true
- Adapter does not mutate candidate records or prompt output.
- Feature vectors are included for both candidates in the output.
- `winnerId` only set when preferred is A or B.

## Outcome
- Added `assemblePreferenceFeedbackComparison` in `src/human-interface/feedback.js` with consistent `notes` formatting and exports/types.
- Kept `promptForPairwiseComparison` behavior unchanged (still A/B only); adapter supports tie only when supplied directly.
- Added adapter tests for winner mapping, tie behavior, and mutation safety.
