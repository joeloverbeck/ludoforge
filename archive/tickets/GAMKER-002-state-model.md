# GAMKER-002: Core State Model Types

## Goal
Define the minimal game-kernel state model types and constructors used by the interpreter.

## Updated assumptions
- The repo currently has no `src/game-kernel/` module; this ticket will introduce it.
- Runtime modules in this repo are authored as `.js` with `.d.ts` for types, so game-kernel state will follow that pattern.
- The DSL AST does not define initial token instances, so initialization builds empty token collections and zones.
- Per-player variables and zones must be expanded from DSL defaults for each player.

## Scope
- Define types for state variables, tokens, zones, agents, and turn state.
- Provide a constructor that builds initial state from DSL defaults.
- Expose the state types and constructor through a new game-kernel index module.
- Keep types aligned with existing DSL AST types.

## File list it expects to touch
- `src/game-kernel/state.js` (new)
- `src/game-kernel/state.d.ts` (new)
- `src/game-kernel/index.js` (new)
- `src/game-kernel/index.d.ts` (new)
- `test/game-kernel/state.test.mjs` (new)

## Out of scope
- Action legality, effects, or scheduling
- Trigger loop detection
- Persistence or serialization formats

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/game-kernel/state.test.mjs`

### Invariants that must remain true
- State initialization is deterministic given the same AST input.
- Token IDs are unique within a single initialized state (via a monotonic generator on the state).
- Zones maintain declared ordering (ordered vs unordered) at initialization.

## Status
Completed

## Outcome
- Added a new game-kernel state module with runtime `.js` and typed `.d.ts` exports, plus an index re-export layer.
- Initialization now expands per-player variables and zones while keeping token collections empty (no initial tokens in the DSL).
- Included a monotonic token ID allocator and new tests validating determinism, expansion, and ID generation.
