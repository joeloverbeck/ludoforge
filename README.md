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

## Tests
- `node --test test/dsl/schema.test.mjs`
- `node --test test/dsl/validate.test.mjs`
- `tsc -p tsconfig.json`
