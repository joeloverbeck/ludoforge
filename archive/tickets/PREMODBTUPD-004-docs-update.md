# [PREMODBTUPD] PREMODBTUPD-004: Document preference model update changes
Status: Completed

## Goal
Ensure architecture docs stay aligned with the already-implemented Bradley-Terry update,
centered rating targets, and regularization/clamp options, plus clarify any small
documentation gaps discovered during review.

## File list (expected to touch)
- docs/architecture/human-feedback.md
- docs/architecture/metrics-and-fitness.md

## Scope
- Confirm the Bradley-Terry comparison update, centered rating targets, and regularization/clamp
  options are already documented in `docs/architecture/human-feedback.md` (no rewrite if accurate).
- Add the missing clarification that comparison feedback assembly collapses tags/rationale into
  `notes` on the comparison payload (current behavior in `assemblePreferenceFeedbackComparison`).
- Add a brief note in metrics/fitness docs that preference learning is comparison-first
  (per the spec’s optional note).

## Out of scope
- No code changes (unless documentation reveals a true mismatch with behavior).
- No updates to UI/feedback capture flows.
- No changes to test expectations.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Documentation remains consistent with implemented update rules and default values.
- Existing sections on feature-vector assembly and scoring APIs remain unchanged.

## Outcome
- Updated docs to note comparison feedback notes aggregation and comparison-first training emphasis.
- No code changes were required; unit tests run for verification.
