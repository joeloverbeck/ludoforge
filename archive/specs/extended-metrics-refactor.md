# Extended Metrics Refactor (SRP)

## Context
`src/evaluation-analytics/metrics/extended.js` is ~560 lines and mixes several responsibilities: metric math helpers, summary/coverage metrics, decision-quality sampling logic, rollout orchestration, and the aggregation/export surface. This makes it harder to change or test in isolation.

This spec proposes a refactor that preserves all current behavior and public APIs while splitting the module into smaller, responsibility-focused files. No runtime behavior changes are intended.

## Goals
- Reduce file size and improve cohesion by splitting `extended.js` into focused modules.
- Isolate pure math/stat utilities from game/simulation logic.
- Maintain existing public exports and types.
- Ensure all refactored code paths are covered by integration tests in `test/integration/`.

## Non-Goals
- Change metric definitions, default parameters, or output IDs.
- Change performance characteristics beyond negligible overhead from additional module boundaries.
- Modify non-metrics code.

## Current Responsibilities (to separate)
1. **Summary statistics utilities**
   - `safeNumber`, `average`, `computePearsonCorrelation`
2. **Length & termination metrics**
   - `computeLengthMean`, `computeLengthVariance`, `computeEarlyTerminationRate`
3. **Outcome variance metric**
   - `outcomeToScore`, `computeOutcomeVariance`
4. **Coverage metrics**
   - `computeCoverageActions`, `computeCoverageState`
5. **Decision-quality sampling utilities**
   - `normalizePositiveInt`, `normalizePercent`, `normalizeSeed`, `buildSeed`
   - `cloneState`, `resolveRolloutAgent`, `createForcedActionAgent`
   - `resolveTerminalState`, `resolveOutcomeValue`, `deriveDecisionPoint`, `sampleDecisionPoints`
6. **Decision-quality metrics**
   - `computeMeaningfulChoice`
   - `computeComebackPotential`
7. **Aggregation & options handling**
   - `computeExtendedMetrics`

## Proposed Module Structure
Introduce a sub-folder and consolidate imports/exports through a single entry point.

```
src/evaluation-analytics/metrics/extended/
  index.js                 # re-exports public API
  aggregation.js           # computeExtendedMetrics
  length-metrics.js        # mean/variance/early termination
  outcome-metrics.js       # outcome variance helpers
  coverage-metrics.js      # action/state coverage
  decision-quality/
    meaningful-choice.js   # computeMeaningfulChoice
    comeback-potential.js  # computeComebackPotential
    sampling-utils.js      # seed/build/normalize/sampling helpers
  math-utils.js            # safeNumber/average/pearson
```

Notes:
- `math-utils.js` stays pure and dependency-free.
- `sampling-utils.js` contains all randomized selection, state cloning, and rollout helper utilities used by decision-quality metrics.
- `aggregation.js` keeps only assembly and option gating. It should not implement metric logic.
- `index.js` re-exports exactly the same named functions currently exported from `metrics/extended.js` so callers do not change.

## API & Type Surface
- Keep `src/evaluation-analytics/metrics/extended.js` as a thin re-export (or redirect) to `metrics/extended/index.js` during transition to avoid changing import paths. If we choose to replace it entirely with a re-export file, ensure tests still import the same path.
- Update `src/evaluation-analytics/metrics/extended.d.ts` to match the new internal file structure (no changes to public types).
- `src/evaluation-analytics/index.ts` exports remain unchanged.

## Refactor Principles Applied
- **Single Responsibility**: each module owns one metric family or utility concern.
- **Pure vs. Impure Separation**: math helpers are pure; decision-quality logic is the only section using simulation/game-kernel side effects.
- **Encapsulation**: seed normalization and rollout agent construction are hidden in decision-quality utilities.
- **Stable Interfaces**: public exports and metric IDs remain identical.

## Integration Test Plan (Required)
No integration tests currently exercise extended metrics. We will add at least two integration tests that cover all refactored code paths.

### New Integration Test 1: Extended Metrics End-to-End
**File:** `test/integration/extended-metrics.test.mjs`

**Purpose:** Exercise `computeExtendedMetrics` with real simulations and summaries so the aggregation layer, coverage metrics, length metrics, and outcome variance are exercised together.

**Outline:**
- Build a minimal game definition with two actions and scoring.
- Use the simulation engine to produce a couple of runs (trajectory summaries + outcomes).
- Convert runs to the summaries format used by evaluation analytics (or use existing summary creation utilities if available).
- Call `computeExtendedMetrics` with default options.
- Assert:
  - All standard metric IDs are present.
  - Expected deterministic values for `length_mean`, `length_variance`, `early_termination_rate`, `outcome_variance`, `coverage_actions`, and `coverage_state` based on known outcomes.

**Coverage:**
- `length-metrics.js`
- `outcome-metrics.js`
- `coverage-metrics.js`
- `aggregation.js`

### New Integration Test 2: Decision-Quality Metrics
**File:** `test/integration/decision-quality-metrics.test.mjs`

**Purpose:** Exercise decision-quality sampling, rollout agents, seeding, and decision point derivation.

**Outline:**
- Use the existing “meaningful choice” definition from unit tests (ported into integration test).
- Run a simulation via `createSimulationEngine` to obtain a run.
- Call `computeExtendedMetrics` with both `meaningfulChoice` and `comebackPotential` enabled.
- Assert:
  - `choice_value_spread` is deterministic (same value as current unit test: `2`).
  - `comeback_potential` is deterministic and within [0, 1].

**Coverage:**
- `decision-quality/sampling-utils.js`
- `decision-quality/meaningful-choice.js`
- `decision-quality/comeback-potential.js`
- `math-utils.js` (Pearson correlation)
- `aggregation.js`

### Optional Integration Test 3: Skill Expression Gate
**File:** `test/integration/skill-expression-metric.test.mjs`

**Purpose:** Verify `skill_expression` metric gating works from the top-level integration path.

**Outline:**
- Use a minimal definition.
- Call `computeExtendedMetrics` with `skillExpression.enabled` true and false.
- Assert presence/absence of `skill_expression`.

**Coverage:**
- `aggregation.js` and `metrics/skill-expression.js` integration path.

## Migration Steps
1. Create new modules with one responsibility each (per structure above).
2. Move existing functions into modules without behavior changes; keep function names/signatures intact.
3. Replace `extended.js` with re-export (or maintain as thin wrapper that imports from `extended/index.js`).
4. Update `extended.d.ts` to match the new module entry point.
5. Add integration tests described above and ensure they pass.

## Risks & Mitigations
- **Behavior drift from refactor**: Use strict integration assertions on deterministic metrics. Keep unit tests unchanged.
- **Import cycles**: Keep `math-utils.js` dependency-free; decision-quality modules should import from utils but not from aggregation.
- **Seed determinism**: Ensure seed normalization/building stays identical and is not duplicated.

## Acceptance Criteria
- `src/evaluation-analytics/metrics/extended.js` is under 200 lines and delegates logic to focused modules.
- All existing unit tests pass unchanged.
- New integration tests in `test/integration/` cover all refactored modules and pass.
- Public exports and metric IDs are unchanged.
