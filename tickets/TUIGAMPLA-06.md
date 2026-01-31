# TUIGAMPLA-06: App root + setup screen + game screen shell

**Status:** TODO
**Risk:** MEDIUM
**Dependencies:** TUIGAMPLA-03, TUIGAMPLA-05
**Blocks:** TUIGAMPLA-07, TUIGAMPLA-08, TUIGAMPLA-09

---

## What

Create the top-level Ink application component with screen switching, the game setup screen (player assignment), and the game screen layout shell with turn header and state panel.

## Files to Touch

- `src/tui/app.jsx` — root component with `useReducer(appReducer, initialAppState)`, screen switching (setup/playing/gameover)
- `src/tui/components/game-setup-screen.jsx` — player slot assignment (Human/AI Random/AI Greedy per slot), j/k navigation, Tab between players, `s` to start
- `src/tui/components/game-screen.jsx` — 2x2 flexbox layout shell (TurnHeader + BoardPanel/StatePanel + ActionPanel/EffectLog)
- `src/tui/components/turn-header.jsx` — turn, round, phase, active player display
- `src/tui/components/state-panel.jsx` — global + per-player variable tables with player color headers

## Out of Scope

Board panel, action panel, effect log, game-over screen, human-agent wiring, simulation loop integration.

## Acceptance Criteria

- `npm run build:tui` succeeds.
- Setup screen renders correct number of player slots from definition.
- `--player` CLI args pre-fill assignments.
- `--watch` skips setup, assigns all AI Random.
- Tab cycles between player slots.
- `s` key transitions to playing screen.
- Game screen renders 2x2 flexbox layout.
- Turn header shows turn/phase/player info.
- State panel shows global and per-player variables.
- Manual verification with `test/e2e/fixtures/` game definitions.
