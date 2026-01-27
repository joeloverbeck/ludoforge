# EVOENG-002: Genome Serialization and Identity

## Goal
Add deterministic genome serialization and ID generation for DSL ASTs, plus minimal validation hooks to ensure only valid genomes are admitted. Leverage existing DSL serialization/validation utilities instead of reimplementing them.

## File list it expects to touch
- src/evolutionary-engine/serialization.js
- src/evolutionary-engine/serialization.d.ts
- src/evolutionary-engine/index.ts
- test/evolutionary-engine/serialization.test.mjs

## Assumptions & scope corrections
- The repo already has deterministic DSL serialization (`src/dsl/serialize.js`) and validation (`src/dsl/validate.js`, `src/dsl/semantic.js`); this ticket should wrap those instead of duplicating logic.
- Runtime modules in this repo are JavaScript with `.d.ts` type companions; no `.ts` runtime file should be added for serialization.

## Out of scope
- Mutation, crossover, or repair logic
- MAP-Elites or selection logic
- Simulation execution or fitness scoring
- Persistence formats beyond in-memory serialization

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evolutionary-engine/serialization.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Serialization is deterministic for identical AST inputs.
- Genome IDs are stable across runs given the same input AST.
- Validation rejects invalid DSL inputs (schema + semantic) before generating IDs.

## Status
Completed on 2026-01-27.

## Outcome
- Implemented genome serialization, validation, and ID generation as a thin wrapper over existing DSL utilities in `src/evolutionary-engine/serialization.js` with `.d.ts` typings.
- Exported serialization helpers from `src/evolutionary-engine/index.ts`.
- Added runtime coverage in `test/evolutionary-engine/serialization.test.mjs` for deterministic serialization, stable IDs, and schema/semantic validation rejection.
