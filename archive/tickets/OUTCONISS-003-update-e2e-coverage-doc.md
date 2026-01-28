# OUTCONISS-003 Update E2E Coverage Contract References

## Context
This ticket was raised because the E2E coverage doc previously mentioned
`outcome.reason` for max-turn cutoffs. The current doc content already reflects
the canonical SimulationResult contract (terminationReason + terminated), so
this ticket now serves as a verification + cleanup task to prevent regression.

## Scope
- Confirm `docs/architecture/e2e-coverage.md` references `terminationReason` and
  `terminated=false` for cutoff behavior.
- Ensure the doc explicitly states `outcome.reason` is not present.

## File list
- docs/architecture/e2e-coverage.md

## Out of scope
- No runtime code changes.
- No changes to other architecture docs unless the E2E coverage doc contradicts them.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- The E2E doc only references terminationReason and terminated for cutoff behavior.
- outcome remains per-player only; no reason fields are described.

## Status
Completed (2026-01-28)

## Outcome
- Updated the ticket assumptions/scope to reflect that the E2E coverage doc already matches the canonical contract.
- No code or doc changes were required; the existing wording already disallows `outcome.reason`.
- Tests run: `npm run test:unit`.
