# PLACHOISS-10: Update mutation operators and semantic validation for params

**Status:** COMPLETED
**Dependencies:** PLACHOISS-09
**Blocks:** PLACHOISS-11

---

## What

Mutation operators and semantic validation work with `action.params` instead of `action.targets`.

## Files Touched

- `src/evolutionary-engine/mutation/operators/token-zone-target-add.js` — always produce `params` entries (removed dual targets/params branching)
- `src/evolutionary-engine/mutation/traversal.js` — walk `action.params` only (removed `?? action.targets` fallback); walk `target?.domain?.selector` only (removed `?? target?.selector` fallback)
- `src/dsl/semantic.js` — read from `action.params` only (removed `?? action?.targets` fallback); validate `target?.domain?.selector` only (removed `?? target?.selector` fallback); fixed validation path from `/actions/N/targets/` to `/actions/N/params/`
- `test/integration/fixtures/genome-traversal.mjs` — converted `targets` array to `params` format with `domain.selector`
- `test/integration/fixtures/genome-zones.mjs` — converted `targets` to `params` format
- `test/integration/fixtures/genome-actions.mjs` — converted `targets` to `params` format
- `test/integration/fixtures/genome-basic.mjs` — converted `targets` to `params` format
- `test/integration/mutation-traversal.test.mjs` — updated assertions from `action.targets[0].selector` to `action.params[0].domain.selector`
- `test/integration/mutation-operators.test.mjs` — updated assertions from `action.targets[0].selector` to `action.params[0].domain.selector`
- `test/integration/dsl-semantic.test.mjs` — converted inline `baseDefinition()` and test pushes from `targets` to `params` format

## Files NOT Touched (corrected from original)

- `src/dsl/semantic/action-analysis.js` — receives `targets` as a parameter from semantic.js; does not reference `action.targets` directly. No changes needed.
- `test/unit/evolutionary-engine/mutation.test.mjs` — already uses params format (no changes needed)
- `test/unit/dsl/semantic.test.mjs` — already uses params format (no changes needed)

## Out of Scope

No new mutation operators for params. No crossover changes. Game-kernel and simulation-engine fallback patterns (`action.params ?? action.targets`) remain untouched — they are downstream consumers that accept both formats.

## Acceptance Criteria

- [x] token-zone-target-add always produces `params` entries with `{ id, kind, domain: { selector } }` shape.
- [x] traversal.js walks `action.params` only.
- [x] Semantic validation reads `action.params` only, reports errors for invalid param domains, and uses correct `/actions/N/params/` paths.
- [x] actionBindingIds built from params.
- [x] All mutation operators produce schema-valid genomes.
- [x] Integration test fixtures and assertions updated to params format.
- [x] `npm run test:unit` passes (1638 tests).
- [x] `npm run test:integration` passes (183 tests).
- [x] `npm run test:e2e` passes (120 tests).
- [x] `tsc` type check passes.

## Outcome

**What changed vs originally planned:**

The ticket originally listed `src/dsl/semantic/action-analysis.js` as needing changes — it did not, since it receives the targets/params array as a parameter and never accesses `action.targets` directly.

The ticket originally listed only unit test files. In practice, four integration test fixtures (`genome-traversal.mjs`, `genome-zones.mjs`, `genome-actions.mjs`, `genome-basic.mjs`) and three integration test files (`mutation-traversal.test.mjs`, `mutation-operators.test.mjs`, `dsl-semantic.test.mjs`) needed updating because they used the old `targets` format with `{ id, kind, selector }` shape instead of the new `params` format with `{ id, kind, domain: { selector } }`.

Additionally, `traversal.js` had a secondary fallback `target?.domain?.selector ?? target?.selector` that also needed to be cleaned up to `target?.domain?.selector` only, matching the params-only contract.
