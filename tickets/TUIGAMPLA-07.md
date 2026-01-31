# TUIGAMPLA-07: Board panel + zone display + token badge + effect log

**Status:** TODO
**Risk:** LOW
**Dependencies:** TUIGAMPLA-05, TUIGAMPLA-06
**Blocks:** TUIGAMPLA-09

---

## What

Create the board visualization components (zones, tokens) and the scrollable effect log panel.

## Files to Touch

- `src/tui/components/board-panel.jsx` — zones + tokens container
- `src/tui/components/zone-display.jsx` — single zone (global, per-player, spatial, empty variants)
- `src/tui/components/token-badge.jsx` — color-coded token display (`id:type`)
- `src/tui/components/effect-log.jsx` — scrollable log (PgUp/PgDn), newest at bottom
- `src/tui/hooks/use-scroll.js` — scroll state management for effect log

## Out of Scope

Action panel, target selection, human-agent interaction, game-over screen, simulation loop.

## Acceptance Criteria

- `npm run build:tui` succeeds.
- Global zones display: `[zoneName] type: t1 t2`.
- Per-player zones display grouped by owner.
- Spatial zones display tokens at node positions.
- Empty zones display: `[zoneName] (empty)`.
- Token badges colored by type (cycling through color scheme).
- Effect log renders formatted effect entries.
- PgUp/PgDn scrolls the log.
- Zones with `visibility: "private"` show `[hidden]` for opponent tokens (spectator sees all).
- Manual verification with multi-token-game, multi-phase-game definitions.
