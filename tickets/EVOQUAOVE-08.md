# EVOQUAOVE-08: Reject special-bin seeds

**Spec ref:** EQ-11
**Phase:** 2 — Strengthen selection pressure
**Depends on:** None

## Problem

Genomes binning to `unknown`, `under`, or `over` niches are unconditionally accepted in `generate-seed-population.js`:
```js
if (hasSpecialBin(nicheId)) {
  seenIds.add(id);
  genomes.push(genome);
  // ...
  continue;
}
```
A genome with `NaN` descriptors gets auto-accepted. These are typically broken games that crashed evaluation or produced non-finite metrics.

## Fix

Reject special-bin genomes instead of accepting them. Count rejections as `"special-bin"` in `rejectedByReason`. If this makes it harder to fill the population, the existing `maxAttempts` parameter handles retries.

## Files to touch

- `src/seed-generation/generate-seed-population.js` — change special-bin handling from accept to reject

## Out of scope

- Do NOT change the grammar generator
- Do NOT change the evaluator
- Do NOT change MAP-Elites binning logic
- Do NOT change `maxAttempts` (the caller can configure it)
- Do NOT add semantic validation to seeds (that's EVOQUAOVE-11)

## Acceptance criteria

### Tests that must pass

1. **Updated unit tests** in `test/unit/seed-generation/generate-seed-population.test.mjs`:
   - Genomes with special-bin niches (`unknown`, `under`, `over`) are rejected, not added to the output
   - `rejectedByReason["special-bin"]` is incremented for each rejection
   - Non-special-bin genomes are still accepted normally

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- No genome in the output population has a special-bin niche ID
- `rejectedByReason` object includes `"special-bin"` key when applicable
- Total generated population may be smaller if many seeds produce special bins — this is the intended behavior
