# E2EEVOPIP-002: Add mocked human evaluation helper
Status: Completed

## Goal
Provide a deterministic mocked human evaluation helper for pairwise choices and ratings to use in the evolution pipeline E2E suite.

## File list
- test/e2e/helpers/mock-human-eval.js
- test/e2e/mock-human-eval.e2e.test.mjs

## Out of scope
- Changes to production human-loop logic in src/.
- Modifying existing helpers unless strictly required for imports.
- Adding new UI or CLI prompts.

## Reassessed assumptions
- No mocked human evaluation helper exists yet under `test/e2e/helpers/`.
- The helper will be exercised by a focused E2E test now, and reused by the evolution pipeline E2E test in E2EEVOPIP-005 later.
- Determinism must not depend on call order; results should be stable for a given seed and candidate IDs/features.

## Acceptance criteria
### Specific tests that must pass
- node --test test/e2e/mock-human-eval.e2e.test.mjs

### Invariants that must remain true
- Mocked outputs are deterministic for a fixed seed and input set.
- Mocked evaluations are explicitly tied to candidate IDs (no cross-candidate leakage).
- Existing E2E helpers in test/e2e/helpers/ continue to work as-is.

## Outcome
- Added a deterministic mock human evaluation helper with rating and pairwise comparison outputs.
- Added a focused E2E test that validates determinism, ID mapping, and swap behavior.
