# EVOQUAOVE-01: Repair fallback to pre-mutation genome

**Spec ref:** EQ-05
**Phase:** 1 — Stop the bleeding
**Depends on:** None

## Problem

`repairGenome()` returns `null` when any repair operator fails. The orchestrator (`src/evolutionary-engine/mutation/orchestrator.js`) passes `null` through to the caller in the non-selector path. Downstream, the engine rejects null-fitness genomes, but the population shrinks by one member each time repair fails.

## Fix

When repair returns `null` in `mutateAndRepairGenome()`, fall back to the **original pre-mutation genome** instead of propagating `null`. The failed mutation is discarded and the genome survives unchanged. This prevents population shrinkage.

## Files to touch

- `src/evolutionary-engine/mutation/orchestrator.js` — modify `mutateAndRepairGenome()` to return the original genome when repair returns `null`
- `test/unit/evolutionary-engine/mutation.test.mjs` — update existing expectation that `mutateAndRepairGenome()` returns `null` on repair failure
- `test/unit/evolutionary-engine/orchestrator.test.mjs` — add new coverage for selector/non-selector fallback

## Out of scope

- Do NOT change `repairGenome()` itself (that's EVOQUAOVE-06/07)
- Do NOT change the engine's null-fitness rejection logic in `engine.js`
- Do NOT change the evaluation pipeline
- Do NOT modify any mutation operators

## Acceptance criteria

### Tests that must pass

1. **New unit test** in `test/unit/evolutionary-engine/orchestrator.test.mjs`:
   - When repair returns `null`, `mutateAndRepairGenome()` returns the original genome (non-selector) or `{ genome: <original>, operatorName: null }` (selector), or equivalent signaling the mutation was discarded
   - When repair succeeds, behavior is unchanged
   - Both selector and non-selector code paths tested

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- `mutateAndRepairGenome()` NEVER returns `{ genome: null }` — it always returns a valid genome
- The returned genome is either the repaired mutant or an exact `structuredClone` of the original (immutability preserved)
- No population shrinkage when repair fails

## Status

Completed — 2026-01-30

## Outcome

- Implemented fallback to the original genome for both selector and non-selector paths when repair fails.
- Updated existing unit coverage for the new fallback behavior and added selector-path coverage.
