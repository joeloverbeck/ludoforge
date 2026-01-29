# DEGFILISS-003: Add `evaluation.degeneracy` to runner-config schema

**Status:** Open
**Depends on:** DEGFILISS-001
**Blocks:** None (DEGFILISS-004 does not depend on this)

## Summary

Extend the runner-config schema to accept a first-class `evaluation.degeneracy` block, so degeneracy policy can be configured per-experiment at the runner level.

## Files to Change

- `schemas/evolution-runner/runner-config.v1.json`
- New or existing test file for runner-config schema validation

## Out of Scope

- Runtime wiring of runner config into evaluator pipeline
- Fitness penalty computation (DEGFILISS-004)
- Detection logic (DEGFILISS-002)

## Requirements

### Schema (`runner-config.v1.json`)

1. Add optional property `evaluation.degeneracy`.
2. If present, requires `policyByFlag` — object mapping flag names to `"reject" | "penalize" | "ignore"`.
3. If present, requires `penalties` — object with per-flag weight params.
4. Invalid policy values (e.g. `"foo"`) must be rejected by schema validation.
5. Existing runner configs without `evaluation.degeneracy` must continue to validate.

### Tests

1. A runner config including `evaluation.degeneracy` with valid `policyByFlag` and `penalties` validates.
2. A runner config with `evaluation.degeneracy` missing `policyByFlag` fails validation.
3. A runner config with `evaluation.degeneracy` containing invalid policy value fails validation.
4. A runner config without `evaluation.degeneracy` still validates (backward compat).

## Acceptance Criteria

- [ ] Runner config schema accepts optional `evaluation.degeneracy` property
- [ ] If present, requires `policyByFlag` and `penalties`
- [ ] Invalid policy values rejected by schema
- [ ] Existing runner configs without `evaluation.degeneracy` still validate
- [ ] `npm run test:unit` passes
