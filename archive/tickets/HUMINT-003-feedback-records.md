# HUMINT-003: Feedback capture (rating + pairwise)

## Goal
Implement feedback prompts and data records for single-game ratings and pairwise preferences, including optional tags/reasons.

## Scope of Work
- Define feedback record types for the human-interface module (rating + pairwise comparison with optional tags/reasons).
- Implement prompt helpers for:
  - Rating 1–5 with validation.
  - Pairwise choice between A and B (normalize to `preferred: "a" | "b"` in the returned record) with optional tags/reasons.
- Keep prompts decoupled from persistence; return structured records only (no feature vectors or persistence envelopes).

## File list it expects to touch
- `src/human-interface/feedback.js`
- `src/human-interface/feedback.d.ts`
- `src/human-interface/index.js`
- `src/human-interface/index.d.ts`
- `test/human-interface/feedback.test.mjs`

## Assumptions (reassessed)
- Human-interface modules are implemented in `.js` with matching `.d.ts` files.
- The `HumanIO` interface is defined in `src/human-interface/prompt.d.ts` and reused by prompt helpers.
- No existing feedback prompt helpers or tests are present.

## Out of scope
- No storage, file IO, or analytics integration.
- No changes to evaluation-analytics modules.
- No UI beyond CLI text prompts.
- No game-loop orchestration or session summaries.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/human-interface/feedback.test.mjs`

### Invariants that must remain true
- Rating values are constrained to integers 1–5.
- Pairwise choice is prompted as `"A"` or `"B"` and normalized to `preferred: "a" | "b"` in the record.
- Optional tags/reasons must not affect core choice/rating values.

## Notes
- Use the same `HumanIO` interface from HUMINT-002.
- Keep record shapes stable and JSON-serializable.

## Status
- Completed (2026-01-27)

## Outcome
- Added human-interface feedback prompt helpers for rating and pairwise comparison records with optional tags/rationale.
- Normalized pairwise choice to `preferred: "a" | "b"` while keeping the CLI prompt as A/B.
- Added focused tests for validation, normalization, and optional metadata capture.
