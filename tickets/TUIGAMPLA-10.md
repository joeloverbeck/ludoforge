# TUIGAMPLA-10: Game over screen + watch mode controls

**Status:** TODO
**Risk:** LOW
**Dependencies:** TUIGAMPLA-09
**Blocks:** None

---

## What

Create the game-over screen showing outcome details with replay/quit options, and add watch mode controls (pause/resume, speed adjustment) to the game loop hook.

## Files to Touch

- `src/tui/components/game-over-screen.jsx` — outcome display (win/lose/draw per player), final scores, turn count, `[q]` quit / `[r]` replay
- `src/tui/app.jsx` — wire gameover screen, quit confirmation prompt, replay (reset to setup)
- `src/tui/hooks/use-game-loop.js` — Space pause/resume, +/- speed adjustment (100ms-2000ms, step 100ms)

## Out of Scope

Simulation engine, game-kernel, board/state/action components (done), new game definitions.

## Acceptance Criteria

- Game over screen shows win/lose/draw per player.
- Shows final scores if scoring defined in definition.
- Shows termination reason and final turn count.
- `q` shows confirmation prompt, confirms to exit.
- `r` restarts game (returns to setup screen).
- Watch mode: Space toggles pause/resume.
- Watch mode: `+` increases speed (capped at 2000ms), `-` decreases (capped at 100ms).
- Manual verification: watch mode with `--watch --speed 200`.
