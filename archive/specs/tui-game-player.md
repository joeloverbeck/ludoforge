# Spec: TUI Game Player (`ludoforge-play`)

A terminal UI application that lets a user play or watch any LudoForge game definition interactively.

---

## 1. Overview

`ludoforge-play` loads a game definition JSON file, lets the user assign players (human or AI), then runs the game using the **same simulation loop** that evolution uses. Human players interact via cursor-based action selection in the terminal. AI players (random, greedy) run automatically. A watch mode allows spectating all-AI games.

**Core principle**: Maximal code reuse. The TUI plugs into the existing `runSimulation()` pipeline — no separate game loop.

---

## 2. Architecture

### 2.1 Async Simulation Loop Refactoring

The simulation loop (`src/simulation-engine/loop.js`) currently calls `agent.selectAction()` synchronously. To support human players, it must become async:

| File | Change |
|------|--------|
| `src/simulation-engine/agent-action.js` | `selectAndValidateAction` → `async`, `await agent.selectAction(...)` |
| `src/simulation-engine/loop.js` | `runSimulationLoop`, `runSimulation`, `runRollout` → `async` |
| `src/simulation-engine/simultaneous-loop.js` | `runSimultaneousLoop` → `async` |
| `src/simulation-engine/batch.js` | `runBatchSimulations` → `async` |
| `src/simulation-engine/index.d.ts` | Return types → `Promise<>` |
| `src/simulation-engine/rollout.d.ts` | Return types → `Promise<>` |
| All callers (evolution pipeline, metrics, CLI, tests) | Add `await` |

**Why this is safe**: `await syncValue` resolves immediately. Existing AI agents return synchronously — awaiting them is a no-op. Only the new human agent returns a Promise.

### 2.2 Human Agent

A new agent conforming to the existing agent interface, whose `selectAction` returns a `Promise<Action>`:

```js
// src/tui/human-agent.js
export function createHumanAgent({ playerId, onActionNeeded }) {
  return {
    id: playerId,
    selectAction({ legalActions, context, definition, state }) {
      // Returns a Promise that resolves when the user picks an action in the UI
      return onActionNeeded({ legalActions, context, definition, state });
    },
  };
}
```

The `onActionNeeded` callback is provided by the React/Ink UI layer. It:
1. Updates UI state to show the action picker for this player
2. Returns a Promise that resolves when the user confirms their selection
3. If the action has targets, the callback handles target resolution before resolving

### 2.3 TUI Integration Flow

```
CLI parses args → load & validate definition → show setup screen
  → user assigns players (human/AI) → create agents array
  → call runSimulation({ definition, agents, stepControl })
    → simulation loop runs
    → on AI turn: selectAction resolves immediately
    → on human turn: selectAction returns Promise, UI renders action picker,
       Promise resolves when user confirms → loop continues
    → stepControl.onStep fires after each step → UI updates board/log
  → game terminates → show outcome screen
```

### 2.4 Real-Time UI Updates via `stepControl.onStep`

The existing `stepControl.onStep(step)` callback (in `src/simulation-engine/step-execution.js:153`) fires after every action step with the full step object:

```js
step = {
  turn, phase, playerId, actionId, legalActionCount,
  state,              // full state clone after this step
  appliedEffects,     // what changed
  skippedEffects,     // what failed
  skippedTriggers,    // what was blocked
  stateHash, bindings, affectedPlayerIds, affectedGlobal,
}
```

The TUI passes an `onStep` callback that updates:
- Board panel (new state snapshot)
- Effect log (formatted applied effects)
- State panel (variable values)
- Turn header (turn/phase/player)

---

## 3. TUI Library: Ink

**Choice**: [Ink](https://github.com/vadimdemedes/ink) (React for CLI)

**Rationale**:
- ESM-native (LudoForge is ESM-only)
- React component model: game state changes trigger re-renders via `setState`
- Flexbox layout via Yoga engine — same as React Native
- Rich ecosystem: `ink-select-input` for cursor selection, `useInput` for keyboard
- Battle-tested: Claude Code, Gemini CLI, Qwen Code all use Ink
- 3M+ weekly npm downloads, actively maintained

**JSX handling**: LudoForge uses plain JS with JSDoc types. Ink requires JSX. Use `esbuild` to transpile only `src/tui/**/*.jsx` → `dist/tui/`. The rest of the codebase stays plain JS.

---

## 4. CLI Interface

```
ludoforge-play <game.json> [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<game.json>` | Yes | Path to a GameDefinition JSON file |
| `--watch` | No | All-AI watch mode (no human players) |
| `--speed <ms>` | No | AI step delay in watch mode (default 500ms) |
| `--seed <n>` | No | RNG seed for reproducibility |
| `--player <n>=<type>` | No | Pre-assign player (e.g., `--player 1=human --player 2=random`) |

### Startup Sequence

1. Parse CLI args
2. Read and validate JSON against `schemas/dsl/game-definition.v1.json` via Ajv (already a dependency)
3. If `--watch`, assign all players as AI (default: random)
4. If `--player` flags provided, pre-fill assignments
5. Otherwise, show interactive setup screen
6. Create agent array (human agents + AI agents)
7. Call `runSimulation({ definition, agents, stepControl })` — the same function evolution uses
8. On termination, show outcome screen

---

## 5. Terminal Layout

Target: 80×24 minimum terminal. All panels use Ink flexbox via `<Box>`.

```
+------------------------------------------------------------------------+
| TURN 3 / ROUND 2 / PHASE: main          Player 1 (Human) - YOUR TURN  |
+-----------------------------------+------------------------------------+
|          BOARD                    |         STATE                      |
|                                   |                                    |
| [barracks] warrior: t1 t2        | Global:                            |
| [field]    warrior: t3            |   turnCount = 2                    |
| [tower]    archer:  t4            |                                    |
|                                   | Player 1 (Human):                  |
|                                   |   score = 3, health = 10           |
|                                   |                                    |
|                                   | Player 2 (AI Random):              |
|                                   |   score = 1, health = 8            |
+-----------------------------------+------------------------------------+
| ACTIONS                           | EFFECT LOG                         |
|                                   |                                    |
| > deployWarrior                   | [T2] P2: charge → energy +1       |
|   marchWarrior (select target)    | [T2] trigger: start_turn fired     |
|   deployArcher                    | [T3] P1: (your turn)               |
|                                   |                                    |
| [j/k] navigate  [Enter] select   | [scroll: PgUp/PgDn]               |
+-----------------------------------+------------------------------------+
```

### Layout Proportions (flexbox)

- **TurnHeader**: full width, 1 row fixed
- **Middle row**: `flexGrow: 1`, split 50/50
  - **BoardPanel** (left): zones + tokens
  - **StatePanel** (right): variables
- **Bottom row**: ~8 rows fixed, split 50/50
  - **ActionPanel** (left): action picker or AI display
  - **EffectLog** (right): scrollable log

---

## 6. Component Hierarchy

```
<App>
  <GameSetupScreen>                 # Before game starts
    <PlayerSlotPicker slot={n}>     # Human | AI Random | AI Greedy per slot
  <GameScreen>                      # During play
    <TurnHeader>                    # Turn, round, phase, active player
    <Box flexDirection="row">       # Middle row
      <BoardPanel>                  # Left half
        <ZoneDisplay zone={z}>      # One per zone
          <TokenBadge token={t}>    # One per token in zone
      <StatePanel>                  # Right half
        <VariableTable>             # Global vars + per-player vars
    <Box flexDirection="row">       # Bottom row
      <ActionPanel>                 # Left half
        <ActionList>                # Selectable cursor list (human)
        <TargetList>                # Target picker (when action has targets)
        <AIActionDisplay>           # Shows AI choice (AI turn)
      <EffectLog>                   # Right half, scrollable
  <GameOverScreen>                  # After game ends
    <OutcomeDisplay>                # Win/lose/draw per player
    <ScoreDisplay>                  # Final scores if scoring defined
```

---

## 7. Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `j` / `↓` | Action/Target list | Move cursor down |
| `k` / `↑` | Action/Target list | Move cursor up |
| `Enter` | Action/Target list | Confirm selection |
| `Escape` | Target selection | Go back to action list |
| `q` | Any | Quit (with confirmation prompt) |
| `Space` | Watch mode | Pause / resume |
| `+` / `-` | Watch mode | Increase / decrease AI speed (100ms–2000ms) |
| `PgUp` / `PgDn` | Effect log | Scroll log |

---

## 8. Interaction Flows

### 8.1 Human Player Turn

1. Simulation loop reaches human player, `await agent.selectAction(...)` pauses
2. `onActionNeeded` callback fires, sets UI to "awaiting action" state
3. UI renders `<ActionList>` with legal actions as selectable items
4. User navigates with j/k, presses Enter to confirm
5. If selected action has `targets`:
   a. For each target in `action.targets`, call `resolveSelector(target.selector, state, context)` to get candidates
   b. Render `<TargetList>` with candidates (token IDs + type + zone for tokens, player IDs for players)
   c. User selects target(s). Escape goes back to action list.
   d. Assemble target `bindings` map
6. Promise resolves with selected action (+ bindings if targets)
7. Simulation loop continues: applies costs, effects, triggers
8. `stepControl.onStep` fires → UI updates board, log, state

### 8.2 AI Player Turn

1. Simulation loop reaches AI player, `agent.selectAction()` returns synchronously
2. `stepControl.onStep` fires → UI updates with what AI did
3. In mixed mode (human + AI): brief delay (200ms) so human can see the action
4. In watch mode (all AI): configurable delay (default 500ms, adjustable with +/-)
5. Loop continues to next player

### 8.3 Watch Mode

When all players are AI (`--watch` flag or all slots assigned to AI):
- Game auto-plays with delay between steps
- `Space` toggles pause/resume
- `+`/`-` adjusts speed (range: 100ms to 2000ms, step 100ms)
- All actions and effects visible in log
- `q` quits early

The delay is implemented by making `stepControl.onStep` return a Promise (or using a timer between steps). Since the loop is now async, a simple `await sleep(watchSpeed)` after each step works.

### 8.4 Target Selection Detail

Actions with targets (example from `multi-token-game.json`):
```json
{
  "id": "marchWarrior",
  "targets": [{
    "id": "unit",
    "kind": "token",
    "selector": { "zone": "barracks", "tokenType": "warrior", "count": 1 }
  }],
  "effects": [{
    "kind": "move",
    "target": { "kind": "token", "id": "unit" },
    "toZone": "field"
  }]
}
```

Target resolution flow:
1. Call `resolveSelector({ zone: "barracks", tokenType: "warrior", count: 1 }, state, context)` from `src/game-kernel/selectors.js`
2. Returns array of matching token IDs (e.g., `["t1", "t2"]`)
3. Display as selectable list: `t1 (warrior in barracks)`, `t2 (warrior in barracks)`
4. User picks one → binding `{ unit: "t1" }` assembled
5. If multiple targets in action, resolve sequentially

---

## 9. Display Details

### 9.1 Board Panel — Zones & Tokens

**Global zones**: Show zone name + all tokens:
```
[barracks] warrior: t1 t2
[field]    warrior: t3
[tower]    archer:  t4
```

**Per-player zones** (`scope: "per_player"`): Group by owner:
```
[hand]
  Player 1: card:t5 card:t6
  Player 2: card:t7
```

**Empty zones**: `[graveyard] (empty)`

**Spatial zones** (zones with `spatial.nodes`): Show tokens at their node positions:
```
[board]
  village: warrior:t1
  forest:  (empty)
  castle:  archer:t2
```

### 9.2 Token Badges

Each token displays: `id:type` (e.g., `t1:warrior`)

Color-coded by token type:
- First type: cyan
- Second type: yellow
- Third type: magenta
- Fourth type: green
- Additional: red, blue, white (cycling)

Token attributes shown on hover or in detail mode if they have non-default values.

### 9.3 State Panel — Variables

```
Global:
  turnCount = 2
  energy = 5

Player 1 (Human):
  score = 3
  health = 10

Player 2 (AI Random):
  score = 1
  health = 8
```

Color player headers with distinct player colors (green, red, blue, yellow, cyan, magenta).

### 9.4 Effect Log

Scrollable list, newest entries at bottom. Each entry:
```
[T{turn}] P{playerId}: {actionId} → {formatted effects}
```

Examples:
```
[T1] P1: deployWarrior → spawn warrior in barracks, turnCount +1
[T1] P2: marchWarrior → move t1 to field
[T2] P1: deployArcher → spawn archer in tower, turnCount +1
[T2] trigger: start_turn → score +1
```

Effect formatting rules:
| Effect kind | Format |
|-------------|--------|
| `set` | `{var} = {value}` |
| `inc` | `{var} +{amount}` |
| `dec` | `{var} -{amount}` |
| `spawn` | `spawn {type} in {zone}` |
| `move` | `move {tokenId} to {zone}` |
| `destroy` | `destroy {tokenId}` |
| `reveal` | `reveal {tokenId}` |
| `hide` | `hide {tokenId}` |
| `shuffle` | `shuffle {zone}` |
| `conditional` | `if {met}: {N} effects` |
| `repeat` | `repeat ×{count}: {N} effects` |
| `rng_choose` | `random: chose option {N}` |

### 9.5 Visibility

Zones with `visibility: "private"`:
- Current human player sees their own tokens normally
- Opponent tokens shown as `[hidden]` (dimmed text)
- In watch mode (spectator): all tokens visible

### 9.6 Game Over Screen

```
╔══════════════════════════════════╗
║         GAME OVER                ║
║                                  ║
║  Player 1 (Human): WIN           ║
║  Player 2 (AI Random): LOSE      ║
║                                  ║
║  Final Scores:                   ║
║    Player 1: 10                  ║
║    Player 2: 7                   ║
║                                  ║
║  Ended: turn 15, condition met   ║
║                                  ║
║  [q] quit  [r] replay            ║
╚══════════════════════════════════╝
```

---

## 10. Setup Screen

Before the game starts, display player slots and let user assign each:

```
╔══════════════════════════════════╗
║  GAME: multi-token-game          ║
║  Players: 2                      ║
║                                  ║
║  Player 1: > Human               ║
║              AI (Random)          ║
║              AI (Greedy)          ║
║                                  ║
║  Player 2:   Human               ║
║            > AI (Random)          ║
║              AI (Greedy)          ║
║                                  ║
║  [j/k] navigate [Enter] select   ║
║  [Tab] next player               ║
║  [s] start game                  ║
╚══════════════════════════════════╝
```

If `--player` CLI args provided, pre-fill and skip to game. If `--watch`, assign all as AI Random and skip.

---

## 11. File Structure

```
src/tui/
  ludoforge-play.js           # CLI entry (#!/usr/bin/env node)
  app.jsx                     # Root <App> component
  human-agent.js              # Promise-based agent (plain JS, no JSX)
  components/
    game-setup-screen.jsx     # Player assignment screen
    game-screen.jsx           # Main 2×2 flexbox layout
    turn-header.jsx           # Turn/round/phase/active player bar
    board-panel.jsx           # Zone + token rendering
    zone-display.jsx          # Single zone component
    token-badge.jsx           # Single token (colored)
    state-panel.jsx           # Global + per-player variable tables
    action-panel.jsx          # Wrapper: action list or AI display
    action-list.jsx           # Selectable action list (cursor)
    target-list.jsx           # Target candidate picker
    effect-log.jsx            # Scrollable log panel
    game-over-screen.jsx      # Outcome + scores display
  hooks/
    use-game-loop.js          # Orchestrates runSimulation + onStep + human agent
    use-scroll.js             # Log scroll state management
  state/
    app-reducer.js            # useReducer for app-wide state
  utils/
    format-effect.js          # Effect → human-readable string
    format-action.js          # Action → display label with costs/targets
    color-scheme.js           # Token type + player color assignments
    load-definition.js        # JSON file load + Ajv schema validation
scripts/
  build-tui.js                # esbuild: transpile src/tui/**/*.jsx → dist/tui/
```

---

## 12. Dependencies

```json
{
  "dependencies": {
    "ink": "^5.1.0",
    "react": "^18.3.0",
    "ink-select-input": "^6.0.0"
  },
  "devDependencies": {
    "esbuild": "^0.24.0"
  }
}
```

### Build Setup

`scripts/build-tui.js`:
```js
import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/tui/ludoforge-play.js'],
  outdir: 'dist/tui',
  bundle: false,          // Transpile only, don't bundle
  format: 'esm',
  platform: 'node',
  target: 'node20',
  jsx: 'automatic',
  jsxImportSource: 'react',
  loader: { '.jsx': 'jsx', '.js': 'js' },
  packages: 'external',  // Leave all imports as-is
});
```

### package.json Scripts

```json
{
  "scripts": {
    "build:tui": "node scripts/build-tui.js",
    "play": "npm run build:tui && node dist/tui/ludoforge-play.js"
  },
  "bin": {
    "ludoforge-play": "./dist/tui/ludoforge-play.js"
  }
}
```

---

## 13. State Management

Single `useReducer` at the `<App>` level:

```js
const initialAppState = {
  screen: 'setup',            // 'setup' | 'playing' | 'gameover'
  definition: null,           // GameDefinition
  gameState: null,            // GameState snapshot from latest step
  playerAssignments: [],      // [{ playerId, type: 'human'|'random'|'greedy' }]
  legalActions: [],           // Current legal actions (human turn)
  selectedActionIndex: 0,     // Cursor position in action list
  targetOptions: null,        // { action, candidates[] } when picking targets
  selectedTargetIndex: 0,     // Cursor position in target list
  effectLog: [],              // [{ turn, playerId, message }]
  outcome: null,              // Termination result
  watchSpeed: 500,            // ms delay between AI steps
  isPaused: false,            // Watch mode pause state
};
```

Actions dispatched:
- `SET_DEFINITION`, `ASSIGN_PLAYER`, `START_GAME`
- `UPDATE_GAME_STATE` (from `onStep` callback)
- `SET_LEGAL_ACTIONS` (from human agent's `onActionNeeded`)
- `MOVE_CURSOR`, `CONFIRM_ACTION`, `CONFIRM_TARGET`, `CANCEL_TARGET`
- `APPEND_LOG` (formatted effect entries)
- `SET_OUTCOME` (game over)
- `TOGGLE_PAUSE`, `ADJUST_SPEED` (watch mode)

---

## 14. Implementation Phases

### Phase 1: Async Refactoring (prerequisite, core engine)

Make the simulation loop async so human agents can return Promises. Changes span:
- `agent-action.js`: async `selectAndValidateAction`
- `loop.js`: async `runSimulationLoop`, `runSimulation`, `runRollout`
- `simultaneous-loop.js`: async `runSimultaneousLoop`
- `batch.js`: async `runBatchSimulations`
- Type declarations: `index.d.ts`, `rollout.d.ts` → `Promise<>` return types
- All callers: add `await` (evolution pipeline, metrics, CLI, all tests)

**Verification**: All existing tests (`test:unit`, `test:integration`, `test:e2e`) must pass unchanged (except for adding `await`).

### Phase 2: TUI Foundation

- Add npm dependencies
- Create `scripts/build-tui.js` (esbuild)
- Create `src/tui/ludoforge-play.js` (CLI entry)
- Create `src/tui/human-agent.js`

### Phase 3: Core UI

- `app.jsx` with `useReducer`
- `game-setup-screen.jsx`
- `game-screen.jsx` (layout)
- `turn-header.jsx`

### Phase 4: Interaction

- `action-list.jsx` with cursor navigation
- `target-list.jsx` with selector resolution
- `use-game-loop.js` hook (orchestrates `runSimulation` + human agent + `onStep`)

### Phase 5: Display

- `board-panel.jsx`, `zone-display.jsx`, `token-badge.jsx`
- `state-panel.jsx`
- `effect-log.jsx` (scrollable)
- `game-over-screen.jsx`

### Phase 6: Polish

- Watch mode (pause/resume, speed control)
- Private zone visibility
- Color scheme
- Effect/action formatters

### Phase 7: Testing

- Verify all existing tests pass after async refactoring
- Unit tests for `human-agent.js`, formatters, `app-reducer.js`
- Manual testing with: `multi-token-game.json`, `multi-phase-game.json`, `choice-game.json`

---

## 15. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game loop | Refactor existing loop to async | Maximal code reuse; one path for evolution + TUI |
| TUI library | Ink (React for CLI) | ESM-native, flexbox, rich ecosystem, battle-tested |
| JSX transpilation | esbuild → dist/tui/ | Fast, minimal config, only TUI files affected |
| State management | React useReducer | Sufficient for single-process TUI |
| Real-time updates | stepControl.onStep | Already exists in simulation engine |
| Target resolution | Existing resolveSelector | Reuse kernel function directly |
| Watch mode delay | await sleep() in async loop | Clean with async architecture |
| Visibility | Client-side filtering | Single-machine play, no network security needed |

---

## 16. Open Questions / Future Extensions

- **Replay mode**: Load a trajectory JSON and replay step-by-step (read-only). Feasible since trajectories already contain full state snapshots per step.
- **Game definition browser**: Browse `test/e2e/fixtures/` and pick a game to play.
- **Custom AI**: Let users provide a JS file with a custom `selectAction` function.
- **Simultaneous scheduler UX**: How to handle human input when all players act simultaneously. Initial approach: human picks first, then AI players resolve.
