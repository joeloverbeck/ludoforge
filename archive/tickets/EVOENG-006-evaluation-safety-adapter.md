# EVOENG-006: Evaluation Adapter and Safety Gates
Status: Completed

## Goal
Create an evolutionary-engine adapter that validates genomes, applies safety gates, and invokes a supplied evaluator to return fitness, descriptors, and diagnostics for a genome.

## Assumptions and scope adjustments
- There is currently no evaluation adapter module in `src/evolutionary-engine/`.
- Genome validation already exists in `src/evolutionary-engine/serialization.js` via `validateGenomeDefinition`.
- There is no shared runtime evaluation entry point yet, so the adapter must accept a caller-provided evaluator function.

## File list it expects to touch
- src/evolutionary-engine/evaluation-adapter.js (new)
- src/evolutionary-engine/evaluation-adapter.d.ts (new)
- src/evolutionary-engine/types.ts
- src/evolutionary-engine/index.ts
- test/evolutionary-engine/evaluation-adapter.test.mjs (new)

## Out of scope
- MAP-Elites selection logic changes
- Mutation/crossover/repair implementation changes
- Persistence or storage layer updates

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evolutionary-engine/evaluation-adapter.test.mjs`
- `node --test test/dsl/validate.test.mjs`
- `node --test test/dsl/semantic.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Invalid DSL inputs are hard-rejected before the evaluator runs.
- Safety gate failures are surfaced in diagnostics without throwing.
- Adapter output always includes `fitness`, `descriptors`, and `diagnostics` fields (nulls allowed on failure).

## Outcome
- Implemented `evaluateGenome` adapter with validation short-circuiting, safety gate handling, and evaluator passthrough.
- Added adapter options/results/safety gate types to `types.ts` and exports in `index.ts`.
- Added `evaluation-adapter.test.mjs` to cover invalid input short-circuiting, safety failures, and success flow.
