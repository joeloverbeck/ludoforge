# PLACHOISS-01: Rename `choose` effect kind to `rng_choose`

**Status:** COMPLETED
**Dependencies:** None
**Blocks:** PLACHOISS-03

---

## What

Pure rename of effect kind string `"choose"` to `"rng_choose"` everywhere. No behavioral change.

## Files to Touch

Source files:
- `schemas/dsl/game-definition.v1.json` — effect kind const
- `src/dsl/types.ts` — Effect type union
- `src/game-kernel/effect-application.js` — dispatch on kind
- `src/game-kernel/control-flow-effects.js` — returned kind in result
- `src/evolutionary-engine/mutation/operators/choose-effect-insert.js` — emitted kind

Test files:
- `test/unit/game-kernel/choose-effect.test.mjs`
- `test/unit/dsl/schema.test.mjs`
- `test/unit/evolutionary-engine/mutation.test.mjs`
- `test/integration/game-kernel-effects.test.mjs`

Documentation (also needs updating — missed in original ticket):
- `docs/architecture/simulation-engine.md` — references `choose` effect kind
- `docs/architecture/evolutionary-engine.md` — references `choose` effect kind

### Assumption corrections vs original ticket

1. `configs/evolution-operators.json` references operator *name* `"choose-effect-insert"`, not the effect *kind* string. No change needed — operator naming is independent of the DSL kind value.
2. `src/evolutionary-engine/mutation/orchestrator.js` imports the operator module by filename, not by kind string. No change needed.
3. `docs/architecture/simulation-engine.md` and `docs/architecture/evolutionary-engine.md` were not listed but contain `choose` effect kind references that must be updated for consistency.

## Out of Scope

No changes to targets/params. No behavioral changes to the RNG branching logic.

## Acceptance Criteria

- Schema rejects `{ "kind": "choose" }`, accepts `{ "kind": "rng_choose" }`.
- All existing choose-effect tests pass with new name.
- RNG-based branching behavior unchanged. Determinism preserved with seeded RNG.
- `npm run test:unit` and `npm run test:integration` pass.
- `tsc -p tsconfig.json` passes.

## Outcome

**What changed vs originally planned:**

The original ticket was accurate in scope. Three assumption corrections were made:
1. `configs/evolution-operators.json` and `orchestrator.js` did **not** need changes (operator name vs effect kind distinction).
2. Two architecture docs (`simulation-engine.md`, `evolutionary-engine.md`) **did** need updates — not originally listed.

**Actual changes:**
- 5 source files: replaced `"choose"` with `"rng_choose"` in schema const, TS type, effect dispatch, result kind, and mutation operator emitted kind.
- 4 test files: updated all `"choose"` effect kind references to `"rng_choose"`.
- 1 new test: `"rejects legacy choose effect kind"` in `schema.test.mjs` — confirms the schema now rejects the old kind string.
- 2 doc files: updated effect kind references and corrected misleading "player choice" label to "RNG branching".

All 1431 unit tests, 183 integration tests, and `tsc` type check pass.
