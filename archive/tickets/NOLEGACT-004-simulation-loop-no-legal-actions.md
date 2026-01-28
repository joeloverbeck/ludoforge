# NOLEGACT-004: Reorder simulation loop and implement no-legal-actions policy

## Goal
Reorder the simulation loop to list legal actions before termination evaluation and implement the `turn.noLegalActions` policy behavior (`terminate`, `pass`, `error`).

## Updated assumptions
- `turn.noLegalActions` already exists in the DSL schema/types and is semantically validated in `src/dsl/semantic.js`.
- `meta.legalActionCount` / `meta.hasLegalActions` refs already exist in the DSL types and are supported by `evaluateTermination`.
- Current behavior: the simulation loop evaluates termination before listing legal actions and hard-codes a draw on zero legal actions (`terminationReason="stalemate"`).

## Scope
- Reorder core loop steps in `src/simulation-engine/loop.js` to compute legal actions first.
- Pass `legalActionCount` and `hasLegalActions` into termination evaluation context.
- Implement no-legal-actions handling per policy (terminate/pass/error), preserving legacy stalemate draws when no policy is configured.
- Ensure trajectory step snapshots record legalActionCount and pass steps record a null/explicit pass action id.
- Update simulation engine types to reflect pass-step action ids and any new termination reasons.

## File list
- `src/simulation-engine/loop.js`
- `src/simulation-engine/types.d.ts`
- `test/unit/simulation-engine/core-loop.test.mjs`
- `test/unit/simulation-engine/fixtures.mjs`

## Out of scope
- DSL schema/type changes (meta refs and `turn.noLegalActions` already exist).
- Degeneracy and analytics updates.
- E2E fixture and human-loop updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/simulation-engine/core-loop.test.mjs`
- `node --test test/unit/simulation-engine/fixtures.mjs`
- `npm run test:unit`

### Invariants that must remain true
- `trajectory.steps[i].legalActionCount` matches the actual legal action list length.
- Termination reasons for `condition`, `max-turns`, and `loop-detected` remain unchanged.
- Pass policy does not apply action costs/effects/triggers and still advances turn/phase exactly once.
- No RNG consumption is introduced by the reordered termination/listing steps.

## Status
Completed.

## Outcome
- Reordered the loop to list legal actions before termination evaluation and to pass meta counts into termination checks.
- Implemented no-legal-actions handling for terminate/pass/error policies with legacy stalemate fallback.
- Updated types and core-loop tests to cover pass steps, terminate outcomes, and error behavior.
