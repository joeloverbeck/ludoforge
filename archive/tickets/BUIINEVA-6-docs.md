# BUIINEVA-6: Documentation updates

**Status: COMPLETED**

## Summary

Update architecture documentation to reflect the built-in evaluator (`createEvaluator`).

## Assumptions Reassessed

- **`--evaluator` references in docs**: None found. Prior tickets (BUIINEVA-4) already removed all CLI plugin references from code. The docs never had explicit `--evaluator <path>` mentions either — they used generic language ("invoke `options.evaluator(genome)`") which remains correct since the evaluation adapter still calls `options.evaluator`.
- **"External evaluator language" in `evolutionary-engine.md`**: The evaluation adapter docs describe `options.evaluator(genome)` which is the correct internal API — the adapter receives an evaluator function regardless of how it was created. No removal needed; the language is implementation-neutral.
- **`pipeline-overview.md` diagram**: Already describes evaluation as stages 2-3 ("Evaluate each genome" → "Simulate and compute analytics") without mentioning external plugins. The main gap is that it doesn't mention `createEvaluator` as the built-in wiring.

## Revised Scope

### `pipeline-overview.md`

- Add a note in stage 2-3 referencing `createEvaluator` as the built-in evaluation factory
- No `--evaluator` references to remove (none exist)

### `evolutionary-engine.md`

- Add a note in the Evaluation Adapter section clarifying that `createEvaluator` provides the default evaluator function
- No "external evaluator language" to remove (the adapter correctly describes its internal interface)

### `metrics-and-fitness.md`

- Add a new "Built-in Evaluator" section documenting:
  - `createEvaluator` factory location and purpose
  - The 13-step pipeline
  - Available options and defaults
  - Return value shape

## Out of Scope

- No code changes
- No changes to `CLAUDE.md` or `README.md`
- No changes to JSON Schema files

## Acceptance Criteria

- [x] No stale `--evaluator <path>` references in the 3 docs files (verified: none existed)
- [x] Pipeline overview references `createEvaluator` as the built-in evaluation factory
- [x] Evaluation adapter docs note `createEvaluator` as the default evaluator source
- [x] `createEvaluator` options documented in `metrics-and-fitness.md`
- [x] Documentation matches the implemented behavior

## Invariants

1. Documentation accurately reflects the implemented behavior
2. No stale references to the removed `--evaluator` flag

## Dependencies

- BUIINEVA-4 (CLI changes finalized) — satisfied

## Outcome

**What changed vs originally planned:**

The ticket assumed `--evaluator <path>` references and "external evaluator language" existed in the docs and needed removal. In reality, prior tickets had already removed all CLI plugin references, and the docs used implementation-neutral language (`options.evaluator(genome)`) that remains correct.

**Actual changes:**
- `docs/architecture/pipeline-overview.md`: Added `createEvaluator()` reference in stages 2-3 describing it as the built-in evaluation factory and cross-referencing the metrics-and-fitness doc.
- `docs/architecture/evolutionary-engine.md`: Added note in step 4 of the evaluation adapter clarifying that `createEvaluator()` provides the default evaluator function.
- `docs/architecture/metrics-and-fitness.md`: Added full "Built-in Evaluator" section documenting `createEvaluator` factory, 10 options with defaults, 13-step pipeline, return value shape, and error handling.

**No code changes.** No tests added (docs-only ticket). All 408 unit tests pass. Type check passes.
