# DATPER-005: Feedback JSONL Store

## Goal
Persist human feedback (comparisons, ratings, tags, rationales) for training and analysis.

## Scope / Tasks
- Add JSONL writer/reader for `FeedbackRecord` envelopes (comparison and rating variants).
- Validate required metadata and feedback payload shape for rating/comparison samples.
- Allow optional `gameId` / `runId` references and normalize feedback tags/empty rationale.

## File list it expects to touch
- `src/data-persistence/feedback-store.js`
- `test/data-persistence/feedback-store.test.mjs`

## Assumptions (reassessed)
- Data-persistence stores are implemented in `.js` modules, with types defined in `src/data-persistence/types.ts`.
- `FeedbackRecord` already exists in the shared types and uses `PreferenceFeedbackSample` from evaluation-analytics.
- There is no central store registry in `index.ts`; callers import store modules directly.

## Out of scope
- Preference model updates or training logic.
- Any UI changes in the human interface.
- Aggregated analytics or report generation.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/data-persistence/feedback-store.test.mjs`

### Invariants that must remain true
- Existing evaluation-analytics preference-model behavior stays unchanged.
- Feedback records remain append-only; no in-place mutation of existing records.

## Status
- Completed (2026-01-27)

## Outcome
- Added `feedback-store.js` with JSONL read/write, deterministic serialization, and feedback payload validation.
- Added normalization for tags and empty rationale; no changes needed to `jsonl.js` or `index.ts`.
