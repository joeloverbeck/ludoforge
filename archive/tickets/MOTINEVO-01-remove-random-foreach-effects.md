# MOTINEVO-01: Remove random/foreach Effect kinds from DSL schema

**Status: COMPLETED**

## Description
Remove the `kind: "random"` and `kind: "foreach"` entries from `$defs.Effect.oneOf` in the game-definition JSON Schema. These effect kinds are being retired in favour of the new trace-based architecture where effects are deterministic and fully replayable. Removing them from the schema first ensures no new game definitions can use these kinds, while downstream code cleanup follows in later tickets.

## Files to Touch
- `schemas/dsl/game-definition.v1.json`

## Out of Scope
- TypeScript types (`src/dsl/types.ts`) — handled in MOTINEVO-02
- Mutation operator code — handled in MOTINEVO-03
- Engine code (`src/game-kernel/`, `src/simulation-engine/`)
- Test fixtures (update only if they contain random/foreach effects)

## Acceptance Criteria

### Tests That Must Pass
- Ajv rejects an effect with `kind: "random"` against the updated schema
- Ajv rejects an effect with `kind: "foreach"` against the updated schema
- All existing test fixtures that use only valid effect kinds still validate successfully
- `npm run test:unit` passes

### Invariants That Must Remain True
- All other Effect kinds (`inc`, `dec`, `set`, `move`, `spawn`, `destroy`, `reveal`, `hide`) remain valid
- The `$defs.Effect.oneOf` array still contains all non-removed effect schemas
- No other `$defs` entries are modified

### Assumption Corrections
- Original ticket listed `transfer` as a valid effect kind in the invariants section. The schema has never contained a `transfer` kind; the actual valid kinds are: `set`, `inc`, `dec`, `move`, `spawn`, `destroy`, `reveal`, `hide`. Corrected above.

## Dependencies
- Depends on: none
- Blocks: MOTINEVO-02, MOTINEVO-03

## Outcome

### What was changed
1. **`schemas/dsl/game-definition.v1.json`** — Removed the two `oneOf` entries for `kind: "random"` and `kind: "foreach"` from `$defs.Effect.oneOf`. No other schema entries were modified.

2. **`test/unit/dsl/schema.test.mjs`** — Added 10 new tests:
   - Rejection test for `kind: "random"` effects
   - Rejection test for `kind: "foreach"` effects
   - 8 parametric acceptance tests confirming each remaining valid effect kind (`set`, `inc`, `dec`, `move`, `spawn`, `destroy`, `reveal`, `hide`) still validates

### What was not changed (vs originally planned)
- No test fixtures needed updating — none contained `random` or `foreach` effects.
- No code changes outside the schema and test files.

### Verification
- `npm run test:unit`: 339 tests, 0 failures (including `tsc --noEmit` type check)
