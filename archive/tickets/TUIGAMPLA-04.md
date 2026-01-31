# TUIGAMPLA-04: Human agent + load-definition utility + unit tests

**Status:** DONE
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
- `onActionNeeded` receives the full agent arguments `{ legalActions, context, definition, state, rng }` (matching the `selectAction` interface in `agent-action.js`).
- `loadDefinition()` returns valid definition from well-formed JSON.
- `loadDefinition()` throws descriptive error for invalid JSON or schema violations.
- `loadDefinition()` throws for missing file.
- Unit tests pass: `node --test test/unit/tui/human-agent.test.mjs`.
- Unit tests pass: `node --test test/unit/tui/load-definition.test.mjs`.
- `tsc -p tsconfig.json` passes.

## Outcome

### Ticket assumption fix

The original ticket stated `onActionNeeded` receives `{ legalActions, context, definition, state }`. The actual `selectAction` interface in `agent-action.js` passes `{ definition, state, legalActions, context, rng }`. The ticket was corrected to reflect the full argument set including `rng`.

### What was implemented (matches plan)

**Source files created:**
- `src/tui/human-agent.js` — `createHumanAgent({ playerId, onActionNeeded })` with Promise-based `selectAction` that delegates to `onActionNeeded`. Includes input validation (throws if `onActionNeeded` is not a function).
- `src/tui/utils/load-definition.js` — async `loadDefinition(filePath)` that reads a JSON file, validates via the existing `validateGameDefinition` from `src/dsl/validate.js`, and returns the parsed definition or throws descriptive errors for missing files, invalid JSON, and schema violations.

**Test files created:**
- `test/unit/tui/human-agent.test.mjs` — 9 tests covering: id assignment, selectAction returns Promise, argument forwarding, rejection propagation, sync thenable support, numeric playerId, and invalid-input guard.
- `test/unit/tui/load-definition.test.mjs` — 7 tests covering: valid fixture loading, missing file error, invalid JSON error, schema validation error, non-string filePath guard, empty-string guard, and structural correctness of returned definition.

### Verification
- 16/16 new tests pass
- 1533/1533 unit tests pass (full suite)
- `tsc -p tsconfig.json` clean

### Deviation from plan
- `loadDefinition` reuses the existing `validateGameDefinition` from `src/dsl/validate.js` instead of creating a separate Ajv instance. This avoids duplicating schema compilation and follows the project's composition-over-classes convention.
- `loadDefinition` is async (uses `fs/promises.readFile`) rather than sync, which is more appropriate for a TUI utility that should not block the event loop.
