# BUIINEVA-3: Barrel export wiring

## Summary

Add `createEvaluator` and relevant type exports to the `evaluation-analytics` barrel file so downstream consumers (CLI, tests) can import from the package index.

## Files to Modify

| File | Change |
|------|--------|
| `src/evaluation-analytics/index.ts` | Add `createEvaluator` export and relevant type exports |

## Depends On

- **BUIINEVA-1** — factory module must exist before exporting it

## Scope

- Add `export { createEvaluator } from "./create-evaluator.js"` to `src/evaluation-analytics/index.ts`
- Add relevant type exports from `create-evaluator.d.ts` (e.g., `CreateEvaluatorOptions`, `EvaluationResult`) if they exist
- Follow the existing export ordering pattern in `index.ts`

## Out of Scope

- No logic changes to any module
- No new tests (barrel exports are verified transitively by BUIINEVA-2 and BUIINEVA-4)
- No CLI changes (BUIINEVA-4)

## Acceptance Criteria

- [ ] `npx tsc --noEmit` passes
- [ ] `import { createEvaluator } from "../evaluation-analytics/index.js"` resolves at runtime without error
- [ ] Export ordering follows existing pattern in `index.ts`

## Invariants

1. Export ordering follows the existing pattern in `index.ts`
2. No existing exports are removed or reordered

## Dependencies

- BUIINEVA-1 (factory module)
