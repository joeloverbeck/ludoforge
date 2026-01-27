# EVOENG-005: MAP-Elites Grid and Selection Metadata
Status: Completed

## Goal
Implement a MAP-Elites grid structure that places evaluated genomes into descriptor bins, tracks elites per niche, and emits selection metadata (elite markers, novelty score stubs). Align implementation with the repo's ESM JS + `.d.ts` pattern.

## Current repo notes (reassessed)
- No MAP-Elites module exists yet under `src/evolutionary-engine/`.
- Evolutionary-engine runtime modules are ESM `.js` files with `.d.ts` declarations (types live in `src/evolutionary-engine/types.ts`).
- There is no existing MAP-Elites test file; we need to introduce it.

## File list it expects to touch
- src/evolutionary-engine/map-elites.js
- src/evolutionary-engine/map-elites.d.ts
- src/evolutionary-engine/types.ts
- src/evolutionary-engine/index.ts
- test/evolutionary-engine/map-elites.test.mjs

## Out of scope
- Mutation/crossover/repair implementation changes
- Simulation or evaluation scoring logic
- Human preference loop integration

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evolutionary-engine/map-elites.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Only the top-ranked candidate per niche is marked elite.
- Descriptor binning is deterministic for the same descriptor input.
- Replacing an elite only occurs when fitness improves (or per configured tie-break).

## Outcome
- Implemented MAP-Elites placement utilities (`map-elites.js` + `.d.ts`) with deterministic binning and elite selection.
- Added MAP-Elites config/result types to `types.ts` and exports in `index.ts`.
- Added `map-elites.test.mjs` to cover deterministic binning, elite selection, and tie behavior.
