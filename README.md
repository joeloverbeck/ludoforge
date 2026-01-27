# LudoForge

Evolve games. Measure fun. Forge mechanics.

LudoForge evolves playable tabletop game prototypes from composable rule primitives using simulation, self-play, and human preference learning.

## DSL example
See `examples/dsl/minimal-game.json` for a minimal, valid DSL game definition.

## Runtime validation
Use `validateGameDefinition(input)` from `src/dsl/validate.js` to validate DSL inputs against `schemas/dsl/game-definition.v1.json`. It returns `{ valid, errors }` with deterministic error ordering.

## Semantic validation
Use `validateSemanticDefinition(input)` from `src/dsl/semantic.js` to check cross-reference integrity and DSL constraints not captured by JSON Schema. It returns `{ valid, issues }`.

## Scheduler safeguards
`advanceTurnPhase(definition, state, options)` supports optional runtime guard rails:
- `maxStepsPerTurn`: cap on trigger effects applied during a single scheduler advance (default 1000).
- `maxTriggerDepth`: maximum trigger re-entry depth before returning `trigger-recursion` (default 8).
- `stateHistoryLimit`: number of recent state snapshots tracked for loop detection (default 256).

## Simulation engine agents
Use `createRandomPolicy()` or `createGreedyPolicy({ scoreAction })` from `src/simulation-engine/index.js` to build baseline agent controllers. `createRandomPolicy` uses the RNG supplied to the simulation engine (via `seed` or `rng`) for deterministic selection, while `createGreedyPolicy` picks the highest scoring action and falls back to the first legal action when no heuristic is available.

## Simulation engine batches
`runBatchSimulations(inputs, hooks, { concurrency })` supports optional worker-thread execution. Worker mode is opt-in and only activates when all inputs are worker-safe: agents must be built-in descriptors (`{ kind: "random" | "greedy" }`), custom `rng` objects, `stepControl.onStep`, and `loopDetection.stateHasher` are not allowed, and greedy policies must use the default scoring.

## Preference model snapshots
Use `writePreferenceModelSnapshotJsonl` and `readPreferenceModelSnapshotJsonl` from `src/data-persistence/preference-model-store.js` to persist versioned model snapshots.

```js
import {
  readPreferenceModelSnapshotJsonl,
  writePreferenceModelSnapshotJsonl,
} from "./src/data-persistence/preference-model-store.js";

await writePreferenceModelSnapshotJsonl("data/preference-model.jsonl", [
  {
    id: "model-1",
    version: "1.0",
    createdAt: "2025-01-01T00:00:00Z",
    trainingWindow: { start: "2024-12-01T00:00:00Z", end: "2025-01-01T00:00:00Z" },
    hyperparams: { learningRate: 0.05 },
    metrics: { accuracy: 0.82 },
    weights: { agency: 0.6, tension: -0.2 },
    bias: 0.1,
  },
]);

const snapshots = await readPreferenceModelSnapshotJsonl("data/preference-model.jsonl");
```

## Active learning selection
Use `selectActiveLearningPairs(candidates, modelState, options)` from `src/evaluation-analytics/active-learning.js` to choose comparison pairs that favor uncertain predictions while ensuring underrepresented niches are sampled.

```js
import { selectActiveLearningPairs } from "./src/evaluation-analytics/active-learning.js";

const pairs = selectActiveLearningPairs(
  [
    { id: "game-a", featureVector: { agency: 0.4 }, nicheId: "short" },
    { id: "game-b", featureVector: { agency: 0.6 }, nicheId: "short" },
    { id: "game-c", featureVector: { agency: 0.5 }, nicheId: "long" },
  ],
  modelState,
  { maxPairs: 2, uncertaintyThreshold: 0.15, diversityQuota: 1, cadence: 5, iteration: 10 }
);
```

## Preference-aware evaluator
Use `createPreferenceEvaluator(computeAnalytics, options)` from `src/evolutionary-engine/preference-evaluator.js` to build an evaluator that blends composite, preference, and diversity scores while gating preference on degeneracy filters.

```js
import { createPreferenceEvaluator } from "./src/evolutionary-engine/preference-evaluator.js";

const evaluator = createPreferenceEvaluator((genome) => ({
  trajectorySummaries: [],
  metrics: [],
  degeneracy: { flags: [] },
  featureVector: { agency: 0.6, novelty: 0.2 },
  compositeScore: { score: 0.5 },
  descriptors: { length: 12, randomness: 0.3 },
}), { preferenceModelState });
```

## Tests
- `npm test` (runs `node --test test/**/*.test.mjs` and `tsc -p tsconfig.json`)
- `node --test test/dsl/schema.test.mjs`
- `node --test test/dsl/validate.test.mjs`
- `tsc -p tsconfig.json`
