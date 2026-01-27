# EVOENG-007: Generation Loop and Human-Review Shortlist

## Goal
Implement the MVP generation loop: take a population, run evaluation adapter, place into MAP-Elites, emit next generation candidates, and produce a diverse shortlist for optional human review.

## File list it expects to touch
- src/evolutionary-engine/engine.js
- src/evolutionary-engine/engine.d.ts
- src/evolutionary-engine/types.ts
- src/evolutionary-engine/index.ts
- test/evolutionary-engine/engine.test.mjs

## Out of scope
- Preference model training or persistence
- Advanced novelty scoring beyond a simple heuristic
- Parallel/worker execution

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evolutionary-engine/engine.test.mjs`
- `node --test test/evolutionary-engine/map-elites.test.mjs`
- `node --test test/evolutionary-engine/evaluation-adapter.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Each generation output is derived only from validated, evaluated candidates.
- Shortlist selection is deterministic given the same RNG seed and inputs.
- The engine never emits invalid DSL genomes.

## Status
Completed on 2026-01-27.

## Outcome
Implemented the generation loop and shortlist in new `engine.js`/`engine.d.ts` with updated types and exports; added `engine.test.mjs` and aligned test coverage with existing evolutionary-engine modules instead of the originally listed simulation-engine test.
