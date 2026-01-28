# OUTCONISS-004 Update Metrics/Fitness Contract References

## Context
Metrics and fitness definitions rely on terminated=false but the doc does not guarantee that field. Align the doc with the canonical SimulationResult fields and tighten metric definitions to use terminationReason and terminated.

### Assumptions check (2026-01-28)
- `docs/architecture/metrics-and-fitness.md` already lists `terminated` as a required summary field.
- Early termination rate and non-terminating degeneracy definitions already reference `terminationReason` and `terminated`.
- Code in `src/evaluation-analytics/metrics/extended.js` and `src/evaluation-analytics/degeneracy.js` already implements the same logic.

Given the above, this ticket is documentation maintenance only and requires no code changes.

## Scope
- Verify the metrics/fitness doc already includes `terminated` and the updated definitions.
- If missing, add `terminated` to trajectory summaries and align definitions. Otherwise, no changes.

## File list
- docs/architecture/metrics-and-fitness.md

## Out of scope
- No changes to runtime code unless the doc differs from implemented behavior.
- No edits to other architecture docs.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- No new output fields are introduced beyond the canonical SimulationResult fields.
- Metric formulas remain logically equivalent except for replacing phantom fields with terminationReason/terminated.

## Status
- Completed (doc already aligned; no changes required).

## Outcome
- Planned: update metrics/fitness doc to add `terminated` and adjust early termination / non-terminating definitions.
- Actual: doc already matched the canonical fields and definitions; no doc or code changes were needed. Ticket updated to reflect verified alignment and status.
