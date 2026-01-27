# GAMKER-003: Action Legality and Bounds Enforcement

Status: Completed (2026-01-27)

## Goal
Implement action validation and bounds enforcement for the game kernel.

## Scope
- Compute legal actions for a given agent/phase based on preconditions and action metadata.
- Validate a chosen action against legality and integer bounds.
- Enforce integer bounds via reject or clamp behavior (configurable per validation call).
- Provide lightweight helpers without implementing the full action execution pipeline.

## Assumptions (corrected)
- The kernel is currently implemented in `src/game-kernel/*.js` with matching `.d.ts` files.
- There is no `actions.ts` module yet; we will add `actions.js` instead.
- Zone capacity is not represented in the DSL schema, so capacity enforcement is deferred.

## File list it expects to touch
- `src/game-kernel/actions.js`
- `src/game-kernel/actions.d.ts`
- `src/game-kernel/index.js`
- `src/game-kernel/index.d.ts`
- `test/game-kernel/actions.test.mjs`

## Out of scope
- Trigger loop detection
- Turn/phase scheduler implementation
- Outcome evaluation and termination conditions
- Zone capacity enforcement (requires schema support)

## Acceptance criteria
### Specific tests that must pass
- `node --test test/game-kernel/actions.test.mjs`
- `node --test test/game-kernel/state.test.mjs`

### Invariants that must remain true
- A legal action remains legal only if its precondition evaluates true at execution time.
- Bounds enforcement is deterministic and does not depend on iteration order.
- Bounds enforcement for integer variables respects min/max and configured mode.

## Outcome
- Added an `actions.js` helper module for legality checks and bounds validation; no full action execution pipeline yet.
- Implemented integer bounds enforcement for variable effects only (zone capacity deferred until schema support exists).
- Added kernel action legality tests; existing state tests remain unchanged.
