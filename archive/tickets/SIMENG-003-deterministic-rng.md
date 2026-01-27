# SIMENG-003: Deterministic RNG utilities for simulations

## Summary
Add seeded RNG utilities and wiring so simulations can be reproduced given the same seed.

## Assumptions (reassessed)
- `SimulationConfig` already includes an optional `seed` field; the loop does not yet consume it.
- There is no existing RNG utility module or tests in `src/simulation-engine`.
- Agent policies do not receive RNG yet (tracked separately in SIMENG-004).

## File list it expects to touch
- src/simulation-engine/rng.js
- src/simulation-engine/index.js
- src/simulation-engine/index.d.ts
- src/simulation-engine/types.d.ts
- test/simulation-engine/rng.test.mjs

## Work plan
1. Implement a small, dependency-free seeded RNG (LCG) that yields stable sequences.
2. Expose RNG creation in the public interface; keep `SimulationConfig.seed` as the explicit hook (no defaults).
3. Add tests verifying identical seeds produce identical sequences, different seeds diverge, and seed validation.

## Out of scope
- Changing agent policies to use RNG (that happens in a separate ticket).
- Parallel execution or worker threads.
- Kernel behavior changes.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/simulation-engine/rng.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- RNG output is deterministic for a given seed on Node LTS.
- RNG does not mutate global state or rely on `Math.random()`.
- Simulation configuration must carry the seed explicitly (no hidden defaults).

## Status
Completed.

## Outcome
- Added a dependency-free LCG-based `createSeededRng` export with seed validation.
- Added RNG-focused tests for determinism, divergence, and bounds validation.
- Left simulation loop integration and agent policy usage untouched; `seed` remains an explicit config field for future wiring.
