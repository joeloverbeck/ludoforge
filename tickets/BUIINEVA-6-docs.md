# BUIINEVA-6: Documentation updates

## Summary

Update architecture documentation to reflect the removal of `--evaluator` and the addition of the built-in evaluator.

## Files to Modify

| File | Change |
|------|--------|
| `docs/architecture/pipeline-overview.md` | Remove `--evaluator` references, update pipeline diagram to show evaluation as built-in |
| `docs/architecture/evolutionary-engine.md` | Remove external evaluator language, update evaluation adapter docs |
| `docs/architecture/metrics-and-fitness.md` | Add built-in evaluator section documenting `createEvaluator` wiring and options |

## Depends On

- **BUIINEVA-4** — CLI changes must be finalized before documenting behavior

## Scope

### `pipeline-overview.md`

- Remove any mention of `--evaluator <path>` as a CLI argument
- Update pipeline diagram to show evaluation as a built-in stage (not an external plugin)
- Update text describing how evaluation is configured

### `evolutionary-engine.md`

- Remove references to external evaluator modules
- Update evaluation adapter documentation to reflect built-in wiring

### `metrics-and-fitness.md`

- Add a new section describing the built-in evaluator (`createEvaluator`)
- Document the 13-step pipeline
- Document available options and their defaults
- Document the return value shape

## Out of Scope

- No code changes
- No changes to `CLAUDE.md` or `README.md`
- No changes to JSON Schema files

## Acceptance Criteria

- [ ] No references to `--evaluator <path>` remain in the 3 docs files
- [ ] Pipeline diagram shows evaluation as a built-in stage
- [ ] `createEvaluator` options are documented in `metrics-and-fitness.md`
- [ ] Documentation matches the implemented behavior from BUIINEVA-1 and BUIINEVA-4

## Invariants

1. Documentation accurately reflects the implemented behavior
2. No stale references to the removed `--evaluator` flag

## Dependencies

- BUIINEVA-4 (CLI changes finalized)
