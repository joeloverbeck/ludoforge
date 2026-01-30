# EVOQUAOVE-15: Population health metrics per generation

**Spec ref:** EQ-17
**Phase:** 4 — Observability and adaptive control
**Depends on:** EVOQUAOVE-13 (EQ-14), EVOQUAOVE-14 (EQ-15)

## Problem

No longitudinal tracking of population quality. There is no way to detect drift toward degeneracy except by manually inspecting shortlist outputs.

## Fix

After each generation, compute and persist to `generation-N/health.json`:
- Mean and median fitness of evaluated genomes
- Rejection rate and rejection reason counts (using categories from EVOQUAOVE-13)
- Degeneracy flag frequency across the population (how many genomes have each flag)
- Niche occupancy count (how many MAP-Elites bins have elites)
- Repair failure rate (from operator telemetry)

Integrate with `writeGenerationArtifacts()` in `artifact-writer.js`.

## Files to touch

- `src/evolution-runner/runner.js` — compute health metrics after each generation
- `src/evolution-runner/artifact-writer.js` — write `health.json` artifact

## Out of scope

- Do NOT change `engine.js` or `map-elites.js`
- Do NOT change the evaluation pipeline
- Do NOT implement dashboard or visualization
- Do NOT change operator telemetry structure (just read from it)

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/evolution-runner/artifact-writer.test.mjs`:
   - `health.json` is written with correct structure: `{ meanFitness, medianFitness, rejectionRate, rejectionReasons, degeneracyFlags, nicheOccupancy, repairFailureRate }`
   - All numeric fields are finite numbers (no NaN/Infinity)

2. **New unit tests** in `test/unit/evolution-runner/runner.test.mjs`:
   - Health metrics are computed correctly from generation results
   - Empty evaluated array produces sensible defaults (e.g., `meanFitness: 0`)

3. All existing tests:
   - `npm run test:unit` passes

### Invariants

- `health.json` is written for every generation, not just the last
- All values are JSON-serializable (no `undefined`, `NaN`, or `Infinity`)
- Health metrics computation does not affect the generation loop performance or behavior
- Existing artifact files are still written as before
