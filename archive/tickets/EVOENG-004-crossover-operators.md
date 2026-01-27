# EVOENG-004: Crossover Operators (Subtree Swap)

## Goal
Add a basic crossover operator that swaps compatible subtrees between two parent genomes (e.g., state sections or action lists), plus compatibility checks.

## File list it expects to touch
- src/evolutionary-engine/crossover.js
- src/evolutionary-engine/crossover.d.ts
- src/evolutionary-engine/types.ts
- src/evolutionary-engine/index.ts
- test/evolutionary-engine/crossover.test.mjs

## Out of scope
- Mutation operators beyond those already defined
- MAP-Elites grid or selection mechanics
- Simulation, evaluation, or preference model integration
- Fine-grained crossover of individual actions/effects or state attributes
- Crossover across optional state sections beyond variables (token types, zones)

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evolutionary-engine/crossover.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Crossover outputs are DSL-valid or explicitly rejected.
- Parent genomes are never mutated in place.
- Crossover only occurs when schema compatibility checks pass.

## Notes (assumptions confirmed/updated)
- Runtime evolutionary engine modules are `.js` with matching `.d.ts` declarations; TypeScript only type-checks `.ts` files.
- No crossover implementation or tests exist yet; this ticket introduces the operator and tests.
- Scope is limited to swapping whole `state.variables` or `actions` arrays between parents, with post-swap DSL validation.

## Status
Completed on 2026-01-27.

## Outcome
- Implemented a subtree-swap crossover operator in runtime `.js` with `.d.ts` typings (rather than a `.ts` module), matching existing engine modules.
- Added a crossover helper entry point and exported the operator from the evolutionary engine index.
- Added tests for action swaps, non-mutation of parents, and validation rejection when swapping breaks references.
