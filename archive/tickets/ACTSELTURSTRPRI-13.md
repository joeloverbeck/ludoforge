# ACTSELTURSTRPRI-13: Fix existing TypeScript types for `Effect` union

**Status**: Done

## What

The `Effect` type in `src/dsl/types.ts` is missing three effect kinds that already exist in the JSON Schema and are implemented in the game kernel: `move_spatial`, `repeat`, and `set_flag`. Add them to the `Effect` union type so `tsc` type-checks all code paths correctly. This is prerequisite cleanup for later tickets that add new effect kinds.

### Assumptions (reassessed)

- The schema currently defines **12** effect kinds (not 11): `set`, `inc`, `dec`, `move`, `spawn`, `destroy`, `reveal`, `hide`, `move_spatial`, `repeat`, `conditional`, `set_flag`.
- `set_flag` in the schema and kernel does **not** have a `value` field; it sets a named flag with an optional `duration`.
- `set_flag.duration` currently supports `"action" | "phase" | "turn" | "round"` (no `"game"`).

## Files to touch

- `src/dsl/types.ts` — add `move_spatial`, `repeat`, and `set_flag` variants to the `Effect` union type (matching schema/kernel):
  - `{ kind: "move_spatial"; target: Ref; zone: string; toNode: string }`
  - `{ kind: "repeat"; effects: Effect[]; count: number }`
  - `{ kind: "set_flag"; target: Ref; flag: string; duration?: "action" | "phase" | "turn" | "round" }`
- `test/unit/dsl/types.test.ts` — add minimal type coverage for the new effect variants.

## Out of scope

- Adding new effect kinds (conditional, choose, set_turn_order, shuffle)
- Changing runtime effect application code
- Schema changes
- `.d.ts` files for individual modules (only the shared types file)

## Acceptance criteria

- Test: `tsc -p tsconfig.json` passes with no new errors
- Invariant: All 12 effect kinds from the JSON Schema are represented in the TypeScript `Effect` union
- Invariant: No existing tests break
- Invariant: `npm run test:unit` passes

## Dependencies

None

## Outcome

- Updated the `Effect` union to include `move_spatial`, `repeat`, and `set_flag`, matching the current schema/kernel shapes.
- Added type coverage in `test/unit/dsl/types.test.ts` for the new effect variants.
- Corrected ticket assumptions about effect count and `set_flag` fields before implementation.
- Documented `set_flag` duration support for `"round"` in the simulation architecture reference.
