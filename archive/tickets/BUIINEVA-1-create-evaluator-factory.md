# BUIINEVA-1: Core factory + type declarations

## Status: COMPLETED

## Summary

Implement the built-in evaluator factory `createEvaluator(options?)` and its TypeScript type declarations. This is the foundational ticket — all other BUIINEVA tickets depend on it.

## Files Created

| File | Purpose |
|------|---------|
| `src/evaluation-analytics/create-evaluator.js` | Built-in evaluator factory |
| `src/evaluation-analytics/create-evaluator.d.ts` | TypeScript type declarations |
| `test/unit/evaluation-analytics/create-evaluator.test.mjs` | Unit tests (16 tests) |

## Scope

Implement the 13-step pipeline inside `createEvaluator(options?)`:

1. **Create agents** — call `agentFactory(definition)` or default: create `definition.players.count` random-policy agent descriptors `{ kind: "random" }`
2. **Resolve simulation defaults** — call `resolveSimulationDefaults({ definition, agents, ...simulationConfig })`
3. **Create simulation engine** — `createSimulationEngine(resolvedConfig)`
4. **Run N simulations** — `engine.runBatch(simulationRuns)`
5. **Adapt results** — `adaptSimulationLog({ version: LOG_ADAPTER_VERSION, log: { definition, results } })`. If `ok: false`, return early with `{ fitness: null, descriptors: null, diagnostics: { error, logAdapterOk: false } }`
6. **Compute core metrics** — `computeCoreMetrics(trajectorySummaries)`
7. **Optionally compute extended metrics** — if `includeExtendedMetrics`, call `computeExtendedMetrics(definition, trajectorySummaries, { ...extendedMetricsOptions, simulations: results })`
8. **Concatenate metrics** — `allMetrics = [...coreMetrics, ...extendedMetrics]`
9. **Detect degeneracy** — `detectDegeneracy(trajectorySummaries, degeneracyThresholds)`
10. **Assemble feature vector** — `assembleFeatureVector(allMetrics, degeneracyReport)`
11. **Compute fitness** — `computePreferenceAwareFitness(featureVector, { ...fitnessOptions, preferenceModelState, degeneracyReport })`
12. **Extract descriptors** — `Object.fromEntries(descriptorKeys.map(k => [k, featureVector[k] ?? 0]))`
13. **Return** — `{ fitness, descriptors, diagnostics }`

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulationConfig` | `object` | `{}` | Overrides for simulation defaults |
| `simulationRuns` | `number` | `5` | Simulations per genome |
| `agentFactory` | `(definition) => Agent[]` | random agents | Agent factory |
| `fitnessOptions` | `object` | `{}` | Overrides for `computePreferenceAwareFitness` |
| `degeneracyThresholds` | `object` | `{}` | Overrides for `detectDegeneracy` |
| `preferenceModelState` | `object\|null` | `null` | Preference model state |
| `descriptorKeys` | `string[]` | `["agency", "variety"]` | Feature vector keys for MAP-Elites descriptors |
| `includeExtendedMetrics` | `boolean` | `false` | Compute extended metrics |
| `extendedMetricsOptions` | `object` | `{}` | Options for `computeExtendedMetrics` |
| `seed` | `number\|null` | `null` | Base RNG seed passed to `resolveSimulationDefaults` |

### Imports

```js
import { createSimulationEngine } from "../simulation-engine/index.js";
import { resolveSimulationDefaults } from "../simulation-engine/simulation-defaults.js";
import { LOG_ADAPTER_VERSION, adaptSimulationLog } from "./log-adapter.js";
import { computeCoreMetrics } from "./metrics/core.js";
import { computeExtendedMetrics } from "./metrics/extended.js";
import { detectDegeneracy } from "./degeneracy.js";
import { assembleFeatureVector } from "./feature-vector.js";
import { computePreferenceAwareFitness } from "./fitness.js";
```

## Out of Scope

- No barrel export changes (BUIINEVA-3)
- No CLI changes (BUIINEVA-4)
- No documentation updates (BUIINEVA-6)

## Acceptance Criteria

- [x] `tsc --noEmit` passes with both `.js` and `.d.ts` files
- [x] Module is importable without runtime error
- [x] All option fields from spec are accepted
- [x] `LOG_ADAPTER_VERSION` constant is used (no hardcoded version string)
- [x] Factory returns `{ evaluator }` where evaluator is a function accepting a genome

## Invariants

1. Every evaluation calls `computeCoreMetrics`, `detectDegeneracy`, `assembleFeatureVector`, `computePreferenceAwareFitness`
2. `resolveSimulationDefaults()` is called before every simulation
3. No mutation of the genome argument
4. `LOG_ADAPTER_VERSION` constant is used (never a hardcoded version string)
5. Log adapter failure (`ok: false`) returns early with `{ fitness: null, descriptors: null }`

## Dependencies

None — this is the root ticket.

## Outcome

### Corrections Applied

1. **Removed `createRandomPolicy` from imports** — not needed; default agent factory uses descriptors `{ kind: "random" }`, not materialized policies.
2. **Clarified seed behavior** — the factory passes `seed` to `resolveSimulationDefaults`; no per-run offset is implemented. The `seed` is placed before the `...simulationConfig` spread so `simulationConfig` can override it.
3. **Added tests to scope** — 16 unit tests covering contract verification, return shape, option forwarding, immutability, determinism, and edge cases.

### Verification

- `tsc -p tsconfig.json` — passes with no errors
- `node --test test/unit/evaluation-analytics/create-evaluator.test.mjs` — 16/16 pass
- `node --test test/unit/**/*.test.mjs` — 355/355 pass (no regressions)
