# PLACHOISS-03: Add `ParamDef` to schema and types

**Status:** COMPLETED
**Dependencies:** PLACHOISS-01, PLACHOISS-02
**Blocks:** PLACHOISS-04

---

## What

Introduce `ActionDef.params` array in JSON Schema and TS types. This is an **additive** change — `targets` and `TargetDef` are **not** removed in this ticket because they are referenced by runtime code (game-kernel, selectors, semantic checks, evolutionary engine) and 8+ fixture files. Removing them requires a separate ticket with runtime migration.

## Files Touched

- `schemas/dsl/game-definition.v1.json` — added `ParamDef` ($defs) with conditional domain validation per kind, added `params` to ActionDef
- `src/dsl/types.ts` — added `ParamDef`, `TokenParamDomain`, `PlayerParamDomain`, `ZoneParamDomain` interfaces; added optional `params` to `ActionDef`
- `src/dsl/index.ts` — exported new types
- `test/unit/dsl/schema.test.mjs` — added 14 tests (6 acceptance, 8 rejection)

## Assumption Corrections vs Original Ticket

1. **"Remove `targets` and `TargetDef`"** — WRONG. `targets` is used at runtime in `src/game-kernel/actions.js`, `src/game-kernel/selectors.js`, `src/dsl/semantic.js`, `src/evolutionary-engine/mutation/traversal.js`, and `src/evolutionary-engine/mutation/operators/token-zone-target-add.js`. Also used in 8 fixture JSON files. Removing requires runtime migration in a later ticket.
2. **"Schema rejects `targets: [...]`"** — WRONG. Cannot reject `targets` without breaking the entire test/runtime pipeline. `targets` remains valid alongside `params`.
3. **"No fixture updates"** — CORRECT for the revised additive scope.
4. **"No runtime code changes"** — CORRECT for the revised additive scope.

## Out of Scope

- Removing `targets`/`TargetDef` (requires runtime migration ticket)
- Runtime `resolveParamDomains` / `validateActionChoice` logic
- Fixture updates (no existing fixtures need `params`)
- Agent contract changes

## Acceptance Criteria

- [x] Schema validates `params: [{ id: "t", kind: "token", domain: { selector: { zone: "board" } } }]`.
- [x] Schema validates domain structure per kind (token requires `selector`, player requires `values`, zone requires `values`).
- [x] `targets` remains accepted (no breaking change).
- [x] `tsc -p tsconfig.json` passes.
- [x] Schema unit tests updated and passing.
- [x] `npm run test:unit` passes (1448 tests).
- [x] `npm run test:integration` passes (183 tests).

## Outcome

**What changed vs originally planned:**

The original ticket called for **removing** `targets`/`TargetDef` from schema and types — this was impossible as a schema-only change because `targets` is used by 6 runtime source files and 8 fixture JSON files. The ticket was corrected to be **additive only**: `ParamDef` and `params` were added alongside the existing `targets`.

**Actual changes:**
- 3 source files: added `ParamDef` $def with per-kind domain validation (token→selector, player→values, zone→values) to JSON Schema, added 4 TypeScript interfaces (`ParamDef`, `TokenParamDomain`, `PlayerParamDomain`, `ZoneParamDomain`), exported new types.
- 1 test file: added 14 new tests — 6 acceptance tests (token/player/zone params, count+unique, coexistence with targets) and 8 rejection tests (missing required fields, invalid kind, missing domain fields per kind, count<1).
- No docs updated — architecture docs describe the current `targets`-based runtime, which is unchanged. `params` has no runtime support yet.
