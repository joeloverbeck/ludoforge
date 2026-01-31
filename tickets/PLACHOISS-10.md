# PLACHOISS-10: Update mutation operators and semantic validation for params

**Status:** TODO
**Dependencies:** PLACHOISS-09
**Blocks:** PLACHOISS-11

---

## What

Mutation operators and semantic validation work with `action.params` instead of `action.targets`.

## Files to Touch

- `src/evolutionary-engine/mutation/operators/token-zone-target-add.js` — produce `params` entries
- `src/evolutionary-engine/mutation/traversal.js` — walk `action.params` instead of `action.targets`
- `src/dsl/semantic.js` — validate params, build actionBindingIds from params
- `src/dsl/semantic/action-analysis.js` — update if references targets
- `test/unit/evolutionary-engine/mutation.test.mjs`
- `test/unit/dsl/semantic.test.mjs`

## Out of Scope

No new mutation operators for params. No crossover changes.

## Acceptance Criteria

- token-zone-target-add produces valid params.
- Semantic validation reports errors for invalid param domains.
- actionBindingIds built from params.
- All mutation operators produce schema-valid genomes.
- Semantic validation catches structural errors.
- `npm run test:unit` and `npm run test:e2e` pass.
