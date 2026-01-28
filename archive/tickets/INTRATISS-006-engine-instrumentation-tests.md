# INTRATISS-006: Add engine-level tests for affectedPlayerIds

## Status
Completed (2026-01-28)

## Context
Instrumentation can silently fail and return empty `affectedPlayerIds`. The engine currently attributes per-player writes using the active player's context (no opponent targeting is implemented in effect application), and only after_action triggers are applied during step execution. We need engine-level tests that prove active-player attribution works for direct action effects and after_action trigger effects.

## Work
- Add simulation-engine unit tests that:
  - Execute an action that writes to a per-player variable and confirm the active player id appears in `affectedPlayerIds`.
  - Execute an after_action trigger that writes to a per-player variable and confirm attribution on the triggering step.
- Reuse or add fixtures under `test/unit/simulation-engine/fixtures.mjs` as needed.

## File list it expects to touch
- `test/unit/simulation-engine/core-loop.test.mjs`
- `test/unit/simulation-engine/fixtures.mjs`

## Out of scope
- Any changes to metric computation or feature vector ordering.
- Schema/type updates.
- E2E tests or doc updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/simulation-engine/core-loop.test.mjs`

### Invariants that must remain true
- Deterministic seeds produce identical `affectedPlayerIds` sequences.
- Active-player attribution works for both direct action effects and after_action trigger effects.
- No-legal-actions pass steps still report `affectedPlayerIds = []`.

## Outcome
- Updated the scope to match current engine capabilities (active-player attribution only; no opponent targeting or state_change trigger attribution in the loop yet).
- Added a unit test for per-player action effects to ensure `affectedPlayerIds` is populated for the active player.
