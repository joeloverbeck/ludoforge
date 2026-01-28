# NOLEGACT-007: Update architecture docs for no-legal-actions behavior

## Goal
Bring architecture documentation in sync with the implemented simulation loop order,
meta refs, and no-legal-actions policy behavior.

## Reassessed assumptions
- The simulation loop already lists legal actions before termination evaluation.
- Meta refs (`meta.legalActionCount`, `meta.hasLegalActions`) are implemented in schema,
  semantic validation, and termination evaluation.
- No-legal-actions policies (`terminate`, `pass`, `error`) are implemented in the loop
  and covered by unit/E2E tests.

## Scope
- Update simulation engine doc to reflect the reordered loop and policy handling.
- Update E2E coverage doc to describe current no-legal-actions fixtures/expectations.
- Update metrics/fitness doc for the stalemate degeneracy rule.

## File list
- `docs/architecture/simulation-engine.md`
- `docs/architecture/e2e-coverage.md`
- `docs/architecture/metrics-and-fitness.md`
- `docs/architecture/README.md`

## Out of scope
- Behavioral changes to the runtime logic or fixtures (docs-only unless a discrepancy is found).
- New tests unless documentation reveals an uncovered invariant.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Documented termination reasons remain consistent with runtime behavior.
- Docs continue to use short headings, short paragraphs, and lists where helpful.

## Status
Completed (2026-01-28).

## Outcome
- Updated architecture docs for simulation loop ordering, no-legal-actions policies, and
  stalemate degeneracy behavior.
- Clarified E2E coverage expectations for no-legal-actions fixtures and pass policy prompting.
- No code or fixture changes were required.
