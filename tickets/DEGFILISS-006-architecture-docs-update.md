# DEGFILISS-006: Update architecture docs to reflect new degeneracy model

**Status:** Open
**Depends on:** DEGFILISS-005
**Blocks:** None

## Summary

Update architecture documentation to reflect the redesigned degeneracy handling: `policyByFlag` replacing `rejectOn`, full-trajectory detection, penalty term in fitness, and the `minStepsForNoChoices` guard.

## Files to Change

- `docs/architecture/metrics-and-fitness.md`
- `docs/architecture/README.md` (if index entries change)

## Out of Scope

- Any code changes

## Requirements

### Documentation Updates

1. Remove all mentions of `rejectOn` (replaced by `policyByFlag`).
2. Document that forced-move/no-choices detection uses full trajectory steps (not sampled keySteps).
3. State explicitly: `forcedMove`/`noChoices` are "preference/policy knobs, not genre-truth".
4. Describe the penalty term in the fitness blend formula: `finalFitness = base + diversity + preference - degeneracyPenalty`.
5. Document `minStepsForNoChoices` guard and its purpose.
6. Document the three policy semantics: reject, penalize, ignore.
7. Document default policies: loop/nonTerminating → reject, all others → penalize.

## Acceptance Criteria

- [ ] No mention of `rejectOn` in docs (replaced by `policyByFlag`)
- [ ] Docs state forced-move/no-choices detection uses full trajectory steps
- [ ] Docs state `forcedMove`/`noChoices` are "preference/policy knobs, not genre-truth"
- [ ] Docs describe penalty term in fitness blend formula
- [ ] Docs describe `minStepsForNoChoices` guard
- [ ] Docs describe three policy semantics (reject, penalize, ignore)
- [ ] `npm run test:unit` passes (docs tests if any)
