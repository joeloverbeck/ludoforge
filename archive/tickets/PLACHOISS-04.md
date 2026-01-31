# PLACHOISS-04: Migrate all test fixtures from `targets` to `params`

**Status:** COMPLETED
**Dependencies:** PLACHOISS-03
**Blocks:** PLACHOISS-05

---

## What

Mechanical conversion of every fixture using `action.targets` to `action.params`, plus a minimal runtime compatibility shim so the runtime reads `params` first, falling back to `targets`.

## Assumption Corrections vs Original Ticket

1. **"No runtime code changes"** — WRONG. The runtime (`selectors.js`, `actions.js`, `semantic.js`, `traversal.js`, `token-zone-target-add.js`) reads `action.targets` exclusively. Migrating fixtures to `params` without a runtime shim would break 44+ test files. A thin compatibility layer (`action.params ?? action.targets`) was required.
2. **"No new test cases"** — WRONG. A fallback test was added to verify that `targets` still works when `params` is absent (backward compatibility invariant).
3. **Incomplete file list** — the original ticket missed: `test/unit/game-kernel/player-selector.test.mjs`, `test/unit/game-kernel/selectors.test.mjs`, `test/unit/evolutionary-engine/mutation.test.mjs`, `test/unit/dsl/semantic.test.mjs`, `src/game-kernel/selectors.js`, `src/game-kernel/actions.js`, `src/dsl/semantic.js`, `src/evolutionary-engine/mutation/traversal.js`, `src/evolutionary-engine/mutation/operators/token-zone-target-add.js`.
4. **ParamDef shape differs from TargetDef** — `TargetDef` has `selector` at top level; `ParamDef` nests it under `domain.selector`. The runtime also needed `target.domain?.selector ?? target.selector` to handle both shapes.
5. **Mutation operator write path** — `token-zone-target-add.js` reads from `params`/`targets` and writes back to the same key, producing `ParamDef`-shaped entries when the source uses `params`.

## Files Touched

### Runtime (compatibility shim)
- `src/game-kernel/selectors.js` — read `action.params ?? action.targets`, resolve `target.domain?.selector ?? target.selector`
- `src/game-kernel/actions.js` — read `action.params ?? action.targets`
- `src/dsl/semantic.js` — read `action?.params ?? action?.targets`, resolve `target?.domain?.selector ?? target?.selector`
- `src/evolutionary-engine/mutation/traversal.js` — read `action.params ?? action.targets`, resolve `target?.domain?.selector ?? target?.selector`
- `src/evolutionary-engine/mutation/operators/token-zone-target-add.js` — read from `params`/`targets`, write back to same key with correct shape

### JSON Fixtures (targets → params)
- `test/unit/fixtures/dsl/valid/minimal.json`
- `test/unit/fixtures/dsl/invalid/no-meaningful-actions.json`
- `test/unit/fixtures/dsl/invalid/dominant-action.json`
- `test/unit/fixtures/dsl/invalid/missing-max-turns.json`
- `test/unit/fixtures/dsl/invalid/missing-termination-conditions.json`
- `test/unit/fixtures/dsl/invalid/missing-termination.json`
- `test/e2e/fixtures/multi-token-game.json`
- `test/e2e/fixtures/visibility-game.json`

### Test Files (inline fixture references)
- `test/unit/game-kernel/selectors.test.mjs` — migrated inline targets to params, added fallback test
- `test/unit/game-kernel/player-selector.test.mjs` — migrated inline targets to params
- `test/unit/evolutionary-engine/mutation.test.mjs` — updated target references to params
- `test/unit/dsl/semantic.test.mjs` — updated target references to params

## Out of Scope

- Removing `TargetDef` from the JSON Schema (still accepted for backward compatibility)
- Migrating integration test inline fixtures (they use `targets` in programmatic genomes which still work via fallback)
- Migrating evolutionary engine operator output to always write `params` (only `token-zone-target-add` was updated)

## Acceptance Criteria

- [x] All 8 JSON fixture files pass schema validation with `params` instead of `targets`.
- [x] No JSON fixture file contains `"targets"` at action level.
- [x] Runtime reads `params` first, falls back to `targets` (backward compatible).
- [x] `tsc -p tsconfig.json` passes.
- [x] Unit tests pass (1449 tests, +1 new).
- [x] Integration tests pass (183 tests).
- [x] E2E tests pass (120 tests).

## Outcome

**What changed vs originally planned:**

The original ticket was a "no runtime code changes, no new test cases" mechanical fixture conversion. This was impossible: the runtime read `action.targets` exclusively, and `ParamDef` nests selectors under `domain.selector` (different shape from `TargetDef`). Three categories of changes were needed beyond the original scope:

1. **Runtime compatibility shim** (5 source files): Added `action.params ?? action.targets` fallback in the game-kernel, DSL semantic checks, and evolutionary-engine traversal/mutation operators. Also added `target.domain?.selector ?? target.selector` to handle the `ParamDef` nested selector shape.

2. **Mutation operator write path** (1 source file): `token-zone-target-add.js` needed to detect whether the source action uses `params` or `targets` and write back to the same key with the correct entry shape.

3. **Test file updates** (4 test files): Inline fixture references in `semantic.test.mjs`, `mutation.test.mjs`, `selectors.test.mjs`, and `player-selector.test.mjs` needed updating. One new backward-compatibility test was added.

**Actual changes:** 5 runtime source files, 8 JSON fixture files, 4 test files. Total: 1449 unit + 183 integration + 120 E2E tests pass.
