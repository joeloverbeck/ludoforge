# [DECQUAMET] DECQUAMET-005: Document decision-quality metrics
Status: Completed (2026-01-28)

## Goal
Update metrics documentation to include meaningful choice and comeback potential, including
config defaults and opt-in behavior.

## File list (expected to touch)
- docs/architecture/metrics-and-fitness.md
- specs/decision-quality-metrics.md (archive after completion)

## Scope
- Update the extended metrics documentation for `choice_value_spread` and
  `comeback_potential` to include configuration inputs and defaults.
- Document required inputs (decision samples, early-state scores) and opt-in config fields.
- Note computation cost and guardrails (sampling caps, rollout max steps).
- Archive `specs/decision-quality-metrics.md` after the doc update is complete.

## Out of scope
- No code changes.
- No formula changes beyond clarifying existing behavior.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Existing metric descriptions remain accurate and intact.
- Documentation stays consistent with implemented configuration defaults.

## Notes
- Keep headings short and align tone with existing metrics documentation.

## Outcome
- Updated extended metrics documentation with opt-in config defaults and guardrails.
- No code or formula changes were needed beyond clarifying existing behavior.
- Archived `specs/decision-quality-metrics.md` after updating the docs.
