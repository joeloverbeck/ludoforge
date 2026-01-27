# HUMINT-001: CLI state renderer with summaries and deltas

Status: Completed

## Goal
Implement a text renderer that formats kernel state into a readable, turn-based view with public/private sections, zone summaries, and delta highlights.

## Scope of Work
- Add a human-interface module that can render:
  - Turn number, active player, and key variables.
  - Zone contents with collapsing for large zones (top N items + counts).
  - Deltas since last turn (changed variables, moved tokens).
- Define a minimal, pure data shape for render input so the renderer can be tested without full kernel execution.
- Provide a simple formatter that outputs plain text suitable for CLI display.
- Create the human-interface module from scratch (no existing implementation in src/).
- Match the repo’s JS + `.d.ts` pattern (no new TS runtime files).

## File list it expects to touch
- `src/human-interface/index.js`
- `src/human-interface/index.d.ts`
- `src/human-interface/renderer.js`
- `src/human-interface/renderer.d.ts`
- `src/human-interface/state-diff.js`
- `src/human-interface/state-diff.d.ts`
- `test/human-interface/renderer.test.mjs`

## Out of scope
- No terminal I/O (readline, prompts, stdin/stdout wiring).
- No action selection or feedback collection.
- No persistence or analytics integration.
- No changes to game-kernel logic or state mutation rules.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/human-interface/renderer.test.mjs`
- `node --test test/game-kernel/state.test.mjs`
- `node --test test/game-kernel/actions.test.mjs`

### Invariants that must remain true
- Renderer must not mutate the input state or any nested objects.
- Private zones are only included in output when the active human is the viewer.
- Delta highlights only reflect changes between the provided previous and current snapshots.

## Notes
- Keep the renderer deterministic: same input yields identical output.
- Prefer small helpers for zone summarization and diff rendering.

## Outcome
- Built a new `src/human-interface` module in JS with `.d.ts` declarations and a pure render input shape.
- Implemented zone summarization, private/public filtering, and delta rendering for variables and tokens.
- Added a focused renderer test suite; no changes to game-kernel logic were needed.
