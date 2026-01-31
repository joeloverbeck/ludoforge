# PLACHOISS-05: Implement `resolveParamDomains()` in game-kernel

**Status:** COMPLETED
**Dependencies:** PLACHOISS-03, PLACHOISS-04
**Blocks:** PLACHOISS-06

---

## What

New function that computes valid choice domains for each param, returning all matching candidates (not just the first). Reuses existing `resolveSelector()` for token-kind params and `resolvePlayerSelector()` for player-kind params (via the `domain.values` spec).

## Assumption Corrections vs Original Ticket

1. **"Reuses existing `resolveSelector()` for token-kind params"** — CORRECT. Token params have `domain.selector` which is a `SelectorDef`, and `resolveSelector` handles those.
2. **"Player param 'opponent' returns non-self IDs"** — PARTIALLY CORRECT but imprecise. Per the schema (PLACHOISS-03), player params use `domain: { values: "self" | "opponent" | "any" | number[] }`, NOT `domain: { selector: ... }`. The function converts `domain.values` into a player spec and delegates to `resolvePlayerSelector`. For explicit integer arrays, it returns those directly.
3. **"Zone param returns specified zone IDs"** — CORRECT. Zone params use `domain: { values: string[] }`, which is a static list — returned as-is.
4. **Signature `resolveParamDomains(params, state, context)`** — CORRECT. Returns `Record<string, Array<string|number>>`.
5. **"Empty domain returns empty array"** — CORRECT. Null/undefined/missing params produce an empty result object `{}`.

## Files Touched

- `src/game-kernel/selectors.js` — added `resolveParamDomains(params, state, context)`
- `src/game-kernel/index.js` — exported `resolveParamDomains`
- New: `test/unit/game-kernel/resolve-param-domains.test.mjs` — 19 tests

## Out of Scope

No changes to `isActionLegal`, `validateActionChoice`, agents, or simulation loop.

## Acceptance Criteria

- [x] Token param with `domain.selector` returns ALL matching token IDs (not just the first).
- [x] Player param with `domain.values: "opponent"` returns non-self player IDs.
- [x] Player param with `domain.values: "self"` returns self player ID.
- [x] Player param with `domain.values: "any"` returns all player IDs.
- [x] Player param with `domain.values: [1, 3]` returns those explicit IDs.
- [x] Zone param with `domain.values: ["hand", "board"]` returns `["hand", "board"]`.
- [x] Missing/empty params array returns empty object `{}`.
- [x] Existing `resolveSelector`/`resolvePlayerSelector`/`resolveActionTargets` behavior unchanged.
- [x] Deterministic output given same inputs.
- [x] `tsc -p tsconfig.json` passes.
- [x] New unit tests pass (19 tests).
- [x] Full unit suite passes (1468 tests).

## Outcome

**What changed vs originally planned:**

The original ticket's assumptions were mostly correct. One correction: player params use `domain: { values: "opponent" }` (per the JSON Schema from PLACHOISS-03), not `domain: { selector: { player: "opponent" } }`. The implementation handles this by converting the `values` string spec into the `{ player: spec }` object that `resolvePlayerSelector` expects, and returns explicit integer arrays directly for `domain.values: number[]`.

**Actual changes:**
- 2 source files modified: `src/game-kernel/selectors.js` (added 38-line `resolveParamDomains` function), `src/game-kernel/index.js` (added export).
- 1 new test file: `test/unit/game-kernel/resolve-param-domains.test.mjs` with 19 tests covering all 3 param kinds (token/player/zone), mixed params, and edge cases (null/undefined/empty/missing fields/determinism).
- No existing public APIs changed. No architecture docs required updating — `resolveParamDomains` is a new additive function that does not yet participate in the simulation loop.
