# EVOQUAOVE-16: Compound degeneracy rejection rule

**Spec ref:** EQ-04
**Phase:** 4 — Observability and adaptive control
**Depends on:** EVOQUAOVE-06 (EQ-01 — flag escalation)

## Problem

Individual penalties are weak. A game can accumulate `forced-move + dominant-action + trivial-win + stalemate` (penalty ~0.9) and still score positive if the base composite is high. There is no cliff that prevents flag accumulation.

## Fix

Add a compound rule: if the number of active penalty flags exceeds a configurable threshold (default: 3), reject the genome entirely regardless of individual flag policies.

Add to `configs/degeneracy.json`:
```json
"compoundRejection": {
  "enabled": true,
  "maxPenaltyFlags": 3
}
```

Implement in `applyDegeneracyFilters()` in `degeneracy-penalty.js`: after checking individual flag policies, count the number of active "penalize" flags. If count > `maxPenaltyFlags`, return `{ allow: false, rejectedFlags: [...activeFlags], compoundRejection: true }`.

## Files to touch

- `configs/degeneracy.json` — add `compoundRejection` config
- `src/evaluation-analytics/degeneracy-penalty.js` — add compound check to `applyDegeneracyFilters()`

## Out of scope

- Do NOT change fitness scoring or penalty formula
- Do NOT change individual flag policies (beyond what EVOQUAOVE-06 already changed)
- Do NOT change the engine's rejection logic
- Do NOT change the evaluator

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/evaluation-analytics/`:
   - Report with 4 penalty flags → `{ allow: false, compoundRejection: true }`
   - Report with 2 penalty flags → `{ allow: true }` (below threshold)
   - Report with 3 penalty flags → `{ allow: true }` (at threshold, not above)
   - Compound rejection disabled → high flag count still allowed
   - Individual reject flags still work independently of compound rule

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- Compound rejection is additive to individual flag policies, not a replacement
- The `compoundRejection` flag in the return object distinguishes compound from individual rejections
- `configs/degeneracy.json` remains valid against its schema (schema may need update)
