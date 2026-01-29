# BUIINEVA-4: CLI changes

## Summary

Remove the `--evaluator` plugin mechanism from the CLI and replace it with the built-in `createEvaluator()`. Update CLI unit tests accordingly.

## Files to Modify

| File | Change |
|------|--------|
| `src/cli/ludoforge-evolve.js` | Remove `--evaluator` flag, `loadEvaluator()`, plugin loading; add `createEvaluator` import and usage |
| `test/unit/cli/ludoforge-evolve.test.mjs` | Remove evaluator mock/argv references; update tests for new behavior |

## Depends On

- **BUIINEVA-1** — factory must exist
- **BUIINEVA-3** — barrel export must be wired

## Scope

### Removals from `src/cli/ludoforge-evolve.js`

- Remove `"--evaluator"` from `VALUE_FLAGS`
- Remove the `loadEvaluator()` function entirely
- Remove `else if (flag === "--evaluator")` branch from `parseArgs()`
- Remove `loadEvaluatorModule` from `resolveDeps()`
- Remove `"  --evaluator <path> Path to evaluator module (required unless --dry-run)"` from `createUsage()`

### Additions to `src/cli/ludoforge-evolve.js`

- Import `createEvaluator` from `../evaluation-analytics/create-evaluator.js`
- Create evaluation **once** before the resume/fresh-run branching logic:
  ```js
  // After dry-run checks but before runEvolutionRunner calls:
  const evaluation = createEvaluator();
  ```
- Replace both `loadEvaluator` call sites (resume path and fresh-run path) with the shared `evaluation` variable
- Remove `await` since `createEvaluator()` is synchronous

### CLI test updates (`test/unit/cli/ludoforge-evolve.test.mjs`)

- Remove evaluator-related mock setup and argv entries (e.g., `--evaluator ./mock-eval.js`)
- Update test assertions that checked for evaluator loading behavior
- Verify `--evaluator` is rejected as an unknown flag
- Verify `--help` output no longer mentions `--evaluator`

## Out of Scope

- No E2E test changes (BUIINEVA-5)
- No documentation changes (BUIINEVA-6)
- No changes to `create-evaluator.js` itself

## Acceptance Criteria

- [ ] `node --test test/unit/cli/ludoforge-evolve.test.mjs` passes
- [ ] `npm run test:unit` passes
- [ ] `--evaluator` is rejected as an unknown flag
- [ ] `--help` output no longer mentions `--evaluator`
- [ ] `evaluation` shape `{ evaluator }` is unchanged from what the runner expects

## Invariants

1. `evaluation` shape `{ evaluator }` is unchanged — the runner receives the same interface
2. Dry-run paths still work without calling `createEvaluator`
3. No runtime errors from removed imports or dead code references

## Dependencies

- BUIINEVA-1 (factory implementation)
- BUIINEVA-3 (barrel export)
