# EVOQUAOVE-06: Escalate critical degeneracy flags to rejection

**Spec ref:** EQ-01
**Phase:** 2 — Strengthen selection pressure
**Depends on:** None

## Problem

Only `loop` and `non-terminating` are rejected in `configs/degeneracy.json`. The flags `forced-move`, `no-choices`, `trivial-win`, and `stalemate` are penalized but never rejected. A game with all five penalty flags still gets a positive fitness score. Current tests assume `no-choices` is penalized (not rejected), so they will fail once the policy changes.

## Fix

Change `"no-choices": "reject"` in `configs/degeneracy.json`. A game with zero meaningful choices is fundamentally broken, not just penalized. Since `computeDegeneracyPenalty()` only applies penalties to `policyByFlag: "penalize"`, switching `no-choices` to `reject` means it no longer contributes to penalty totals. Update tests accordingly to expect rejection and zero penalty under default config.

## Files to touch

- `configs/degeneracy.json` — change `no-choices` policy from `"penalize"` to `"reject"`
- Tests that currently assume `no-choices` is only penalized

## Out of scope

- Do NOT change the compound rejection rule (that's EVOQUAOVE-12)
- Do NOT change penalty weights or the penalty formula
- Do NOT change `degeneracy-penalty.js` or `scoring.js`
- Do NOT change any other flag's policy in this ticket

## Acceptance criteria

### Tests that must pass

1. **Updated/new unit test** confirming that a genome flagged with `no-choices` is rejected by `applyDegeneracyFilters()`
2. Existing degeneracy tests updated to reflect the new policy and penalty behavior

3. All existing tests:
   - `npm run test:unit` passes

### Invariants

- `applyDegeneracyFilters()` returns `{ allow: false }` for genomes with `no-choices` flag
- `computeDegeneracyPenalty()` yields no penalty for `no-choices` under the default config (since it is rejected)
- All other flag policies remain unchanged
- `configs/degeneracy.json` remains valid against its schema

## Status

Completed on 2026-01-30.

## Outcome

- Updated `no-choices` policy to `reject` and aligned unit/e2e tests with rejection + zero penalty behavior.
- Kept all other degeneracy policies and penalty weights unchanged.
