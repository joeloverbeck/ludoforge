# EVAANA-001: Define evaluation analytics types and interfaces

## Status
Completed

## Goal
Create the core TypeScript types for evaluation analytics inputs/outputs so downstream metric and filtering code has a stable contract.

## File list
- src/evaluation-analytics/types.ts (new)
- src/evaluation-analytics/index.ts (new)
- test/evaluation-analytics/types.test.ts (new, type-check only)

## Updated assumptions
- There is no existing `src/evaluation-analytics/` module, so the folder and files must be created.
- The repo does not execute TypeScript tests via `node --test`; type-only assertions must run through `tsc -p tsconfig.json`.

## Scope
- Create the evaluation-analytics module with core TypeScript types for simulation log inputs, trajectory summaries, metric results, degeneracy flags, feature vectors, composite score outputs, and preference model updates (per `specs/evaluation-analytics.md`).
- Export the public type-only API surface via an index file.
- Add type-level tests that compile under `tsc -p tsconfig.json`.

## Out of scope
- No metric computation or filtering logic.
- No changes to simulation engine logging.
- No new runtime dependencies.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Existing tests in `test/` continue to pass.
- Public type exports are stable and do not reference internal test-only types.
- No new runtime side effects introduced by the `index.ts` export surface.

## Notes
- Keep names aligned with the spec: metrics, degeneracy flags, feature vector, composite score, preference model update.
- Prefer readonly structures where appropriate.

## Outcome
- Created a new `src/evaluation-analytics/` module with type-only exports for analytics inputs/outputs.
- Added a type-level test compiled by `tsc` instead of a runtime `node --test` check.
