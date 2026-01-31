# TUIGAMPLA-09: use-game-loop hook (integration glue)

**Status:** DONE
**Risk:** HIGH
**Dependencies:** TUIGAMPLA-01, TUIGAMPLA-04, TUIGAMPLA-05, TUIGAMPLA-06, TUIGAMPLA-07, TUIGAMPLA-08
**Blocks:** TUIGAMPLA-10

---

## What

Create the React hook that orchestrates the full game loop: creates agents from player assignments, calls `runSimulation()` with step control, wires the human agent's `onActionNeeded` to the UI dispatch, and handles watch mode delay.

## Codebase Assumptions (reassessed)

- `runSimulation()` in `src/simulation-engine/loop.js` is already `async` and accepts `{ stepControl: { onStep } }`.
- `recordStep()` in `step-execution.js` calls `stepControl.onStep(step)` synchronously (not awaited). This is fine because React `dispatch` is synchronous.
- `createHumanAgent()` in `src/tui/human-agent.js` is already implemented and returns a Promise-based agent.
- `createRandomPolicy()` / `createGreedyPolicy()` exist in `src/simulation-engine/agents/`. These return plain objects with `selectAction`; the hook must set `.id` on each to match `playerId`.
- `normalizeAgents()` in `src/simulation-engine/agent-serialization.js` accepts agents that already have `selectAction` and passes them through unchanged.
- The reducer (`app-reducer.js`) already supports `UPDATE_GAME_STATE`, `SET_LEGAL_ACTIONS`, `APPEND_LOG`, `SET_OUTCOME`, `TOGGLE_PAUSE`, `ADJUST_SPEED`.
- `app.jsx` currently renders `<GameScreen>` with no event handlers and no game loop integration. It must also be updated.
- Watch mode delay cannot live inside `onStep` (which is sync). Instead, the hook should introduce an async delay after each step when in watch/mixed mode, by wrapping the simulation call.
- Since `onStep` fires synchronously inside `executeActionStep`, the AI delay must be introduced by making the human agent's `onActionNeeded` or a wrapper add a delay. The simplest approach: wrap `onStep` to set state AND return a delay promise (but `recordStep` doesn't await). **Resolution**: Use a step-counting approach — the hook tracks steps via `onStep`, and the actual delay happens by pausing between the human agent's promise resolution cycles. For pure watch mode, the delay can be achieved by making all agents async with a sleep wrapper.

## Files to Touch

- `src/tui/hooks/use-game-loop.js` (**new**) — orchestrates: create agents from assignments, call `runSimulation()` with `stepControl.onStep`, wire human agent `onActionNeeded` to dispatch `SET_LEGAL_ACTIONS`, handle watch/mixed mode delay via async agent wrappers
- `src/tui/app.jsx` (**modified**) — import and call `useGameLoop`, pass dispatch/state, wire `GameScreen` event handlers (cursor, confirm, cancel)

## Out of Scope

Individual component rendering (done in TUIGAMPLA-06 through TUIGAMPLA-08), game-over screen, simulation-engine internals.

## Acceptance Criteria

- Full game plays through with human + AI players.
- `runSimulation()` called with correct config (definition, agents, stepControl, seed).
- `onStep` callback dispatches `UPDATE_GAME_STATE` and `APPEND_LOG` after each step.
- Human turns: simulation pauses until action selected in UI.
- AI turns (mixed mode): brief 200ms delay so human can see the action.
- Watch mode (all AI): configurable delay (default 500ms).
- Game termination dispatches `SET_OUTCOME`, transitions to gameover screen.
- Manual verification: play `multi-token-game.json` with 1 human + 1 AI to completion.

## Outcome

### What was actually changed vs originally planned

**Ticket corrections**: The original ticket only listed `src/tui/hooks/use-game-loop.js` as a file to touch. After reassessment, `src/tui/app.jsx` was added — it needed significant changes to wire the hook, event handlers, param selection flow, and watch mode controls.

**Implementation approach**: The ticket's assumption about watch mode delay was vague. The actual solution wraps AI agents' `selectAction` with async sleep (200ms mixed mode, configurable 500ms watch mode), leveraging the fact that `selectAndValidateAction` already `await`s agent responses. Pause support polls `isPaused` via a ref.

### Files changed
- `src/tui/hooks/use-game-loop.js` (**new**, ~210 lines) — `buildAgents()`, `buildOnStep()`, `useGameLoop()` hook
- `src/tui/app.jsx` (**modified**) — integrated `useGameLoop`, wired all `GameScreen` event handlers, added multi-param target selection flow, watch mode keyboard controls (space/+/-)

### Tests added
- `test/unit/tui/use-game-loop.test.mjs` (**new**, 17 tests) — covers `buildAgents` (10 tests: agent creation, human/AI behavior, pause, dispatch, Promise resolution) and `buildOnStep` (7 tests: dispatch patterns, effect formatting, defaults)

### Test results
- All 1680 unit tests pass (17 new + 1663 existing)
- TUI build (`scripts/build-tui.js`) succeeds
