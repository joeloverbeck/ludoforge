# OUTCONISS-002 Clarify No-Legal-Actions Semantics

## Context
The simulation doc should treat custom reason strings as `terminationDetail` while keeping `terminationReason` on the fixed enum. Verify that the docs and implementation already follow the output-contract guidance for no-legal-actions semantics, and only adjust if they drift.

## Scope
- Confirm the no-legal-actions terminate vs pass behavior is explicit in `docs/architecture/simulation-engine.md`.
- Specify where the custom reason string is stored (termination detail, not outcome).
- If docs and implementation diverge, apply minimal updates to align them.

## File list
- docs/architecture/simulation-engine.md

## Out of scope
- No changes to the canonical SimulationResult section beyond no-legal-actions semantics.
- No enum expansion or new termination reason values.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- `terminationReason` is always one of the documented enum values.
- `terminationDetail` is optional and only contains the custom reason string.
- Pass policy does not terminate the run or emit termination fields on that step.

## Status
Completed

## Outcome
- Updated ticket assumptions/scope to reflect current docs and implementation alignment.
- No code or doc changes required beyond ticket clarification.
