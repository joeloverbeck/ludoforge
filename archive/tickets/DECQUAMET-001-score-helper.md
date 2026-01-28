# [DECQUAMET] DECQUAMET-001: Add score evaluation helper for arbitrary states
Status: Completed (2026-01-27)

## Goal
Introduce a reusable helper that computes per-player scores at any state using the same scoring
expression as termination logic.

## File list (expected to touch)
- src/game-kernel/termination.js
- src/game-kernel/termination.d.ts
- src/game-kernel/index.js
- src/game-kernel/index.d.ts
- test/unit/game-kernel/termination.test.mjs

## Scope
- Add a helper (e.g., `computeScoresAtState`) in the termination module that accepts definition,
  state, and optional active player context and returns per-player scores.
- Reuse termination scoring expression evaluation logic to avoid drift.
- Keep termination output identical by refactoring termination scoring to call the helper.

## Out of scope
- No changes to termination conditions or outcome semantics.
- No changes to simulation or analytics modules.
- No changes to scoring expression syntax or evaluation rules.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/game-kernel/termination.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Termination scoring results are byte-for-byte identical to current behavior for the same inputs.
- The helper is pure and deterministic for a fixed state and RNG-free inputs.
- Existing simulation runs and metrics remain unchanged unless explicitly calling the new helper.

## Notes
- Use the same scoring expression used by termination (`definition.termination.scoring`).
- Return `undefined` or empty scores when no scoring expression is defined, consistent with termination.

## Outcome
- Implemented `computeScoresAtState` inside `src/game-kernel/termination.js` and exported via
  `src/game-kernel/index.js` instead of adding a new `scores.js` module.
- Added unit coverage for the helper in `test/unit/game-kernel/termination.test.mjs` and kept
  termination behavior unchanged by reusing the helper.
