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
│       ├── Board placeholder (future: TUIGAMPLA-07+)
│       ├── <StatePanel>     src/tui/components/state-panel.jsx
│       ├── Action placeholder (future: TUIGAMPLA-07+)
│       └── Effect Log placeholder (future: TUIGAMPLA-07+)
│
└── screen: "gameover"
    └── inline Box (outcome display + quit prompt)
```

### App (`app.jsx`)

Root component. Owns the `useReducer` and screen switching logic.

Initialization sequence:
1. `SET_DEFINITION` — stores the loaded definition.
2. `INIT_PLAYER_ASSIGNMENTS` — creates slots from `definition.players.count`.
3. CLI `--player` flags applied via `ASSIGN_PLAYER` dispatches.
4. If `--watch`, `START_GAME` is dispatched to skip setup.

### GameSetupScreen (`game-setup-screen.jsx`)

Interactive player assignment screen. Each player slot can be set to Human,
AI (Random), or AI (Greedy).

Keyboard controls:
- `j` / `k` / arrow keys — cycle player type within active slot
- `Tab` / `Shift+Tab` — switch between player slots
- `s` — start the game

### GameScreen (`game-screen.jsx`)

2x2 flexbox layout shell for the playing screen:
- Top row: `<TurnHeader>` (full width)
- Middle row: Board placeholder (left) + `<StatePanel>` (right)
- Bottom row: Action placeholder (left) + Effect Log placeholder (right)

Board, action panel, and effect log are placeholders for future tickets.

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
├── state/
│   └── app-reducer.js          Pure reducer + initial state
├── components/
│   ├── game-setup-screen.jsx   Player assignment screen
│   ├── game-screen.jsx         Playing screen layout shell
│   ├── turn-header.jsx         Turn/round/phase/player display
│   └── state-panel.jsx         Variable tables
├── utils/
│   ├── load-definition.js      File loading + DSL validation
│   └── color-scheme.js         Color assignment utilities
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
    Player assignments              Turn loop                     Outcome display
    j/k, Tab, s                     (future tickets)              q to quit
```

## Future Work

Placeholder components in `<GameScreen>` will be implemented by subsequent tickets:
- **Board panel** — zone/token visualization
- **Action panel** — action selection with cursor navigation
- **Effect log** — scrollable turn-by-turn effect history
- **Watch mode loop** — automated AI step execution with speed/pause controls
