# PLACHOISS-11: Remove `resolveActionTargets()` and dead target code

**Status:** DONE
**Dependencies:** PLACHOISS-10
**Blocks:** None

---

## What

Final cleanup. Remove all remnants of the old `targets` system (the pre-params auto-binding path).

## Assumption Corrections (vs original ticket)

The original ticket assumed `resolveActionTargets()` was dead code and that tests would pass unchanged. After codebase audit:

1. **`resolveActionTargets()` is still actively called** in `actions.js` (`checkCostFeasibility`, `checkActionBounds`) and `step-execution.js` (`applyAction` fallback when no explicit args). These callers must be migrated to use `resolveParamDomains` + first-match auto-pick inline, or the auto-binding logic must be inlined where needed.
2. **Fallback patterns `action.params ?? action.targets`** exist in `selectors.js:125` and `actions.js:83`. These must be simplified to just `action.params ?? []`.
3. **JSON Schema** (`schemas/dsl/game-definition.v1.json`) still defines `targets` property on ActionDef and the `TargetDef` definition. These must be removed.
4. **TUI code** (`src/tui/utils/format-action.js`) references `action.targets`. Must be updated to use `action.params`.
5. **`src/dsl/index.ts`** re-exports `TargetDef`. Must be removed.
6. **Tests will require changes**: Several test files explicitly test `resolveActionTargets` or the `targets` fallback:
   - `test/unit/game-kernel/selectors.test.mjs` — has a `resolveActionTargets` describe block including a "falls back to targets" test
   - `test/unit/game-kernel/player-selector.test.mjs` — imports and tests `resolveActionTargets`
   - `test/unit/simulation-engine/step-execution.test.mjs` — tests "falls back to resolveActionTargets" scenarios

## Revised Files to Touch

### Source
- `src/game-kernel/selectors.js` — remove `resolveActionTargets()`, remove `action.targets` fallback
- `src/game-kernel/actions.js` — inline auto-binding via `resolveParamDomains` where `resolveActionTargets` was called; remove `action.params ?? action.targets` fallback
- `src/game-kernel/index.js` — remove `resolveActionTargets` export
- `src/simulation-engine/step-execution.js` — replace `resolveActionTargets` import/usage with inline `resolveParamDomains`-based auto-binding
- `src/dsl/types.ts` — remove `TargetDef` interface and `targets?` from `ActionDef`
- `src/dsl/index.ts` — remove `TargetDef` re-export
- `src/tui/utils/format-action.js` — update to use `action.params` instead of `action.targets`
- `schemas/dsl/game-definition.v1.json` — remove `targets` property and `TargetDef` definition

### Tests (must be updated, not "unchanged")
- `test/unit/game-kernel/selectors.test.mjs` — remove `resolveActionTargets` tests; remove "falls back to targets" test
- `test/unit/game-kernel/player-selector.test.mjs` — remove `resolveActionTargets` import and tests (keep `resolvePlayerSelector` tests)
- `test/unit/simulation-engine/step-execution.test.mjs` — update "falls back to resolveActionTargets" test descriptions; behavior is preserved (auto-pick first match) but via `resolveParamDomains` now

## Out of Scope

No behavioral changes to the simulation. The auto-binding fallback (pick first match from domain) is preserved — it just no longer goes through a dedicated `resolveActionTargets()` function or supports the old `targets` shape.

## Acceptance Criteria

- `grep -r "resolveActionTargets\|action\.targets\|TargetDef" src/` returns zero matches.
- `grep -r "resolveActionTargets\|action\.targets\|TargetDef" schemas/` returns zero matches.
- `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` pass.
- `tsc -p tsconfig.json` passes.

## Outcome

### What changed vs originally planned

The original ticket assumed `resolveActionTargets()` was dead code and tests would pass unchanged. In reality:

1. **`resolveActionTargets()` was still actively used** in 3 call sites (`checkCostFeasibility`, `checkActionBounds`, `applyAction` fallback). It was replaced with a new `autoBindParams()` function that delegates to `resolveParamDomains` + first-match picking — same behavior, no dependency on old `targets` shape.
2. **6 test files required updates** (not zero as the ticket claimed): selectors, player-selector, step-execution, format-action, and dsl/types tests all referenced `resolveActionTargets`, `action.targets`, or `TargetDef`.
3. **JSON Schema and TUI code** were not mentioned in the original ticket but also contained `targets`/`TargetDef` references that needed removal.

### Actual changes
- **Source files modified (8):** `selectors.js`, `actions.js`, `index.js`, `step-execution.js`, `types.ts`, `index.ts`, `format-action.js`, `game-definition.v1.json`
- **Test files modified (4):** `selectors.test.mjs`, `player-selector.test.mjs`, `step-execution.test.mjs`, `format-action.test.mjs`, `types.test.ts`
- **New function:** `autoBindParams(params, state, context)` replaces `resolveActionTargets()` with a cleaner API that takes params directly instead of an action object
- **No behavioral changes:** auto-binding (pick first domain match) is preserved; only the old `targets` shape support is removed
