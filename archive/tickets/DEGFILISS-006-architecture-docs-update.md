# DEGFILISS-006: Update architecture docs to reflect new degeneracy model

**Status:** Done
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
- [x] `npm run test:unit` passes (docs tests if any)

## Outcome

All seven acceptance criteria met. Updated three sections of `docs/architecture/metrics-and-fitness.md`:

1. **Config Defaults** (line 18): description now references policy-per-flag, penalty weights, and minStepsForNoChoices guard.
2. **Degeneracy Detection** (lines 91–122): forced-move/no-choices use full trajectory steps; added minStepsForNoChoices guard; added preference/policy knobs note; replaced `flags`/`rejectOn` with `enabledFlags`/`policyByFlag` (three semantics: reject, penalize, ignore); documented `penalties` config and default policies.
3. **Fitness Blend** (lines 172–177): formula updated to include `- degeneracyPenalty`; added penalty computation description.

No code changes. All 329 unit tests pass. `grep -r "rejectOn" docs/` returns no matches.
