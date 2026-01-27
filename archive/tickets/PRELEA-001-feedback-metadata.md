# PRELEA-001: Expand preference feedback metadata

## Context
Preference learning needs richer comparison metadata (game ids, winner id, user id, context tag, confidence, notes) while keeping existing feedback JSONL compatible.

## Assumptions (revised)
- Feedback validation is handled in `src/data-persistence/feedback-store.js` with manual checks (no AJV schema or JSON Schema validation yet).
- Feedback JSONL normalization only de-duplicates/sorts tags and trims empty `rationale`.
- Preference feedback types currently live in `src/evaluation-analytics/types.ts` and are re-used via `src/data-persistence/types.ts`.

## Scope
- Extend preference feedback comparison types to carry metadata alongside feature vectors.
- Update feedback JSONL validation to accept optional comparison metadata fields.
- Add tests that cover comparison records with metadata and ensure backward compatibility.

## File list
- src/evaluation-analytics/types.ts
- src/data-persistence/feedback-store.js
- test/data-persistence/feedback-store.test.mjs

## Out of scope
- No changes to storage location or JSONL envelope format.
- No UI changes for collecting feedback.
- No changes to preference model training or scoring logic.

## Acceptance criteria
### Specific tests that must pass
- `npm test`
- `node --test test/data-persistence/feedback-store.test.mjs`

### Invariants that must remain true
- Existing rating/comparison feedback records without the new metadata still deserialize successfully.
- Feedback JSONL envelopes remain `{ type: "feedback", payload: ... }` with deterministic serialization.
- Validation continues to reject invalid `preferred` values and missing feature vectors.

## Status
- Completed

## Outcome
- Added optional comparison metadata fields (game ids, winner id, user id, context tag, confidence, notes) in feedback types and validation.
- Expanded feedback store tests to cover metadata round-tripping and confidence validation.
