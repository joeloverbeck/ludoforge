# TUI Game Player

## Purpose

The TUI (Terminal User Interface) module provides an interactive terminal application
for playing and watching LudoForge game definitions. It renders game state, player
assignments, and turn progression using React components via Ink (React for CLIs).

## Entry Points

- `src/tui/ludoforge-play.js` — CLI entrypoint. Parses arguments, loads and validates
  the game definition, then renders the root `<App>` component via Ink.
- `scripts/build-tui.js` — esbuild script producing a single bundled executable at
  `dist/tui/ludoforge-play.js`.

## CLI Arguments

Parsed by `parsePlayArgs(process.argv)` in `src/tui/parse-play-args.js`.

| Argument | Description |
|---|---|
| `<game.json>` | Path to a GameDefinition JSON file (required) |
| `--watch` | All-AI watch mode (skip setup, start immediately) |
| `--speed <ms>` | AI step delay in watch mode (default: 500) |
| `--seed <n>` | RNG seed for reproducibility |
| `--player <n>=<type>` | Pre-assign a player slot (`human`, `random`, `greedy`) |
| `--help`, `-h` | Show usage and exit |

The entrypoint uses **lazy dynamic imports** (`await import(...)`) for React, Ink,
and the DSL validator. These heavy dependencies are only loaded after early-exit
checks (`--help`, missing arguments) pass, keeping the help path fast.

## Build

`scripts/build-tui.js` bundles the TUI into a single ESM file:

```js
esbuild.build({
  entryPoints: ["src/tui/ludoforge-play.js"],
  outfile: "dist/tui/ludoforge-play.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  jsx: "automatic",
  jsxImportSource: "react",
  packages: "external",   // node_modules stay external (react, ink, ajv, etc.)
  banner: { js: "#!/usr/bin/env node" },
});
```

Key decisions:

- **`bundle: true`** resolves all local `src/` imports at build time. This is
  required because TUI source files import from other modules (e.g.,
  `src/dsl/validate.js`) that are not copied to `dist/`.
- **`packages: "external"`** keeps `node_modules` dependencies external so the
  bundle stays small and uses the project's installed packages.
- The **shebang** is added via esbuild `banner`, not in source, to avoid duplication.

## State Management

### AppState

All UI state is managed by a single `useReducer(appReducer, initialAppState)` in
the root `<App>` component. The reducer is a pure function with no side effects.

State shape (`src/tui/state/app-reducer.js`):

| Field | Type | Description |
|---|---|---|
| `screen` | `'setup' \| 'playing' \| 'gameover'` | Current screen |
| `definition` | `GameDefinition \| null` | Loaded game definition |
| `gameState` | `object \| null` | Current simulation state |
| `playerAssignments` | `Array<{ playerId, type }>` | Player slot assignments |
| `legalActions` | `Array<object>` | Currently available actions |
| `selectedActionIndex` | `number` | Cursor position in action list |
| `targetOptions` | `{ action, candidates } \| null` | Target selection state |
| `selectedTargetIndex` | `number` | Cursor position in target list |
| `effectLog` | `Array<{ turn, playerId, message }>` | Effect history |
| `outcome` | `object \| null` | Game outcome (set on gameover) |
| `watchSpeed` | `number` | AI step delay in ms (100-2000, step 100) |
| `isPaused` | `boolean` | Watch mode pause state |

`initialAppState` is `Object.freeze()`-d to enforce immutability.

### Action Types

| Action | Payload | Effect |
|---|---|---|
| `SET_DEFINITION` | `{ definition }` | Store the game definition |
| `INIT_PLAYER_ASSIGNMENTS` | `{ count }` | Create N player slots defaulting to `random` |
| `ASSIGN_PLAYER` | `{ playerId, playerType }` | Update a single player's type |
| `START_GAME` | — | Transition screen to `playing` |
| `UPDATE_GAME_STATE` | `{ gameState }` | Store simulation state snapshot |
| `SET_LEGAL_ACTIONS` | `{ legalActions }` | Store actions and reset cursor state |
| `MOVE_CURSOR` | `{ delta }` | Move action or target cursor with wrapping |
| `CONFIRM_ACTION` | `{ targetOptions? }` | Enter target selection (or skip if no targets) |
| `CONFIRM_TARGET` | — | Clear target and action state after selection |
| `CANCEL_TARGET` | — | Return to action selection, keep action cursor |
| `APPEND_LOG` | `{ turn, playerId, message }` | Add entry to effect log |
| `SET_OUTCOME` | `{ outcome }` | Transition screen to `gameover` |
| `RESTART_GAME` | — | Reset to setup screen, preserve definition and assignments |
| `TOGGLE_PAUSE` | — | Flip `isPaused` |
| `ADJUST_SPEED` | `{ delta }` | Adjust `watchSpeed` by 100ms (clamped 100-2000) |

## Component Tree

```
<App>                        src/tui/app.jsx
├── screen: "setup"
│   └── <GameSetupScreen>    src/tui/components/game-setup-screen.jsx
│
├── screen: "playing"
│   └── <GameScreen>         src/tui/components/game-screen.jsx
│       ├── <TurnHeader>     src/tui/components/turn-header.jsx
│       ├── <WinConditionsBar> src/tui/components/win-conditions-bar.jsx
│       ├── <BoardPanel>     src/tui/components/board-panel.jsx
│       │   └── <ZoneDisplay> src/tui/components/zone-display.jsx
│       │       └── <TokenBadge> src/tui/components/token-badge.jsx
│       ├── <StatePanel>     src/tui/components/state-panel.jsx
│       ├── <ActionPanel>    src/tui/components/action-panel.jsx
│       │   ├── <ActionList>  src/tui/components/action-list.jsx
│       │   └── <TargetList>  src/tui/components/target-list.jsx
│       └── <EffectLog>      src/tui/components/effect-log.jsx
│
└── screen: "gameover"
    └── <GameOverScreen>  src/tui/components/game-over-screen.jsx
```

### App (`app.jsx`)

Root component. Owns the `useReducer`, screen switching logic, and game loop
integration via `useGameLoop`.

Initialization sequence:
1. `SET_DEFINITION` — stores the loaded definition.
2. `INIT_PLAYER_ASSIGNMENTS` — creates slots from `definition.players.count`.
3. CLI `--player` flags applied via `ASSIGN_PLAYER` dispatches.
4. If `--watch`, `START_GAME` is dispatched to skip setup.

Game loop integration:
- Calls `useGameLoop()` with state, dispatch, and a shared `legalMovesRef`.
- Receives `resolveAction` callback to complete human turns.
- Wires `GameScreen` event handlers: `onMoveCursor`, `onConfirmAction`,
  `onConfirmTarget`, `onCancelTarget`.
- Multi-param target selection: tracks pending action/params/bindings via refs,
  advancing through each param's candidates sequentially before resolving.

Keyboard controls:
- `q` — quit (global on setup/playing screens; shows confirmation on gameover).
- Watch mode (all-AI, playing screen): `Space` toggles pause, `+`/`-` adjusts speed.
- Gameover screen: `q` shows quit confirmation (`y`/`n`), `r` replays (resets to setup).

### GameSetupScreen (`game-setup-screen.jsx`)

Interactive player assignment screen. Each player slot can be set to Human,
AI (Random), or AI (Greedy).

Keyboard controls:
- `j` / `k` / arrow keys — cycle player type within active slot
- `Tab` / `Shift+Tab` — switch between player slots
- `s` — start the game

### GameScreen (`game-screen.jsx`)

Flexbox layout shell for the playing screen:
- Top row: `<TurnHeader>` (full width)
- Win conditions row: `<WinConditionsBar>` (full width) — static display of win/lose/draw conditions from the game definition's termination block. Hidden when no termination conditions exist.
- Middle row: `<BoardPanel>` (left) + `<StatePanel>` (right)
- Bottom row: `<ActionPanel>` (left) + `<EffectLog>` (right)

Props: `gameState`, `definition`, `playerAssignments`, `effectLog`,
`currentPlayerId`, `isSpectator`, `isHumanTurn`, `legalActions`,
`selectedActionIndex`, `targetOptions`, `selectedTargetIndex`, `lastAIAction`,
`onMoveCursor`, `onConfirmAction`, `onConfirmTarget`, `onCancelTarget`.

### ActionPanel (`action-panel.jsx`)

Wrapper component that selects between human and AI display:
- **Human turn**: Renders `<ActionList>` (or `<TargetList>` when picking params).
- **AI turn**: Shows a passive display of the last AI action.

### ActionList (`action-list.jsx`)

Cursor-selectable list of legal actions. Uses `formatAction()` for display labels.
Keyboard: `j`/`k`/arrows to navigate, `Enter` to confirm.

### TargetList (`target-list.jsx`)

Param candidate picker. Shows candidates for a single param (token, player, or zone).
Keyboard: `j`/`k`/arrows to navigate, `Enter` to select, `Escape` to go back to
the action list.

### BoardPanel (`board-panel.jsx`)

Iterates over `definition.state.zones`, builds a token color map from token
types, and renders a `<ZoneDisplay>` for each zone. Passes zone state,
token state, color map, player assignments, and visibility context.

### ZoneDisplay (`zone-display.jsx`)

Single zone renderer with four variants:
- **Global**: Flat token list — `[zoneName] t1:type t2:type`.
- **Per-player**: Grouped by owner — each player's tokens on a separate line.
  Zones with `visibility: "private"` show `[hidden]` for non-current-player
  tokens (spectators see all).
- **Spatial**: Tokens rendered at node positions from `zone.spatial.nodes`.
- **Empty**: `[zoneName] (empty)`.

### TokenBadge (`token-badge.jsx`)

Displays a single token as `id:type` with a color prop from the token color
map. When `hidden` is true, renders dimmed `[hidden]` text instead.

### EffectLog (`effect-log.jsx`)

Scrollable effect log panel. Renders formatted log entries `[T{turn}] P{id}: {message}`.
Supports PgUp/PgDn scrolling via `useInput`. Auto-scrolls to bottom when new
entries arrive. Uses pure scroll offset functions from `src/tui/hooks/use-scroll.js`.

### WinConditionsBar (`win-conditions-bar.jsx`)

Displays win/lose/draw conditions extracted from `definition.termination`. Uses
`formatTerminationConditions()` from `src/tui/utils/format-termination.js` to
convert DSL expression trees and outcomes into human-readable strings. Conditions
are joined with ` | ` and shown with a bold "WIN:" label. Returns `null` when
there are no conditions to display. Content is static (derived from the definition,
not live game state).

### TurnHeader (`turn-header.jsx`)

Displays turn number, round, phase, and active player with color-coded text.
Shows "Waiting for game to start..." when no game state is available.

### StatePanel (`state-panel.jsx`)

Displays global and per-player variable tables. Reads variable definitions from
`definition.state.variables` and splits by `scope === "per_player"`. Values are
extracted from `gameState.variables` (global) and `gameState.playerVariables`
(per-player keyed by player ID).

## Utilities

### load-definition (`src/tui/utils/load-definition.js`)

Reads a JSON file, parses it, and validates against the DSL schema via
`validateGameDefinition` from `src/dsl/validate.js`. Throws descriptive errors
for missing files, invalid JSON, or schema failures.

### color-scheme (`src/tui/utils/color-scheme.js`)

Deterministic color assignment for players and token types:
- `playerColor(index)` — cycles through `["green", "red", "blue", "yellow", "cyan", "magenta"]`.
- `buildTokenColorMap(tokenTypes)` — maps token type IDs to colors from a fixed palette.

## File Layout

```
src/tui/
├── ludoforge-play.js           CLI entrypoint
├── app.jsx                     Root component (useReducer, screen switching)
├── parse-play-args.js          CLI argument parser
├── human-agent.js              Promise-based agent for human players
├── state/
│   └── app-reducer.js          Pure reducer + initial state
├── components/
│   ├── game-setup-screen.jsx   Player assignment screen
│   ├── game-screen.jsx         Playing screen layout shell
│   ├── turn-header.jsx         Turn/round/phase/player display
│   ├── win-conditions-bar.jsx  Static win/lose/draw conditions display
│   ├── board-panel.jsx         Zone + token rendering container
│   ├── zone-display.jsx        Single zone (global/per-player/spatial/empty)
│   ├── token-badge.jsx         Color-coded token display
│   ├── state-panel.jsx         Variable tables
│   ├── action-panel.jsx        Action selection wrapper (human/AI)
│   ├── action-list.jsx         Cursor-selectable legal action list
│   ├── target-list.jsx         Param candidate picker
│   ├── effect-log.jsx          Scrollable effect log (PgUp/PgDn)
│   └── game-over-screen.jsx   Outcome display + quit/replay controls
├── hooks/
│   ├── use-game-loop.js        Game loop orchestration hook
│   └── use-scroll.js           Scroll offset arithmetic (pure functions)
├── utils/
│   ├── load-definition.js      File loading + DSL validation
│   ├── color-scheme.js         Color assignment utilities
│   ├── format-effect.js        Effect → human-readable string
│   ├── format-action.js        Action → display label
│   └── format-termination.js   DSL termination → human-readable conditions
scripts/
└── build-tui.js                esbuild bundle script
dist/tui/
└── ludoforge-play.js           Bundled executable (build output)
```

## Dependencies

Runtime (external, resolved from `node_modules`):
- `react` (18.x) — component model
- `ink` (5.x) — React renderer for terminal UIs
- `ajv` — JSON Schema validation (via `src/dsl/validate.js`)

Build-time:
- `esbuild` — JSX transpilation and bundling

## Screen Flow

```
CLI launch
  │
  ├── --help or no args → print usage → exit 0
  ├── missing <game.json> → error → exit 1
  ├── invalid file → error → exit 1
  │
  └── valid definition loaded
        │
        ▼
    ┌─────────┐     START_GAME     ┌─────────┐     SET_OUTCOME     ┌──────────┐
    │  setup  │ ──────────────────▶│ playing │ ──────────────────▶│ gameover │
    └─────────┘                    └─────────┘                    └──────────┘
         ▲     Player assignments    Turn loop                     Outcome display
         │     j/k, Tab, s          useGameLoop hook               q→confirm, r→replay
         │                                                              │
         └──────────────────── RESTART_GAME ◀───────────────────────────┘
```

## Hooks

### use-game-loop (`src/tui/hooks/use-game-loop.js`)

Orchestrates the full game loop. Three exports:

- **`buildAgents(opts)`** — Creates agents from player assignments. Human agents
  use `createHumanAgent` with an `onActionNeeded` callback that dispatches
  `SET_LEGAL_ACTIONS` and returns a Promise resolved when the user confirms.
  AI agents wrap `selectAction` with async delay (200ms mixed mode, configurable
  watch speed for all-AI mode) and pause polling.

- **`buildOnStep(dispatch)`** — Returns an `onStep` callback for `stepControl`.
  Dispatches `UPDATE_GAME_STATE` (when step has state) and `APPEND_LOG` with
  formatted effect messages for every step.

- **`useGameLoop(opts)`** — React hook. Starts `runSimulation()` when screen
  transitions to `"playing"`. Builds agents with delay/pause wrappers, wires
  `onStep`, and dispatches `SET_OUTCOME` on completion or error. Returns
  `{ resolveAction }` for the App to complete human turns.

Key design decisions:
- Watch mode delay lives in AI agent wrappers (not in `onStep`) because
  `recordStep` fires `onStep` synchronously and does not await it.
- Pause support polls `isPausedRef` in a while loop inside the AI wrapper.
- `legalMovesRef` is shared between the hook and App: the hook writes enriched
  legal moves (action + param domains) inside `onActionNeeded`; App reads them
  to compute target candidates for multi-param selection.

### use-scroll (`src/tui/hooks/use-scroll.js`)

Pure scroll offset arithmetic for the effect log panel.

## Future Work

(No outstanding items.)
