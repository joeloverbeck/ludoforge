# TUIGAMPLA-10: Game over screen + replay

**Status:** DONE
**Risk:** LOW
**Dependencies:** TUIGAMPLA-09
**Blocks:** None

---

## What

Create the game-over screen showing outcome details with replay/quit options. Add quit confirmation prompt and replay (reset to setup) controls.

## Assumption Corrections

The original ticket included watch mode controls (Space pause/resume, +/- speed adjustment in `use-game-loop.js`) as part of the scope. These are **already implemented**:
- `app.jsx` lines 160-170: Space toggles pause, +/= increases speed, - decreases speed.
- `app-reducer.js`: `TOGGLE_PAUSE` and `ADJUST_SPEED` actions with 100-2000ms clamping at 100ms steps.

Watch mode controls are therefore **out of scope** for this ticket.

## Files to Touch

- `src/tui/components/game-over-screen.jsx` — **new**: outcome display (win/lose/draw per player), final scores, turn count, `[q]` quit / `[r]` replay
- `src/tui/app.jsx` — wire game-over screen component, quit confirmation prompt, replay (reset to setup)
- `src/tui/state/app-reducer.js` — add `RESTART_GAME` action to reset state for replay

## Out of Scope

- Simulation engine, game-kernel, board/state/action components (done), new game definitions.
- Watch mode controls (already implemented in TUIGAMPLA-09).

## Acceptance Criteria

- [x] Game over screen shows win/lose/draw per player.
- [x] Shows final scores if scoring defined in definition.
- [x] Shows termination reason and final turn count.
- [x] `q` shows confirmation prompt, confirms to exit.
- [x] `r` restarts game (returns to setup screen).

## Outcome

**What changed vs originally planned:**

The original ticket scoped both game-over screen creation AND watch mode controls (Space pause/resume, +/- speed). On investigation, watch mode controls were already fully implemented in TUIGAMPLA-09 (in `app.jsx` and `app-reducer.js`), so the ticket scope was narrowed to game-over screen + replay only.

**Actual changes:**

1. **`src/tui/components/game-over-screen.jsx`** (new) — Game over component showing per-player outcomes with color-coded WIN/LOSE/DRAW labels, final scores (when present), turn count, termination reason, and [q] quit / [r] replay controls with quit confirmation.

2. **`src/tui/state/app-reducer.js`** — Added `RESTART_GAME` action that resets state to initial while preserving `definition` and `playerAssignments`.

3. **`src/tui/app.jsx`** — Replaced inline gameover rendering with `<GameOverScreen>` component. Added quit confirmation flow (`q` → `y`/`n`), replay via `r` (dispatches `RESTART_GAME` and increments `gameKey`), and `showQuitConfirm` state.

4. **`src/tui/hooks/use-game-loop.js`** — Added `gameKey` parameter to reset `hasStartedRef` on replay. Enriched `SET_OUTCOME` dispatch to include `terminationReason` from simulation result.

5. **`test/unit/tui/app-reducer.test.mjs`** — Added 5 tests for `RESTART_GAME`: screen reset, definition preservation, assignment copying, transient state clearing, watchSpeed reset.
