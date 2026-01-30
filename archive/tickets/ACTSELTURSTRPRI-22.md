# ACTSELTURSTRPRI-22: Add multi-hop `move_spatial` and directional edges (Wave 3)

## Status: COMPLETED

## What

Extend the `move_spatial` effect to support multi-hop movement (moving more than one edge at a time) and directional edge constraints.

1. **Multi-hop**: Add optional `distance` parameter to `move_spatial`. When set, the token moves `distance` hops along the spatial graph (not just to an adjacent node). Schema: `{ kind: "move_spatial", target: Ref, zone: string, toNode?: string, distance?: number }`.

2. **Directional edges**: Change spatial zone edge items from `[string, string]` tuples to objects `{ from: string, to: string, direction?: "forward" | "backward" | "both" }` (default: `"both"`). `move_spatial` respects edge direction during adjacency and pathfinding checks.

These enable rondel mechanics (circular track with forward-only, variable-distance movement).

## Corrected Assumptions

- The spatial effects handler lives in `src/game-kernel/spatial-effects.js` (not `spatial.js`).
- `effect-application.js` only dispatches to `applyMoveSpatial`; the handler itself is in `spatial-effects.js`. No changes needed to effect-application.js.
- Edges are currently `[string, string][]` tuples — changing to objects is a **breaking schema change** for edge format. This is acceptable since LudoForge is a prototyping engine with no deployed production data.
- Additional files touched beyond original scope:
  - `src/evolutionary-engine/mutation/effect-helpers.js` — `buildEffectProps` for `move_spatial` (no change needed; it only reads `zone.spatial.nodes`, not edges)
  - `src/evolutionary-engine/repair/effect-repair.js` — `collectSpatialZoneNodes` reads `spatial.nodes` only (no change needed)
  - `src/evolutionary-engine/repair/id-collectors.js` — `collectSpatialZoneNodes` reads `spatial.nodes` only (no change needed)
- The `toNode` parameter becomes optional: when `distance` is provided without `toNode`, the effect moves the token `distance` hops along the graph from its current node (BFS shortest path to any reachable node at that distance). When `toNode` IS provided with `distance`, the pathfinding validates that `toNode` is reachable within `distance` hops.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — extend `move_spatial` effect with `distance`; change spatial edge items from tuples to objects with `direction`
- `src/dsl/types.ts` — mirror schema changes (edge type, move_spatial effect type)
- `src/game-kernel/spatial-effects.js` — extend `applyMoveSpatial` for multi-hop BFS pathfinding and directional edge filtering

## Out of scope

- Cost-per-hop calculations (model via variable effects)
- Node-dependent actions (model via conditional effects)
- Non-spatial movement
- Updating mutation/repair modules (they only use `spatial.nodes`, not edges)

## Acceptance criteria

- Test: `move_spatial` with `distance: 1` works as before (single hop)
- Test: `move_spatial` with `distance: 3` moves token 3 hops along shortest path
- Test: Forward-only edges prevent backward movement
- Test: Circular topology wraps correctly (last node → first node)
- Test: Multi-hop on a graph with no valid path of that distance fails gracefully
- Test: Bidirectional edges (default) work as before
- Test: Object-format edges with no `direction` field default to bidirectional
- Invariant: Token is on exactly one node after move
- Invariant: Schema validates extended `move_spatial` effects
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (extends existing spatial system)

## Outcome

### Planned vs Actual Changes

**Schema (`schemas/dsl/game-definition.v1.json`)** — As planned. Edge items changed from `[string, string]` tuples to `{ from, to, direction? }` objects. Added `distance` integer property to `move_spatial` effect.

**Types (`src/dsl/types.ts`)** — As planned, plus added a new `SpatialEdge` interface to mirror the schema edge object type. Updated `ZoneDef.spatial.edges` from `[string, string][]` to `SpatialEdge[]`. Updated `move_spatial` Effect variant with optional `toNode` and `distance`.

**Handler (`src/game-kernel/spatial-effects.js`)** — Full rewrite (justified: single-purpose file, all new logic). Added three internal helpers (`getNeighbors`, `findNodesAtDistance`, `isReachableWithin`) implementing BFS pathfinding with direction-aware edge traversal. `applyMoveSpatial` now handles three cases: adjacency check (toNode only), reachability validation (toNode + distance), and auto-destination (distance only).

**Test fixtures updated** — Three existing test files had edge fixtures updated from tuple to object format:
- `test/unit/dsl/types.test.ts`
- `test/unit/game-kernel/flags.test.mjs`
- `test/unit/game-kernel/token-effects.test.mjs`
- `test/integration/game-kernel-effects.test.mjs`

**No changes needed** (confirmed by code inspection):
- `src/game-kernel/effect-application.js` — only dispatches, no edge logic
- `src/evolutionary-engine/mutation/effect-helpers.js` — uses `spatial.nodes` only
- `src/evolutionary-engine/repair/effect-repair.js` — uses `spatial.nodes` only
- `src/evolutionary-engine/repair/id-collectors.js` — uses `spatial.nodes` only

### Test Results

All 1400 unit tests and 183 integration tests pass. 10 new tests added covering all acceptance criteria.
