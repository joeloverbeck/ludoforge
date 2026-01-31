# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run test:unit          # Unit tests + TypeScript type check (tsc -p tsconfig.json)
npm run test:integration   # Integration tests
npm run test:e2e           # End-to-end tests
node --test path/to/file.test.mjs  # Run a single test file
tsc -p tsconfig.json       # Type check only (standalone)
```

There is no build step. TypeScript is used for type checking only (`noEmit: true`). All source is plain JavaScript with JSDoc types checked by `tsc`. The `typescript` package is **not** a project dependency — `tsc` must be installed globally (e.g., `npm install -g typescript`). Do not use `npx tsc` as it will fail.

No linter or formatter is configured.

## Architecture

LudoForge evolves tabletop game prototypes using MAP-Elites evolutionary search, simulation-based evaluation, and human preference learning.

### Pipeline (top to bottom)

```
CLI (src/cli/ludoforge-evolve.js)
  → Evolution Runner (src/evolution-runner/) — orchestrates multi-generation runs
    → Evolutionary Engine (src/evolutionary-engine/) — mutation, crossover, repair, MAP-Elites
      → Simulation Engine (src/simulation-engine/) — executes games with agent policies
        → Game Kernel (src/game-kernel/) — state machine: actions, effects, termination, triggers
          → DSL (src/dsl/) — game definition types, JSON Schema validation, semantic checks
```

**Supporting modules:**
- `evaluation-analytics/` — metrics computation, fitness scoring, degeneracy detection, preference models
- `data-persistence/` — JSONL file stores for games, feedback, preferences, simulations
- `human-interface/` — human feedback collection and preference pair routing
- `config/` — config file loading and JSON Schema validation

### Generation Loop

Each generation: evaluate all genomes → place in MAP-Elites grid → backfill non-elite parents to preserve population size → select diverse shortlist → apply mutation/crossover with repair (N offspring per parent via `offspringPerParent`) → replenish below `minPopulationSize` with random genomes → next generation.

### Mutation Pipeline

Mutate → Validate → Repair → Validate → Evaluate. Repair operators restore structural validity after mutation/crossover produces invalid genomes. `mutateAndRepairGenome()` always returns a structured outcome: `"ok"` (valid mutant), `"noOp"` (mutation had no effect), or `"repairFailed"` (repair returned `null`, genome is `null`). A selector is always required — `createMutationSelector()` throws at startup if operator weights are missing or invalid. On `noOp` or `repairFailed`, the runner retries with a different operator (up to `maxMutationRetries`, default 3). If retries exhaust, the unmutated parent is kept but not counted as `validEvaluated`. Adaptive operator weighting uses `validEvaluated` (not `validOffspring`) to measure true operator productivity.

### Operator Configuration

Mutation and crossover operators are toggled via `configs/evolution-operators.json`. There are 35 mutation operators including value tweaks (numeric-tweak, boolean-toggle, enum-cycle), structural operators (zone-add, token-type-add, trigger-add, trigger-remove, trigger-edit, phase-add/remove, zone-remove, token-type-remove, scheduler-swap, scheduler-param-tweak), effect operators (effect-insert, effect-delete, effect-kind-swap, effect-param-tweak, effect-reorder, conditional-effect-insert, turn-order-effect-insert, choose-effect-insert, worker-count-tweak), action operators (action-add-small, action-duplicate, action-remove, action-cost-tweak, action-effect-magnitude, precondition-negation), variable operators (variable-add, variable-remove, variable-scope-toggle), termination operators (termination-threshold, termination-outcome, termination-add, termination-remove, termination-condition-mutate), and motif-inject.

## Key Conventions

- **ESM only** — all files use ES module imports (`import`/`export`), `"type": "module"` in package.json.
- **Node built-in test runner** — uses `node --test`, assertions via `node:assert/strict`. No Jest/Mocha/Vitest.
- **Minimal test mocking** — prefer custom mock objects (e.g., `createMockHumanIo()`) over framework mocks. For unreachable error paths (e.g., internal module failures), use `node:test` `mock.module()` in a **separate test file** — `mock.module()` must be called before the module under test is imported, so it cannot share a file with tests that import the real module. The `test:unit` script includes `--experimental-test-module-mocks` to enable this. When running a single mock-dependent test file, pass the flag: `node --experimental-test-module-mocks --test path/to/file.test.mjs`.
- **Immutability** — create new objects, never mutate. Use `structuredClone()` for deep copies.
- **Composition over classes** — operators are plain functions, not class hierarchies.
- **Deterministic RNG** — seeded RNG (`createSeededRng()`) for reproducible simulations and tests.
- **JSON Schema validation** — Ajv validates game definitions (`schemas/dsl/`) and config files (`schemas/config/`).
- **Filenames** — lowercase with hyphens (e.g., `map-elites.js`, `active-learning.js`).
- **Commits** — short imperative sentences (e.g., "Revise README title and project description").

## CLI: ludoforge-evolve

```bash
ludoforge-evolve --config <path> --seeds <path> [--run-id <id>] [--resume] [--out <dir>] [--dry-run]
```

Evaluation is built-in via `createEvaluator()` from `src/evaluation-analytics/create-evaluator.js`. No external evaluator plugin is needed.

## Configuration

All config files live in `configs/` with matching JSON Schemas in `schemas/config/`. Key configs:
- `evolution-runner.json` — generations, shortlist size, hyperparameters
- `evolution-operators.json` — enabled mutation/crossover operators
- `simulation.json` — maxTurns, maxSteps, RNG defaults
- `map-elites.json` — descriptor dimensions and binning
- `fitness.json` — fitness composition weights
- `metrics-core.json` / `metrics-extended.json` — metric definitions
- `degeneracy.json` — degenerate game detection filters
- `preference-model.json` / `active-learning.json` — preference learning settings

## Test Organization

```
test/
├── unit/           # Pure functions, deterministic, no I/O (59 files)
├── integration/    # Cross-module interactions (6 files)
├── e2e/            # Full pipeline workflows (16 files)
├── performance/    # Benchmarks (placeholder)
└── memory/         # Memory profiling (placeholder)
```

- Unit fixtures: factory functions in `test/unit/<domain>/fixtures.mjs` and JSON in `test/unit/fixtures/dsl/`
- Integration fixtures: genome variants in `test/integration/fixtures/`
- E2E fixtures: game definitions and evolution seeds in `test/e2e/fixtures/`
- E2E helpers: mock I/O, mock fitness, output matching (`expectOutput()` supports regex)

## Genome Structure

```js
{ id: "uuid", definition: GameDefinition }
```

`GameDefinition` is the DSL object validated by JSON Schema (`schemas/dsl/game-definition.v1.json`) and semantic checks. Genomes are JSON-serializable for persistence and fingerprinting.
