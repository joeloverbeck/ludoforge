# AGEENS-10: E2E test for agent portfolio metrics

**Status**: DONE

**Goal**: Prove portfolio metrics work end-to-end with determinism and suite wiring.

**Description**: Add E2E test configuring evaluator with multiple suites, enabling portfolio + extended metrics. Assert determinism, value ranges, suiteResults wiring, and feature vector completeness.

**Assumptions (updated)**:
- Extended metrics already have E2E coverage in `test/e2e/extended-metrics.e2e.test.mjs`; this ticket focuses on suite-driven portfolio metrics.
- Run-cache efficiency is not directly observable via diagnostics, so coverage will assert suiteResults presence and deterministic outputs instead of raw cache hit counts.

**Files to touch**:
- `test/e2e/agent-portfolio-metrics.e2e.test.mjs` (new)
- `test/e2e/fixtures/` (reuse or create fixture with scoring expression)
- `docs/architecture/e2e-coverage.md` (add entry)

**Out of scope**:
- No production code changes
- No adaptive budget testing

**Acceptance criteria**:
- [x] Tests: `node --test test/e2e/agent-portfolio-metrics.e2e.test.mjs` passes
- [x] Two evaluations with same seed produce identical metric values
- [x] `advantage_reversal_rate` deterministic; `policy_sensitivity` within [0,1]
- [x] Feature vector contains both new metric IDs
- [x] diagnostics include suiteResults for configured suites
- [x] Invariant: all existing tests pass

**Dependencies**: AGEENS-09

## Outcome
- Added an E2E test that exercises suite-driven portfolio metrics with deterministic outputs and feature-vector wiring.
- Documented the new E2E coverage entry; no production code changes were required (cache efficiency remained out of scope due to lack of diagnostics).
