# TUIGAMPLA-08: Action panel + action list + target list

**Status:** TODO
**Risk:** HIGH
**Dependencies:** TUIGAMPLA-04, TUIGAMPLA-05, TUIGAMPLA-06
**Blocks:** TUIGAMPLA-09

---

## What

Create the interactive action selection UI: a cursor-navigable list of legal actions for human players, a target picker for actions requiring targets, and a passive display for AI turns.

## Files to Touch

- `src/tui/components/action-panel.jsx` — wrapper: shows ActionList (human turn) or AIActionDisplay (AI turn)
- `src/tui/components/action-list.jsx` — cursor-selectable list of legal actions (j/k/Enter)
- `src/tui/components/target-list.jsx` — target candidate picker with Escape to go back; calls `resolveSelector()` from `src/game-kernel/selectors.js` to get candidates

## Out of Scope

Board panel, state panel, effect log, game-over screen, the simulation loop hook itself.

## Acceptance Criteria

- `npm run build:tui` succeeds.
- Action list renders legal actions with formatted labels.
- j/k (and arrow keys) navigate cursor.
- Enter selects action.
- If action has targets: target list appears with candidates from `resolveSelector()`.
- Target candidates show: `tokenId (type in zone)` for tokens, `playerId` for players.
- Escape from target list returns to action list.
- Multiple targets resolved sequentially.
- Confirming final target assembles `bindings` map and resolves the human agent Promise.
- AI turn: displays what AI chose (brief, non-interactive).
