# DEGFILISS-005: Update E2E tests for `policyByFlag` model

**Status:** Open
**Depends on:** DEGFILISS-004
**Blocks:** DEGFILISS-006

## Summary

Update E2E tests to validate the new `policyByFlag` degeneracy model end-to-end, ensuring reject/penalize/ignore semantics work correctly through the full pipeline.

## Files to Change

- `test/e2e/mock-fitness.e2e.test.mjs`
- `test/e2e/helpers/mock-fitness.js`
- `test/e2e/preference-model-update.e2e.test.mjs`

## Out of Scope

- Documentation (DEGFILISS-006)
- Any source code changes (all done in prior tickets)

## Requirements

### Test Cases

1. **Reject semantics**: `loop` flag causes rejection under default policy.
2. **Reject semantics**: `nonTerminating` flag causes rejection under default policy.
3. **Penalize semantics**: `forcedMove` flag does NOT reject; fitness is penalized.
4. **Penalize semantics**: `noChoices` flag does NOT reject; fitness is penalized.
5. **Determinism invariant**: Same seeds produce same feature vectors (existing test still passes).

### Test Helpers

- Update `mock-fitness.js` to use new config shape (`policyByFlag`, `enabledFlags`, `penalties`).
- Remove references to `rejectOn` from E2E helpers.

## Acceptance Criteria

- [ ] `loop` flag causes rejection under default policy (test)
- [ ] `nonTerminating` flag causes rejection under default policy (test)
- [ ] `forcedMove` flag does NOT reject; fitness is penalized (test)
- [ ] `noChoices` flag does NOT reject; fitness is penalized (test)
- [ ] Determinism invariant: same seeds produce same feature vectors (existing test passes)
- [ ] `npm run test:e2e` passes
- [ ] `npm run test:unit` passes
