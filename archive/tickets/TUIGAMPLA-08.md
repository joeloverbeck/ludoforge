# TUIGAMPLA-08: Action panel + action list + param picker

**Status:** DONE
**Risk:** HIGH
**Dependencies:** TUIGAMPLA-04, TUIGAMPLA-05, TUIGAMPLA-06
**Blocks:** TUIGAMPLA-09

---

## What

Create the interactive action selection UI: a cursor-navigable list of legal actions for human players, a param picker for actions requiring params, and a passive display for AI turns.

## Files to Touch

- `src/tui/components/action-panel.jsx` — wrapper: shows ActionList (human turn) or AIActionDisplay (AI turn)
- `src/tui/components/action-list.jsx` — cursor-selectable list of legal actions (j/k/Enter)
- `src/tui/components/target-list.jsx` — param candidate picker with Escape to go back; uses `resolveParamDomains()` from `src/game-kernel/selectors.js` to get candidates per param
- `src/tui/components/game-screen.jsx` — replace action panel placeholder with `<ActionPanel>`

## Assumption Corrections (vs original draft)

- **`targets` → `params`**: The DSL defines action parameters via `action.params` (not `targets`). Each param has `{ id, kind, domain }` where kind is `token | player | zone`.
- **`resolveSelector()` → `resolveParamDomains()`**: Target resolution uses `resolveParamDomains(params, state, context)` which internally calls `resolveSelector()` for token params, `resolvePlayerSelector()` for player params, and reads `domain.values` for zone params.
- **`bindings` → `{ actionId, args }`**: The simulation engine (`selectAndValidateAction` in `agent-action.js`) expects the human agent to return `{ actionId, args }` where `args` maps param IDs to selected values.
- **Candidate display**: Token params show `tokenId (type in zone)`, player params show `playerId`, zone params show zone name.

## Out of Scope

Board panel, state panel, effect log, game-over screen, the simulation loop hook itself.

## Acceptance Criteria

- `npm run build:tui` succeeds.
- Action list renders legal actions with formatted labels (via `formatAction()`).
- j/k (and arrow keys) navigate cursor.
- Enter selects action.
- If action has params: target list appears with candidates from `resolveParamDomains()`.
- Candidates show: `tokenId (type in zone)` for token params, `playerId` for player params, zone name for zone params.
- Escape from target list returns to action list.
- Multiple params resolved sequentially (one picker per param).
- Confirming final param assembles `{ actionId, args }` and resolves the human agent Promise.
- AI turn: displays what AI chose (brief, non-interactive).

## Outcome

### Originally Planned
- Create three files: `action-panel.jsx`, `action-list.jsx`, `target-list.jsx`
- Wire them into the game screen replacing the placeholder
- Use `resolveSelector()` for target candidates and assemble `bindings` map

### What Actually Changed
- **Ticket corrected first**: The original ticket assumed `targets`/`resolveSelector()`/`bindings` terminology. The actual DSL uses `params`/`resolveParamDomains()`/`{ actionId, args }`. Ticket updated with an "Assumption Corrections" section before implementation.
- **Created 3 new files**: `action-panel.jsx` (wrapper), `action-list.jsx` (cursor list with j/k/Enter), `target-list.jsx` (param candidate picker with Escape)
- **Modified 1 file**: `game-screen.jsx` — replaced placeholder `<Box>` with `<ActionPanel>`, added new props for action/target state and callbacks
- **Created 1 test file**: `test/unit/tui/action-panel-build.test.mjs` — 9 build-integration tests verifying bundle contents
- **All 1667 unit tests pass**, including the new ones
