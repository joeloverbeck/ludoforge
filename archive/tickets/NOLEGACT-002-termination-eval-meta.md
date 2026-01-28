# NOLEGACT-002: Resolve meta refs in termination evaluation

## Goal
Allow `evaluateTermination` to resolve `meta.legalActionCount` and `meta.hasLegalActions` when evaluating termination conditions.

## Scope
- Add meta resolution to the termination expression evaluator using the evaluation context.
- Update termination option types to accept meta fields for evaluation context.
- Add unit tests that prove meta-driven termination conditions match correctly.
 - No DSL/schema/semantic changes; meta refs are already defined/validated in `src/dsl/types.ts` and schema tests.

## File list
- `src/game-kernel/termination.js`
- `src/game-kernel/termination.d.ts`
- `test/unit/game-kernel/termination.test.mjs`

## Out of scope
- DSL schema changes (handled elsewhere).
- Simulation loop reordering or adding meta values to engine callers.
- No-legal-actions policy behavior.
- Changes to analytics, degeneracy flags, or metrics.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/game-kernel/termination.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Termination evaluation remains RNG-free and deterministic.
- Meta refs are read-only and do not persist into state snapshots.
- Existing termination behavior (max-turns, scoring, condition matching) remains unchanged when no meta refs are present.

## Status
Completed — January 28, 2026.

## Outcome
- Implemented termination meta resolution and options typing (no DSL/schema changes needed).
- Added evaluator unit tests for `meta.legalActionCount` and derived `meta.hasLegalActions`.
