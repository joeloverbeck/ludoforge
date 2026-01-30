# ACTSELTURSTRPRI-13: Fix existing TypeScript types for `Effect` union

## What

The `Effect` type in `src/dsl/types.ts` is missing three effect kinds that exist in the JSON Schema and are implemented in the game kernel: `move_spatial`, `repeat`, and `set_flag`. Add them to the `Effect` union type so `tsc` type-checks all code paths correctly. This is prerequisite cleanup for all later tickets that add new effect kinds.

## Files to touch

- `src/dsl/types.ts` — add `move_spatial`, `repeat`, and `set_flag` variants to the `Effect` union type:
  - `{ kind: "move_spatial"; target: Ref; toNode: string }`
  - `{ kind: "repeat"; effects: Effect[]; count: number }`
  - `{ kind: "set_flag"; target: Ref; flag: string; value: boolean; duration?: "phase" | "turn" | "round" | "game" }`

## Out of scope

- Adding new effect kinds (conditional, choose, set_turn_order, shuffle)
- Changing runtime effect application code
- Schema changes
- `.d.ts` files for individual modules (only the shared types file)

## Acceptance criteria

- Test: `tsc -p tsconfig.json` passes with no new errors
- Invariant: All 11 effect kinds from the JSON Schema are represented in the TypeScript `Effect` union
- Invariant: No existing tests break
- Invariant: `npm run test:unit` passes

## Dependencies

None
