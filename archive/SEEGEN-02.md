# SEEGEN-02: Grammar-based seed generator (core module, no IO)

**Status**: Completed

## Summary

Create `src/seed-generation/grammar-generator.js` exporting `generateGameDefinition({ rng, grammar })` that constructs a schema-valid, semantically-valid `GameDefinition` from DSL primitives using a seeded RNG. The generator produces variable-based games with actions, effects, and termination conditions. Configurable via `grammar.limits` and `grammar.weights`.

## Files to touch

- `src/seed-generation/grammar-generator.js` — **create** (main generator)
- `src/seed-generation/primitives.js` — **create** (helpers: generate variables, effects, expressions, refs, termination conditions)
- `test/unit/seed-generation/grammar-generator.test.mjs` — **create**
- `test/unit/seed-generation/fixtures.mjs` — **create** (shared test configs)

## Out of scope

- Coverage targeting / bin-aware logic (SEEGEN-03)
- `generateSeedPopulation()` orchestrator (SEEGEN-03)
- Folder seeding (SEEGEN-04)
- Runner integration (SEEGEN-05)
- Zone and token type generation (future enhancement; initial generator focuses on variable-based games with `inc`/`dec`/`set` effects)

## Acceptance criteria

### Tests that must pass
- `generateGameDefinition({ rng, grammar })` returns a `GameDefinition` object
- Output passes `validateGameDefinition()` for 100 different RNG seeds (seed sweep)
- Output passes `validateSemanticDefinition()` for 100 different RNG seeds
- Every definition has `players.count >= 1`
- Every definition has >= 1 action with >= 1 effect that changes state (no no-op games)
- Every definition has >= 1 termination condition and a `maxTurns` fallback
- No dangling refs: all `{ kind: "var", id }` point to declared variables
- `grammar.limits` controls ranges: `{ minVariables, maxVariables, minActions, maxActions }`
- `grammar.weights` controls effect kind distribution: `{ inc: 3, dec: 2, set: 1 }` etc.
- Identical `rng` seed + `grammar` config produces identical output (determinism)
- Function imports no `node:fs` modules (no IO)
- `npm run test:unit` passes
- `tsc -p tsconfig.json` passes

### Invariants
- Uses `createSeededRng()` from `src/simulation-engine/rng.js` or accepts an RNG object with the same `{ next(), nextInt() }` interface
- Follows immutable patterns (no mutation)
- Uses composition (plain functions, no classes)
- File naming: lowercase-with-hyphens

## Outcome

All 14 unit tests pass. Schema validation and semantic validation succeed across 100+ seeds with multiple grammar configurations (default, minimal, dec-only, max). Type checking passes cleanly. No pre-existing test regressions introduced.

### Files created
- `src/seed-generation/primitives.js` — RNG helpers (`pickInt`, `pickWeighted`, `pickFrom`) and DSL node builders (`varRef`, `valueExpr`, `refExpr`, `cmpExpr`, `incEffect`, `decEffect`, `setEffect`) plus compound builders for variables, effects, preconditions, and termination conditions
- `src/seed-generation/grammar-generator.js` — Main `generateGameDefinition({ rng, grammar })` implementing the 7-step generation algorithm: resolve limits/weights → pick counts → generate variables → assign to actions (round-robin) → generate actions with preconditions for `inc` effects → generate termination conditions → assemble
- `test/unit/seed-generation/fixtures.mjs` — Shared grammar configs and `makeRng()` helper
- `test/unit/seed-generation/grammar-generator.test.mjs` — 14 tests covering shape, schema, semantics, counts, refs, weights, determinism, purity, and defaults
