# EVOQUAOVE-18: Update architecture documentation

**Phase:** Final
**Depends on:** All previous EVOQUAOVE tickets

## Problem

The spec introduces significant changes across degeneracy detection, repair pipeline, mutation weights, seed generation, evaluation, and runner behavior. The existing architecture documentation in `docs/architecture/` may not reflect these changes.

## Task

Review all architecture docs and update them to reflect the changes from EVOQUAOVE-01 through EVOQUAOVE-17. This is a documentation-only ticket — no code changes.

## Files to review and potentially update

- `docs/architecture/README.md` — overall architecture overview
- `docs/architecture/evolutionary-engine.md` — repair fallback, structural guards, operator weighting, adaptive weights
- `docs/architecture/evolution-runner.md` — rejection rate halting, health metrics, operator telemetry integration
- `docs/architecture/metrics-and-fitness.md` — multiplicative penalty, degeneracy weight zeroing, non-finite guard, compound rejection
- `docs/architecture/pipeline-overview.md` — repair fallback in mutation pipeline, seed validation changes
- `docs/architecture/e2e-coverage.md` — new test coverage areas if applicable
- `docs/architecture/simulation-engine.md` — likely no changes needed
- `docs/architecture/human-feedback.md` — likely no changes needed

## Out of scope

- Do NOT change any source code
- Do NOT change any config files
- Do NOT change any test files
- Do NOT create new architecture docs unless an existing doc clearly needs splitting

## Acceptance criteria

### Specific updates required

1. **Repair pipeline**: Document the fallback-to-original behavior (EVOQUAOVE-01), structural minimums (EVOQUAOVE-09), and reference validation (EVOQUAOVE-10)
2. **Degeneracy handling**: Document `no-choices` rejection (EVOQUAOVE-06), multiplicative penalty (EVOQUAOVE-07), compound rejection (EVOQUAOVE-16), weight zeroing (EVOQUAOVE-04)
3. **Operator weights**: Document differentiated weights (EVOQUAOVE-05), structural guards (EVOQUAOVE-02), adaptive weighting (EVOQUAOVE-17)
4. **Seed generation**: Document special-bin rejection (EVOQUAOVE-08) and semantic validation (EVOQUAOVE-12)
5. **Runner observability**: Document rejection tracking (EVOQUAOVE-13), early stopping (EVOQUAOVE-14), health metrics (EVOQUAOVE-15)
6. **Evaluator**: Document non-finite fitness guard (EVOQUAOVE-03)
7. **Semantic validation**: Document severity levels (EVOQUAOVE-11)

### Invariants

- All existing architecture doc sections remain present (no deletions of sections unrelated to this spec)
- Documentation accurately reflects the implemented behavior
- No code changes in this ticket
