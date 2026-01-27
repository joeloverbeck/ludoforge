# EVOENG-003: Mutation and Repair Framework (Minimal Operators)

## Goal
Implement the mutation/repair framework with a small, safe set of mutation operators (e.g., numeric tweak, boolean toggle) and a repair pass that restores DSL safety constraints for variable/attribute domains.

## File list it expects to touch
- src/evolutionary-engine/mutation.js
- src/evolutionary-engine/mutation.d.ts
- src/evolutionary-engine/repair.js
- src/evolutionary-engine/repair.d.ts
- src/evolutionary-engine/types.ts
- src/evolutionary-engine/index.ts
- test/evolutionary-engine/mutation.test.mjs

## Out of scope
- Crossover operators
- MAP-Elites or selection logic
- Evaluation and simulation integration
- Mutations that add/remove entire action/effect trees
- Mutation of IDs, references, or action/effect graph structure

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evolutionary-engine/mutation.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Mutations never mutate the input AST in place.
- Repair always produces a DSL-valid genome (bounded int/bool/enum domains) or reports a clear failure.
- Mutation respects configured bounds (no unbounded variable growth).

## Notes (assumptions confirmed/updated)
- Runtime modules in `src/` are `.js` with accompanying `.d.ts`; TypeScript only type-checks `.ts` files.
- No mutation/repair implementation or tests exist yet; the framework will be introduced alongside new tests.

## Status
Completed on 2026-01-27.

## Outcome
- Added minimal mutation operators for numeric tweaks and boolean toggles, plus a safety-focused repair pass for int/bool/enum domains.
- Introduced mutation/repair runtime modules with `.d.ts` typings and exported them from the evolutionary engine index.
- Added tests covering non-mutating behavior, bound-respecting mutations, and repair outcomes (including failure on invalid bounds).
