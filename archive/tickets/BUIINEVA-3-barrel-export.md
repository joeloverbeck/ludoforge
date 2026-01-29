# BUIINEVA-3: Barrel export wiring

**Status: COMPLETED**

## Summary

Add `createEvaluator` and relevant type exports to the `evaluation-analytics` barrel file so the TypeScript type checker sees the full public surface of the module.

## Files to Modify

| File | Change |
|------|--------|
| `src/evaluation-analytics/index.ts` | Add `createEvaluator` value export and all type exports from `create-evaluator.d.ts` |

## Depends On

- **BUIINEVA-1** — factory module must exist before exporting it

## Scope

- Add `export { createEvaluator } from "./create-evaluator.js"` to `src/evaluation-analytics/index.ts`
- Add type exports (`CreateEvaluatorOptions`, `CreateEvaluatorResult`, `EvaluationResult`, `EvaluationResultSuccess`, `EvaluationResultFailure`, `EvaluationDiagnosticsSuccess`, `EvaluationDiagnosticsFailure`, `Evaluator`, `EvaluatorGenome`) from `./create-evaluator.js`
- Follow the existing export ordering pattern in `index.ts`

## Assumption Corrections (vs. original ticket)

1. **Runtime import criterion removed**: The original ticket assumed `import { createEvaluator } from "../evaluation-analytics/index.js"` should resolve at runtime. This is incorrect — `index.ts` is a type-only barrel file (`noEmit: true` in tsconfig), never compiled to JS. All runtime imports in this codebase go directly to individual `.js` files (e.g., `./create-evaluator.js`). The barrel only serves `tsc` type checking.
2. **`npx tsc` → `tsc`**: The project CLAUDE.md specifies `tsc` must be installed globally; `npx tsc` will fail because `typescript` is not a project dependency.
3. **Type exports expanded**: The original ticket said "e.g., `CreateEvaluatorOptions`, `EvaluationResult`" — the actual `.d.ts` exports 9 types, all added.

## Out of Scope

- No logic changes to any module
- No new tests (barrel exports are verified transitively by BUIINEVA-2 and BUIINEVA-4)
- No CLI changes (BUIINEVA-4)

## Acceptance Criteria

- [x] `tsc -p tsconfig.json` passes (no errors)
- [x] Export ordering follows existing pattern in `index.ts`
- [x] All types from `create-evaluator.d.ts` are re-exported
- [x] No existing exports are removed or reordered

## Invariants

1. Export ordering follows the existing pattern in `index.ts`
2. No existing exports are removed or reordered

## Dependencies

- BUIINEVA-1 (factory module)

## Outcome

**What was changed**: Added `createEvaluator` value export and 9 type exports (`CreateEvaluatorOptions`, `CreateEvaluatorResult`, `EvaluationDiagnosticsFailure`, `EvaluationDiagnosticsSuccess`, `EvaluationResult`, `EvaluationResultFailure`, `EvaluationResultSuccess`, `Evaluator`, `EvaluatorGenome`) to `src/evaluation-analytics/index.ts`.

**vs. originally planned**: The original ticket's scope was correct (add exports to barrel). Three assumptions were corrected: (1) the runtime import acceptance criterion was invalid since `index.ts` is type-only, (2) `npx tsc` was corrected to `tsc`, (3) the type export list was expanded from 2 examples to all 9 types actually present in the `.d.ts`.

**No new tests added**: The barrel is type-only — `tsc` is the verification mechanism, not runtime imports. The 382 existing unit tests (including 16 `create-evaluator` tests) continue to pass.
