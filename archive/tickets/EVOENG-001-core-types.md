# EVOENG-001: Core Evolutionary Engine Types and Module Scaffold

## Goal
Introduce the initial evolutionary-engine module skeleton and core type definitions for genomes, populations, descriptors, niches, and operator interfaces. Keep the implementation minimal and focused on TypeScript contracts.

## Assumptions & scope update
- The repository already includes `src/` and `test/` trees with TypeScript type-only modules (e.g., `src/evaluation-analytics/types.ts`) and compile-time tests.
- There is currently no `src/evolutionary-engine/` module, so it must be introduced from scratch.
- `tsconfig.json` already includes `src/**/*.ts` and `test/**/*.ts`, so no configuration changes are expected.

## File list it expects to touch
- src/evolutionary-engine/index.ts
- src/evolutionary-engine/types.ts
- test/evolutionary-engine/types.test.ts (new)
- tsconfig.json (only if new paths need inclusion)

## Out of scope
- Any mutation, crossover, or repair logic
- Any MAP-Elites or selection logic
- Any evaluation, simulation, or persistence integration
- Changes to existing DSL, simulation-engine, or evaluation-analytics modules

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`

### Invariants that must remain true
- All new types are pure TypeScript and do not introduce runtime side effects.
- The evolutionary-engine module compiles without altering existing public exports.
- No existing tests outside `test/evolutionary-engine/types.test.ts` are modified.

## Status
- Completed (2026-01-27)

## Outcome
- Added the `src/evolutionary-engine` module with exported type definitions and a type-only index.
- Added a compile-time type test in `test/evolutionary-engine/types.test.ts` to lock the core interfaces.
- No changes to existing modules or configuration were required beyond the new files.
