# ACTSELTURSTRPRI-22: Add multi-hop `move_spatial` and directional edges (Wave 3)

## What

Extend the `move_spatial` effect to support multi-hop movement (moving more than one edge at a time) and directional edge constraints.

1. **Multi-hop**: Add optional `distance` parameter to `move_spatial`. When set, the token moves `distance` hops along the spatial graph (not just to an adjacent node). Schema: `{ kind: "move_spatial", target: Ref, toNode?: string, distance?: number }`.

2. **Directional edges**: Add optional `direction` field to spatial zone edge definitions. Schema: edge gains `direction?: "forward" | "backward" | "both"` (default: `"both"`). `move_spatial` respects edge direction.

These enable rondel mechanics (circular track with forward-only, variable-distance movement).

## Files to touch

- `schemas/dsl/game-definition.v1.json` — extend `move_spatial` effect with `distance`; extend spatial zone edge with `direction`
- `src/dsl/types.ts` — mirror schema changes
- `src/game-kernel/effect-application.js` — extend `move_spatial` handler for multi-hop pathfinding
- `src/game-kernel/spatial.js` (or wherever spatial logic lives) — add BFS/DFS pathfinding for multi-hop, direction filtering

## Out of scope

- Cost-per-hop calculations (model via variable effects)
- Node-dependent actions (model via conditional effects)
- Non-spatial movement

## Acceptance criteria

- Test: `move_spatial` with `distance: 1` works as before (single hop)
- Test: `move_spatial` with `distance: 3` moves token 3 hops along shortest path
- Test: Forward-only edges prevent backward movement
- Test: Circular topology wraps correctly (last node → first node)
- Test: Multi-hop on a graph with no valid path of that distance fails gracefully
- Test: Bidirectional edges (default) work as before
- Invariant: Token is on exactly one node after move
- Invariant: Schema validates extended `move_spatial` effects
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (extends existing spatial system)
