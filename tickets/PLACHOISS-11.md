# PLACHOISS-11: Remove `resolveActionTargets()` and dead target code

**Status:** TODO
**Dependencies:** PLACHOISS-10
**Blocks:** None

---

## What

Final cleanup. Remove all remnants of the old targets system.

## Files to Touch

- `src/game-kernel/selectors.js` — remove `resolveActionTargets()`
- `src/game-kernel/index.js` — remove export
- `src/dsl/types.ts` — remove `TargetDef` if still present
- Any remaining references found via grep

## Out of Scope

No behavioral changes. Pure dead code removal.

## Acceptance Criteria

- `grep -r "resolveActionTargets\|action\.targets\|TargetDef" src/` returns zero matches.
- All test suites pass unchanged.
- `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` pass.
- `tsc -p tsconfig.json` passes.
