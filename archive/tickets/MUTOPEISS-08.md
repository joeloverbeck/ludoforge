# MUTOPEISS-08 (Future/Optional): Bandit selector implementations

**Status**: Completed
**Priority**: Low
**Depends on**: MUTOPEISS-03
**Blocks**: None

## Summary

Implement `Ucb1Selector` and `ThompsonSelector` with MAP-Elites-aware reward function and `minSelectionProb` epsilon floor. Only enable once real evolution runs confirm determinism is preserved.

**This ticket exists for tracking only. Not to be implemented now.**

## Files to Touch

- New: `src/evolutionary-engine/bandit-selectors.js`
- `schemas/config/evolution-operators.schema.json` — add optional `selectionStrategy` and `minSelectionProb` fields
- `configs/evolution-operators.json` — add strategy config (defaulting to `"weighted"`)

## Out of Scope

- Not to be implemented now

## Acceptance Criteria (when implemented)

- New test: `test/unit/evolutionary-engine/bandit-selectors.test.mjs`
- New test: `test/e2e/operator-selection-ucb1.e2e.test.mjs`
- Determinism with bandit: same seed → same operator sequence
- After warmup, selector favors good operator but still samples bad one (epsilon floor)
- Reward incorporates gridContribution, not only fitness delta

## Outcome

- No implementation performed; ticket explicitly marked Future/Optional and closed without changes.
