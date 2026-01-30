# EVOQUAOVE-16: Compound degeneracy rejection rule

**Status:** ✅ Completed
**Spec ref:** EQ-04
**Phase:** 4 — Observability and adaptive control
**Depends on:** EVOQUAOVE-06 (EQ-01 — flag escalation)

## Problem

Individual penalties are weak. A game can accumulate `forced-move + dominant-action + trivial-win + stalemate` (the four remaining penalize-policy flags after EVOQUAOVE-06 escalated `no-choices` to reject) and still score positive if the base composite is high. There is no cliff that prevents flag accumulation.

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
- `schemas/config/degeneracy.schema.json` — add `compoundRejection` to schema
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

## Outcome

**What changed vs originally planned:**

The implementation matched the ticket plan closely. Two corrections were applied to the ticket before implementation:

1. **Problem statement corrected:** The ticket originally implied `no-choices` was still a penalize-policy flag. In reality, EVOQUAOVE-06 already escalated `no-choices` to `"reject"`. The problem statement was updated to reference the four remaining penalize flags: `forced-move`, `dominant-action`, `trivial-win`, `stalemate`.

2. **Files to touch updated:** Added `schemas/config/degeneracy.schema.json` to the files list since the schema needed updating to accept the new `compoundRejection` property.

**Files modified:**
- `configs/degeneracy.json` — added `compoundRejection: { enabled: true, maxPenaltyFlags: 3 }`
- `schemas/config/degeneracy.schema.json` — added `compoundRejection` object schema
- `src/evaluation-analytics/degeneracy-penalty.js` — extended `applyDegeneracyFilters()` with compound check
- `test/unit/evaluation-analytics/degeneracy.test.mjs` — added 5 new tests in "compound rejection" describe block

**Test results:** 910/910 unit tests pass (including 5 new compound rejection tests).
