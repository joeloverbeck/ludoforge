# HUMINT-002: Action selection prompt wiring

Status: Completed (2026-01-27)

## Goal
Provide a minimal CLI action-selection prompt that lists legal actions, accepts numeric choices, validates input, and returns the chosen action for execution.

## Scope of Work
- Define a `HumanIO` interface (read/write) that can be mocked in tests.
- Implement a prompt module that:
  - Renders a numbered list of legal actions using their `id`.
  - Re-prompts on invalid input (non-number, out of range).
  - Returns the selected action payload and index.
- Add a single-turn helper that lists legal actions via the game kernel and delegates to the prompt.

## Assumptions (corrected)
- The human interface module is currently `*.js` with matching `*.d.ts` files (no `*.ts` implementation files yet).
- Only the renderer and state-diff utilities exist; there is no prompt or turn-loop module to extend.
- The only human-interface tests today cover rendering; prompt tests must be added.

## File list it expects to touch
- `src/human-interface/index.js`
- `src/human-interface/index.d.ts`
- `src/human-interface/prompt.js`
- `src/human-interface/prompt.d.ts`
- `src/human-interface/turn-loop.js`
- `src/human-interface/turn-loop.d.ts`
- `test/human-interface/prompt.test.mjs`

## Out of scope
- No state rendering beyond listing actions (renderer work is in HUMINT-001).
- No feedback collection or rating prompts.
- No multi-player alternation or AI agent routing.
- No persistence or analytics integration.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/human-interface/prompt.test.mjs`
- `node --test test/game-kernel/actions.test.mjs`

### Invariants that must remain true
- Prompt must not reorder actions or alter action payloads.
- Invalid input must never select an action.
- Valid input must map deterministically to the displayed action list.

## Notes
- Ensure the prompt can be used with injected IO for tests.
- Keep formatting consistent with the renderer output style.

## Outcome
- Added prompt and turn-loop helpers plus exports for action selection; left renderer and public APIs intact.
- Added prompt tests for ordering, validation, and re-prompt behavior.
