# HUMINT-004: Multi-participant and mixed agent routing

Status: Completed (2026-01-27)

## Goal
Add a small orchestration layer that alternates prompts across multiple humans and supports mixed human/AI agents by delegating action selection.

## Scope of Work
- Define a participant config (human vs AI, display name, IO bindings).
- Implement a router module that:
  - Chooses the correct action provider for the active player.
  - Alternates prompts for multiple human participants.
  - Renders state for the active human only (private zones hidden for non-active viewers by renderer defaults).
- Keep orchestration limited to a single turn (no full game loop).

## Assumptions (corrected)
- The human-interface implementation is JavaScript with matching `*.d.ts` files; no `participants.ts` exists yet.
- The router is a new module added to the human-interface surface area with a new test file.

## File list it expects to touch
- `src/human-interface/router.js`
- `src/human-interface/router.d.ts`
- `src/human-interface/index.js`
- `src/human-interface/index.d.ts`
- `test/human-interface/router.test.mjs`

## Out of scope
- No AI policy implementation; AI action provider is injected.
- No persistence or logging.
- No changes to simulation-engine scheduling logic.
- No full-session play loop or batch runs.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/human-interface/router.test.mjs`

### Invariants that must remain true
- Router never calls a human prompt for AI participants.
- Router never exposes private zones to non-active humans.
- Action providers are invoked exactly once per turn.

## Notes
- Keep router inputs minimal to avoid coupling with kernel internals.
- Use the renderer from HUMINT-001 and prompt from HUMINT-002.

## Outcome
- Added a router module plus exports to route human vs AI turns without changing existing public APIs.
- Added router tests to cover human rendering, private visibility scoping, and AI delegation behavior.
