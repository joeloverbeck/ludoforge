# AGEENS-06: advantage_reversal_rate metric

**Status**: DONE

**Goal**: Count leader changes during a match (momentum swings), normalize to [0,1].

**Description**: Implemented `computeAdvantageReversalRate(definition, simulations, options?)`. Uses `computeScoresAtState` from game-kernel. For each simulation: computes leader at each step, counts leader changes, normalizes as `changes / (stepCount - 1)`. Averages across runs. Returns 0 when scoring unavailable. Wired into `aggregation.js` as optional metric.

**Files touched**:
- `src/evaluation-analytics/metrics/extended/decision-quality/advantage-reversal.js` (new)
- `src/evaluation-analytics/metrics/extended/aggregation.js` (modified — added advantage_reversal_rate block)
- `src/evaluation-analytics/metrics/extended/config.js` (modified — added defaults)
- `configs/metrics-extended.json` (modified — added `advantageReversal` section)
- `schemas/config/metrics-extended.schema.json` (modified — added `AdvantageReversalConfig` def + property)
- `test/unit/evaluation-analytics/advantage-reversal.test.mjs` (new)

**Out of scope**:
- No portfolio/suite integration (that's AGEENS-09)
- No feature vector weight changes
- No fitness weight changes
- No `agent_robustness` metric

**Acceptance criteria**:
- [x] Tests: `node --test test/unit/evaluation-analytics/advantage-reversal.test.mjs` passes
- [x] Leader never changes -> metric = 0
- [x] Leader alternates every step -> metric matches expected normalized value
- [x] Scoring unavailable -> metric = 0 (graceful degradation)
- [x] Metric ID `advantage_reversal_rate` appears in extended metrics array when enabled
- [x] Invariant: all existing tests pass; existing metrics unaffected

**Dependencies**: None (uses same patterns as `comeback-potential.js`)
