# EVOQUAOVE-06: Escalate critical degeneracy flags to rejection

**Spec ref:** EQ-01
**Phase:** 2 — Strengthen selection pressure
**Depends on:** None

## Problem

Only `loop` and `non-terminating` are rejected in `configs/degeneracy.json`. The flags `forced-move`, `no-choices`, `trivial-win`, and `stalemate` are penalized but never rejected. A game with all five penalty flags still gets a positive fitness score.

## Fix

Change `"no-choices": "reject"` in `configs/degeneracy.json`. A game with zero meaningful choices is fundamentally broken, not just penalized.

## Files to touch

- `configs/degeneracy.json` — change `no-choices` policy from `"penalize"` to `"reject"`

## Out of scope

- Do NOT change the compound rejection rule (that's EVOQUAOVE-12)
- Do NOT change penalty weights or the penalty formula
- Do NOT change `degeneracy-penalty.js` or `scoring.js`
- Do NOT change any other flag's policy in this ticket

## Acceptance criteria

### Tests that must pass

1. **Updated/new unit test** confirming that a genome flagged with `no-choices` is rejected by `applyDegeneracyFilters()`
2. Existing degeneracy tests updated to reflect the new policy

3. All existing tests:
   - `npm run test:unit` passes

### Invariants

- `applyDegeneracyFilters()` returns `{ allow: false }` for genomes with `no-choices` flag
- All other flag policies remain unchanged
- `configs/degeneracy.json` remains valid against its schema
