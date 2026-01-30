# AGEENS-01: E2E test for existing extended metrics determinism

**Status**: COMPLETED

**Goal**: Close the known E2E gap documented in `docs/architecture/e2e-coverage.md`.

**Description**: Add an E2E test that enables all extended metrics (`meaningfulChoice`, `comebackPotential`, `skillExpression`, `advantageReversal`, `policySensitivity`), uses a fixed seed + fixed genome fixture, and asserts determinism and correct wiring.

**Assumptions reassessed** (2026-01-30):
- The codebase has 5 conditional extended metrics (not 3 as originally implied):
  `meaningfulChoice` → `choice_value_spread`, `comebackPotential` → `comeback_potential`,
  `skillExpression` → `skill_expression`, `advantageReversal` → `advantage_reversal_rate`,
  `policySensitivity` → `policy_sensitivity`.
- There are also 6 always-on extended metrics (`length_mean`, `length_variance`,
  `early_termination_rate`, `outcome_variance`, `coverage_actions`, `coverage_state`).
- `comebackPotential` and `advantageReversal` require a fixture with
  `termination.scoring.perPlayer`; without it, they degrade to 0.
  The existing fixture `per-player-vars-game.json` has a scoring expression.
- `meaningfulChoice` needs decision points (≥2 legal actions). `choice-game.json` and
  `per-player-vars-game.json` both have 2 actions with preconditions.
- No production code changes are needed. The evaluator already supports
  `includeExtendedMetrics` and `extendedMetricsOptions`.

**Files to touch**:
- `test/e2e/extended-metrics.e2e.test.mjs` (new)
- `docs/architecture/e2e-coverage.md` (mark gap as covered)

**Out of scope**:
- No production code changes
- No new metrics
- No schema changes
- No changes to existing extended metric implementations

**Acceptance criteria**:
- [x] Tests: `node --test test/e2e/extended-metrics.e2e.test.mjs` passes
- [x] Two evaluator calls with same seed + genome produce `deepStrictEqual` extended metrics
- [x] Feature vector contains keys `choice_value_spread`, `comeback_potential`, `skill_expression`, `advantage_reversal_rate`, `policy_sensitivity`
- [x] All always-on extended metrics present: `length_mean`, `length_variance`, `early_termination_rate`, `outcome_variance`, `coverage_actions`, `coverage_state`
- [x] Invariant: all existing tests pass (`npm run test:unit`, `npm run test:e2e`)

**Dependencies**: None

## Outcome

**What was actually changed vs originally planned:**

The original ticket assumed 3 conditional extended metrics (`meaningfulChoice`, `comebackPotential`, `skillExpression`). Reassessment found 5 conditional metrics (also `advantageReversal`, `policySensitivity`) and 6 always-on metrics. The test scope was expanded to cover all 11 extended metrics.

**Files changed:**
- `test/e2e/extended-metrics.e2e.test.mjs` — **new** (6 tests in 4 describe blocks):
  - Determinism: identical seed + genome produces identical extended metrics, feature vectors, and fitness
  - Feature vector wiring: all 5 conditional metric keys present when enabled
  - Feature vector wiring: all 6 always-on metric keys present
  - Diagnostics shape: `extendedMetrics` array contains all expected metric IDs with numeric values
  - Graceful degradation: comeback_potential and advantage_reversal_rate degrade to 0 without scoring expression
  - Disabled baseline: extendedMetrics is null and conditional keys absent when `includeExtendedMetrics` is false
- `docs/architecture/e2e-coverage.md` — moved "Extended metrics aggregation" from Gaps to Proven Uses
- No production code changes (as planned)
