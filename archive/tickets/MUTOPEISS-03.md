# MUTOPEISS-03: OperatorSelector abstraction + WeightedSelector + wire into orchestrator

**Status**: Completed
**Priority**: High
**Depends on**: MUTOPEISS-01, MUTOPEISS-02
**Blocks**: MUTOPEISS-06, MUTOPEISS-08

## Summary

Create `OperatorSelector` interface (`pick(rng) → operatorName`, `observe(name, outcome)`). Implement `WeightedSelector` using MUTOPEISS-02's utility. Wire into `mutateGenome` / `mutateAndRepairGenome` so the runner can pass a selector and get back which operator was used per child.

## Files to Touch

- New: `src/evolutionary-engine/operator-selector.js`
- New: `src/evolutionary-engine/operator-selector.d.ts`
- `src/evolutionary-engine/mutation/orchestrator.js` — accept optional `selector` in options; when present, use `selector.pick(rng)` instead of `getRandomIndex`; return `{ genome, operatorName }` when selector is provided
- `src/evolutionary-engine/mutation.js` — re-export new types
- `src/evolutionary-engine/mutation.d.ts` — add `MutationResult` type, update signatures
- `src/evolutionary-engine/index.ts` — export selector types for public API parity
- `src/evolution-runner/runner.js` — update `applyEvolution` to pass selector and capture `operatorName` per child
- `src/evolution-runner/runner.d.ts` — update to reflect selector-aware mutation results if needed

## Out of Scope

- Telemetry accumulation
- Bandit selectors
- MAP-Elites changes

## Acceptance Criteria

- New test: `test/unit/evolutionary-engine/operator-selector.test.mjs`
  - `WeightedSelector.pick(rng)` is deterministic given seed
  - `WeightedSelector.pick(rng)` only returns enabled operator names
  - `observe()` is a no-op on WeightedSelector (stores nothing, doesn't crash)
- Existing test: `test/e2e/evolution-pipeline.e2e.test.mjs` — deterministic evaluation still passes
- Existing test: `test/e2e/evolution-mutation-repair.e2e.test.mjs` — valid children still produced
- **Invariant**: When no selector is passed, `mutateGenome` behaves identically to before (backward compatible)
- **Invariant**: Operator picks are deterministic given same seed + same operator ordering + same weights

## Outcome

- Added `OperatorSelector`/`WeightedSelector` with deterministic weighted picking and no-op `observe`.
- Updated mutation orchestrator to accept selectors and return `{ genome, operatorName }` when used, with updated typings/exports.
- Runner now builds a weighted selector (when weights are available) and captures operator names for downstream telemetry.
