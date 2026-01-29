# Built-in Evaluator Specification

## Problem Statement

No production code evaluates genomes. The evaluation-analytics modules (`computeCoreMetrics`, `detectDegeneracy`, `assembleFeatureVector`, `computePreferenceAwareFitness`) are orphans — they exist but nothing in the main pipeline calls them. E2E tests mock evaluation with inline evaluator functions. The CLI's `--evaluator <path>` plugin flag was a design mistake: evaluation should be built-in, not externally pluggable.

## Solution

Create a built-in evaluator factory `createEvaluator(options)` that wires the complete evaluation pipeline:

```
GameDefinition → simulate → log-adapter → computeCoreMetrics → detectDegeneracy
  → assembleFeatureVector → computePreferenceAwareFitness → { fitness, descriptors }
```

Remove the `--evaluator` CLI flag and all plugin-loading code.

## Built-in Evaluator Factory

### Module

`src/evaluation-analytics/create-evaluator.js`

### Imports

```js
import { createSimulationEngine, createRandomPolicy } from "../simulation-engine/index.js";
import { resolveSimulationDefaults } from "../simulation-engine/simulation-defaults.js";
import { LOG_ADAPTER_VERSION, adaptSimulationLog } from "./log-adapter.js";
import { computeCoreMetrics } from "./metrics/core.js";
import { computeExtendedMetrics } from "./metrics/extended.js";
import { detectDegeneracy } from "./degeneracy.js";
import { assembleFeatureVector } from "./feature-vector.js";
import { computePreferenceAwareFitness } from "./fitness.js";
```

### Signature

```js
createEvaluator(options?) → { evaluator: (genome) => EvaluationResult }
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulationConfig` | `object` | `{}` | Overrides for simulation (maxTurns, maxSteps, seed, loopDetection). Merged with defaults from `configs/simulation.json` via `resolveSimulationDefaults()` |
| `simulationRuns` | `number` | `5` | Number of simulations per genome |
| `agentFactory` | `(definition) => Agent[]` | creates N random agents from `definition.players.count` | Agent factory |
| `fitnessOptions` | `object` | `{}` | Overrides for `computePreferenceAwareFitness` |
| `degeneracyThresholds` | `object` | `{}` | Overrides for `detectDegeneracy` |
| `preferenceModelState` | `object\|null` | `null` | Preference model state for fitness blending |
| `descriptorKeys` | `string[]` | `["agency", "variety"]` | Feature vector keys to extract as MAP-Elites descriptors. Should match the descriptor IDs in the MAP-Elites config |
| `includeExtendedMetrics` | `boolean` | `false` | Whether to compute extended metrics |
| `extendedMetricsOptions` | `object` | `{}` | Options for `computeExtendedMetrics` (meaningfulChoice, comebackPotential, skillExpression toggles) |
| `seed` | `number\|null` | `null` | Base RNG seed (each run offsets by index) |

### Pipeline Steps (executed for every genome)

1. **Create agents** — call `agentFactory(definition)` or default: create `definition.players.count` random-policy agent descriptors `{ kind: "random" }`
2. **Resolve simulation defaults** — call `resolveSimulationDefaults({ definition, agents, ...simulationConfig })` to merge file-level defaults from `configs/simulation.json` (maxTurns, maxSteps, loopDetection, noLegalActions)
3. **Create simulation engine** — `createSimulationEngine(resolvedConfig)`
4. **Run N simulations** — `engine.runBatch(simulationRuns)` → returns raw `results` array
5. **Adapt results** — `adaptSimulationLog({ version: LOG_ADAPTER_VERSION, log: { definition, results } })` → if `ok: false`, return early with `{ fitness: null, descriptors: null, diagnostics: { error } }`
6. **Compute core metrics** — `computeCoreMetrics(trajectorySummaries)` → returns `coreMetrics` array of `{ id, value }`
7. **Optionally compute extended metrics** — if `includeExtendedMetrics` is true, call `computeExtendedMetrics(definition, trajectorySummaries, { ...extendedMetricsOptions, simulations: results })` → returns `extendedMetrics` array of `{ id, value }`. Note: the first argument is the game `definition`, and `options.simulations` must be the raw simulation results (needed by `computeMeaningfulChoice` and `computeComebackPotential`)
8. **Concatenate metrics** — `allMetrics = [...coreMetrics, ...extendedMetrics]` (or just `coreMetrics` if extended disabled)
9. **Detect degeneracy** — `detectDegeneracy(trajectorySummaries, degeneracyThresholds)` → returns `degeneracyReport`
10. **Assemble feature vector** — `assembleFeatureVector(allMetrics, degeneracyReport)`
11. **Compute fitness** — `computePreferenceAwareFitness(featureVector, { ...fitnessOptions, preferenceModelState, degeneracyReport })`
12. **Extract descriptors** — pick `descriptorKeys` from feature vector: `Object.fromEntries(descriptorKeys.map(k => [k, featureVector[k] ?? 0]))`
13. **Return** — `{ fitness, descriptors, diagnostics }`

### Return Value

```js
{
  fitness: number,         // from computePreferenceAwareFitness().score
  descriptors: object,     // subset of feature vector keyed by descriptorKeys
  diagnostics: {
    coreMetrics: MetricResult[],
    extendedMetrics: MetricResult[] | null,
    degeneracy: DegeneracyReport,
    featureVector: FeatureVector,
    fitnessResult: PreferenceFitnessResult,
    simulationCount: number,
    logAdapterOk: boolean,
  }
}
```

### Error Handling

- If `adaptSimulationLog` fails (`ok: false`), return `{ fitness: null, descriptors: null, diagnostics: { error: adaptResult.error, logAdapterOk: false } }`.
- If simulation throws, propagate the error (genome validation happens upstream in `evaluation-adapter.js`).
- All metric/fitness functions handle edge cases (empty summaries, zero-step games) gracefully.

## CLI Changes

### File: `src/cli/ludoforge-evolve.js`

**Removals:**
- Remove `"--evaluator"` from `VALUE_FLAGS`
- Remove the `loadEvaluator()` function entirely (lines 110-145)
- Remove `else if (flag === "--evaluator")` branch from `parseArgs()` (lines 59-60)
- Remove `loadEvaluatorModule` from `resolveDeps()` (line 175)
- Remove `"  --evaluator <path> Path to evaluator module (required unless --dry-run)"` from `createUsage()`

**Additions:**
- Import `createEvaluator` from `../evaluation-analytics/create-evaluator.js`
- Create evaluation **once** before the resume/fresh-run branching logic. Both call sites (line 213 in resume path, line 258 in fresh-run path) currently call `loadEvaluator(parsed.evaluator, deps)`. Replace both with a single `const evaluation = createEvaluator()` constructed after the dry-run early returns:

```js
// After dry-run checks but before runEvolutionRunner calls:
const evaluation = createEvaluator();
```

The two call sites in `runLudoforgeEvolve()`:
1. **Resume path** (line 213): `const evaluation = await loadEvaluator(parsed.evaluator, deps)` → remove, use shared `evaluation`
2. **Fresh-run path** (line 258): `const evaluation = await loadEvaluator(parsed.evaluator, deps)` → remove, use shared `evaluation`

Since `createEvaluator()` is synchronous (it returns a factory, not a promise), the `await` is no longer needed.

## Invariants

1. `computeCoreMetrics` is called for every genome evaluation
2. `detectDegeneracy` is called for every genome evaluation
3. `assembleFeatureVector` receives real metrics, not fabricated stubs
4. `computePreferenceAwareFitness` produces the final fitness score
5. Evaluation is deterministic given the same RNG seed
6. No external evaluator module is needed
7. The orphan modules are no longer orphans (reachable from CLI entry point)
8. `resolveSimulationDefaults()` is called before every simulation to ensure config defaults are applied
9. `LOG_ADAPTER_VERSION` constant is used (never a hardcoded version string)

## Acceptance Criteria

### Tests That Must Pass

- `npm run test:unit` — all existing + new unit tests
- `npm run test:integration` — all existing integration tests
- `npm run test:e2e` — updated E2E tests using real evaluator
- `node --test test/unit/evaluation-analytics/create-evaluator.test.mjs`
- `npx tsc --noEmit` — type check passes

### Dependency Verification

- `npx depcruise src` — zero `no-orphans` warnings for `metrics/core.js` or `preference-metrics.js`

### Unit Test Requirements

- Factory returns `{ evaluator }` with evaluator as a function
- Evaluator returns `{ fitness, descriptors, diagnostics }`
- Fitness is a finite number for valid genomes
- Descriptors is an object with expected keys matching `descriptorKeys`
- Degeneracy flags appear in diagnostics
- Core metrics array is present in diagnostics
- Feature vector is present in diagnostics
- Deterministic with seeded RNG
- Handles degenerate/edge-case genomes gracefully
- Log adapter failure returns `{ fitness: null, descriptors: null }` with `logAdapterOk: false`

### E2E Test Requirements

#### `evolution-pipeline.e2e.test.mjs`

The current test tracks internal pipeline phase ordering (`seed → simulate → mock-eval → fitness → evolve → re-simulate`) using a timeline array and per-candidate step sequences. With the built-in evaluator, these internal steps are encapsulated.

**Replace phase-ordering assertions with output-shape assertions:**

- `createEvaluator()` replaces the inline `evaluation: { evaluator: (genome) => { ... } }` object
- Remove `createMockSimulation`, `createMockHumanEval`, `createMockFitness` imports and usage
- Remove `timeline`, `seenPhases`, `perCandidateSteps`, `evaluationArtifacts` tracking
- Remove `recordPhase()` / `recordCandidateStep()` functions
- Keep the `runGenerationLoop()` call with real evaluation

**New assertions (replacing timeline assertions):**

1. `result.evaluated.length === population.length` — all genomes evaluated
2. `result.rejected.length === 0` — valid seeds are not rejected
3. Each `result.evaluated[i]` has:
   - `fitness` is a finite number
   - `descriptors` is an object with expected keys
   - `diagnostics` is an object (internal structure is implementation detail)
4. `result.nextGeneration.length === population.length` — MAP-Elites produces next generation
5. Determinism test still works: two runs with same seed produce identical `evaluated` and `nextIds`

**Keep unchanged:**
- "invalid seeds" test — still uses a mock evaluator (tests that invalid genomes are rejected *before* evaluation runs, so no evaluator is called)
- "safety cutoffs" test — rewrite to use `createEvaluator()` and verify the diagnostics include degeneracy information
- "determinism" test — rewrite to use `createEvaluator({ seed: N })` and verify identical outputs

#### `mock-fitness.e2e.test.mjs`

This test validates the `createMockFitness` helper itself. It does NOT test the real pipeline. **Keep unchanged** — it tests the E2E test helper, which may still be used by other tests that intentionally mock evaluation.

#### `preference-model-update.e2e.test.mjs`

Already uses real metric/fitness modules directly (not the mock evaluator). **No changes needed** unless the test imports from paths that change.

## Files to Create

| File | Purpose |
|------|---------|
| `specs/built-in-evaluator.md` | This specification |
| `src/evaluation-analytics/create-evaluator.js` | Built-in evaluator factory |
| `src/evaluation-analytics/create-evaluator.d.ts` | Type declarations |
| `test/unit/evaluation-analytics/create-evaluator.test.mjs` | Unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `src/evaluation-analytics/index.ts` | Add `createEvaluator` export |
| `src/cli/ludoforge-evolve.js` | Remove `--evaluator`, `loadEvaluator()`, `loadEvaluatorModule`; import and use `createEvaluator` |
| `test/e2e/evolution-pipeline.e2e.test.mjs` | Replace mock evaluators with `createEvaluator()`, replace phase-ordering assertions with output-shape assertions |
| `docs/architecture/pipeline-overview.md` | Update evaluation description, remove external evaluator language |
| `docs/architecture/evolutionary-engine.md` | Update evaluation adapter docs |
| `docs/architecture/metrics-and-fitness.md` | Add built-in evaluator section documenting the wiring |

## Files NOT Modified

| File | Reason |
|------|--------|
| `src/evolution-runner/runner.js` | Receives `evaluation` as `options.evaluation`, passes to `runGenerationLoop`. The shape `{ evaluator }` is unchanged |
| `test/e2e/mock-fitness.e2e.test.mjs` | Tests the mock helper itself, not the real pipeline |
| `test/e2e/preference-model-update.e2e.test.mjs` | Already uses real modules directly |

## Verification

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
node --test test/unit/evaluation-analytics/create-evaluator.test.mjs
npx tsc --noEmit
npx depcruise src  # verify no orphan warnings for core.js / preference-metrics.js
```
