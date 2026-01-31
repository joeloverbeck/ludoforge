# TUIGAMPLA-04: Human agent + load-definition utility + unit tests

**Status:** TODO
**Risk:** LOW
**Dependencies:** TUIGAMPLA-01
**Blocks:** TUIGAMPLA-08, TUIGAMPLA-09

---

## What

Create the human agent adapter (Promise-based `selectAction` that waits for TUI input) and a utility to load + validate game definition JSON files.

## Files to Touch

- `src/tui/human-agent.js` — `createHumanAgent({ playerId, onActionNeeded })` returning agent with Promise-based `selectAction`
- `src/tui/utils/load-definition.js` — read JSON file, validate with Ajv against `schemas/dsl/game-definition.v1.json`, return definition or throw
- `test/unit/tui/human-agent.test.mjs`
- `test/unit/tui/load-definition.test.mjs`

## Out of Scope

JSX components, Ink rendering, simulation loop, game-kernel, color scheme, formatters.

## Acceptance Criteria

- `createHumanAgent().selectAction()` returns a Promise.
- The Promise resolves when `onActionNeeded` callback resolves.
- `onActionNeeded` receives `{ legalActions, context, definition, state }`.
- `loadDefinition()` returns valid definition from well-formed JSON.
- `loadDefinition()` throws descriptive error for invalid JSON or schema violations.
- `loadDefinition()` throws for missing file.
- Unit tests pass: `node --test test/unit/tui/human-agent.test.mjs`.
- Unit tests pass: `node --test test/unit/tui/load-definition.test.mjs`.
- `tsc -p tsconfig.json` passes.
