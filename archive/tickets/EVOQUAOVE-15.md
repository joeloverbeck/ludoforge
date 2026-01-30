# EVOQUAOVE-15: Population health metrics per generation

**Status:** ✅ Completed
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

### Assumption corrections

- The ticket originally said "repair failure rate (from operator telemetry)". The telemetry tracks `attempts` and `validOffspring` per operator. The repair failure rate is derived as `(totalAttempts - totalValidOffspring) / totalAttempts` across all operators, which is the closest available metric from telemetry. Rejected entries with `reason === "repair-failure"` provide a per-generation view via `rejectionReasons`.
- The ticket's acceptance criterion about "empty evaluated array produces sensible defaults" requires that at least one genome survives evaluation, since the runner's `assertPopulation()` enforces a non-empty evolved population. The runner test was adjusted to test high-rejection scenarios (4/5 rejected) rather than 100% rejection.

## Files to touch

- `src/evolution-runner/runner.js` — compute health metrics after each generation
- `src/evolution-runner/artifact-writer.js` — write `health.json` artifact
- **New:** `src/evolution-runner/health-metrics.js` — pure function for health metrics computation

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
   - High rejection rate scenario produces correct health metrics

3. **New unit tests** in `test/unit/evolution-runner/health-metrics.test.mjs`:
   - Mean and median fitness computation
   - Median for even-length arrays
   - Empty evaluated array produces sensible defaults (`meanFitness: 0`)
   - Rejection rate and reason counts
   - Degeneracy flag frequency counting
   - Niche occupancy from mapElites
   - Repair failure rate from telemetry
   - All numeric fields are finite
   - Non-finite fitness values handled gracefully
   - Unknown reason fallback for rejected entries without reason
   - Zero telemetry attempts produces 0 repair failure rate

4. All existing tests:
   - `npm run test:unit` passes (905 tests, 0 failures)

### Invariants

- `health.json` is written for every generation, not just the last
- All values are JSON-serializable (no `undefined`, `NaN`, or `Infinity`)
- Health metrics computation does not affect the generation loop performance or behavior
- Existing artifact files are still written as before

## Outcome

### What changed vs originally planned

The implementation followed the ticket closely with two deviations:

1. **New file added:** `src/evolution-runner/health-metrics.js` was created as a separate module containing the pure `computeHealthMetrics()` function. The ticket only listed `runner.js` and `artifact-writer.js`, but extracting the computation into its own module follows the project's composition-over-classes convention and keeps `runner.js` focused on orchestration.

2. **Repair failure rate source:** The ticket said "from operator telemetry." The telemetry doesn't have a single `repairFailureRate` field — it has per-operator `attempts` and `validOffspring`. The implementation derives the rate as `(totalAttempts - totalValidOffspring) / totalAttempts` across all operators, and also exposes per-reason rejection counts (including `"repair-failure"`) via `rejectionReasons`.

3. **"Empty evaluated" test adjusted:** The runner enforces non-empty evolved population via `assertPopulation()`, so 100% rejection causes the runner to throw before writing health. The runner-level test was adjusted to test 80% rejection (4 of 5 rejected) instead.

### Files modified
- `src/evolution-runner/runner.js` — import + call `computeHealthMetrics()`, pass to artifact writer
- `src/evolution-runner/artifact-writer.js` — accept and write `health` parameter as `health.json`

### Files created
- `src/evolution-runner/health-metrics.js` — `computeHealthMetrics()` pure function
- `test/unit/evolution-runner/health-metrics.test.mjs` — 11 unit tests

### Tests added
- `test/unit/evolution-runner/health-metrics.test.mjs` — 11 tests covering all health metric computations
- `test/unit/evolution-runner/artifact-writer.test.mjs` — 2 new tests for `health.json` writing
- `test/unit/evolution-runner/runner.test.mjs` — 3 new tests for end-to-end health metrics integration

### Final test count
905 unit tests passing, 0 failures
