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

Each generation: evaluate all genomes → place in MAP-Elites grid → select diverse shortlist → apply mutation/crossover with repair → next generation.

### Mutation Pipeline

Mutate → Validate → Repair → Validate → Evaluate. Repair operators restore structural validity after mutation/crossover produces invalid genomes.

### Operator Configuration

Mutation and crossover operators are toggled via `configs/evolution-operators.json`. There are 13+ mutation operators (numeric tweak, boolean toggle, action remove, phase add, zone remove, etc.).

## Key Conventions

- **ESM only** — all files use ES module imports (`import`/`export`), `"type": "module"` in package.json.
- **Node built-in test runner** — uses `node --test`, assertions via `node:assert/strict`. No Jest/Mocha/Vitest.
- **No external test mocking** — custom mock objects (e.g., `createMockHumanIo()`) instead of jest.mock/sinon.
- **Immutability** — create new objects, never mutate. Use `structuredClone()` for deep copies.
- **Composition over classes** — operators are plain functions, not class hierarchies.
- **Deterministic RNG** — seeded RNG (`createSeededRng()`) for reproducible simulations and tests.
- **JSON Schema validation** — Ajv validates game definitions (`schemas/dsl/`) and config files (`schemas/config/`).
- **Filenames** — lowercase with hyphens (e.g., `map-elites.js`, `active-learning.js`).
- **Commits** — short imperative sentences (e.g., "Revise README title and project description").

## CLI: ludoforge-evolve

```bash
ludoforge-evolve --config <path> --seeds <path> [--evaluator <path>] [--run-id <id>] [--resume] [--out <dir>] [--dry-run]
```

Evaluator modules must export one of: `createEvaluation()` returning `{ evaluator }`, an `evaluator` named export, a default export function, or an `evaluation` object with `{ evaluator }`.

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
