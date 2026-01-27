# SIMENG-001: Simulation engine module scaffold and public types

## Summary
Introduce a simulation-engine module with a stable public interface and shared type definitions to anchor future work.

## Assumptions (updated)
- Runtime modules in this repo are published as ESM `.js` files with matching `.d.ts` declarations; no build step emits JS from TS.
- The simulation-engine scaffold should follow the `src/game-kernel` pattern (JS implementation + `.d.ts` types) rather than introduce new TS-only entry points.
- Current test suites do not reference simulation-engine directly; only type-checking and existing DSL/kernel tests must keep passing.

## File list it expects to touch
- src/simulation-engine/index.js
- src/simulation-engine/index.d.ts
- src/simulation-engine/types.d.ts

## Work plan
1. Create the simulation-engine folder and add an index module that exports the public surface.
2. Define shared types in `types.d.ts` for configuration, agents, trajectories, and results.
3. Wire the index to re-export types and runtime entry points (placeholders allowed).

## Out of scope
- Implementing the simulation loop.
- Adding RNG utilities or agent policies.
- Modifying the game-kernel behavior or API.
- Adding new tests unless a type or edge-case regression is discovered while scaffolding.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/dsl/schema.test.mjs`
- `node --test test/dsl/validate.test.mjs`
- `node --test test/dsl/semantic.test.mjs`
- `node --test test/game-kernel/scheduler.test.mjs`

### Invariants that must remain true
- Existing exports from `src/game-kernel` and `src/dsl` remain unchanged.
- No runtime behavior is added beyond simple exports; no side effects on import.
- Public types in `types.d.ts` are cohesive and documented enough for later tickets to implement against.

## Status
Completed.

## Outcome
- Added the `src/simulation-engine` scaffold with a placeholder `createSimulationEngine` export and a public type surface in `types.d.ts`.
- No new tests were added because no runtime invariants or regressions surfaced during scaffolding.
- Updated assumptions to reflect the repo's ESM + `.d.ts` module pattern.
