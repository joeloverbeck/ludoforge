# PLACHOISS-06: Rewrite `isActionLegal()` and `validateActionChoice()` for params

**Status:** COMPLETED
**Dependencies:** PLACHOISS-05
**Blocks:** PLACHOISS-07

---

## What

Legality checks use param domains. Validation accepts optional `args` in options for parameterized actions.

## Assumption Corrections vs Original Ticket

1. **"rewrite `isActionLegal()` (param domain emptiness)"** — CORRECT. Changed from `resolveActionTargets` (auto-binding, picks first match) to `resolveParamDomains` (checks ALL candidates). An action with params is now legal only if every param has a non-empty domain.
2. **"rewrite `validateActionChoice()` (arg membership, uniqueness, count)"** — PARTIALLY CORRECT. The original ticket implied `ActionChoice = { actionId, args }` as a new input shape, but this would break callers in `agent-action.js` and `run-human-loop.js` (which the ticket's "Out of Scope" section explicitly excludes). **Correction:** `args` is accepted as an optional field in the existing `options` parameter (`options.args`). When `args` is not provided, arg validation is skipped (backwards-compatible). When provided, full validation (membership, uniqueness, count) is enforced.
3. **"update exports if needed"** — No export changes needed. `isActionLegal` and `validateActionChoice` are already exported.
4. **"No agent changes. No simulation loop changes."** — PRESERVED. The signature is backwards-compatible; callers that don't pass `args` continue to work identically.

## Files Touched

- `src/game-kernel/actions.js` — rewrote `isActionLegal()` (param domain emptiness via `resolveParamDomains`), rewrote `validateActionChoice()` (optional `args` validation)
- `src/game-kernel/actions.d.ts` — updated type declarations for `options.args` and `ActionValidationResult.paramId`/`.value`
- `test/unit/game-kernel/actions.test.mjs` — added 13 new tests (4 for `isActionLegal` domain checks, 9 for `validateActionChoice` arg validation)

## Out of Scope

No agent changes. No simulation loop changes. No legalActionCount semantics.

## Acceptance Criteria

- [x] Single-target token param — agent chooses each token ID, each accepted, affects chosen token only.
- [x] Invalid arg rejected with structured error.
- [x] Multi-select `count=2, unique=true` — 2 distinct legal, duplicates illegal.
- [x] No hidden auto-binding. Missing/invalid args cause rejection, never silent substitution.
- [x] Cost feasibility uses chosen args.
- [x] `npm run test:unit` passes (1481 tests).
- [x] `tsc -p tsconfig.json` passes.

## Outcome

**What changed vs originally planned:**

The main deviation from the original ticket: `validateActionChoice` was **not** changed to accept `ActionChoice = { actionId, args }` as a new top-level shape, because that would break existing callers (`agent-action.js:66`, `run-human-loop.js:104`) which the ticket explicitly placed out of scope. Instead, `args` was added as an optional field in the existing `options` parameter. When callers omit `args`, behavior is identical to before — no arg validation runs. When `args` is provided, full validation (domain membership, count, uniqueness) is enforced with structured error reasons (`missing-arg`, `arg-not-in-domain`, `duplicate-arg`, `wrong-arg-count`, `invalid-arg-type`).

`isActionLegal` was changed as planned: it now uses `resolveParamDomains` to check that every param has a non-empty domain, rather than using `resolveActionTargets` (which auto-picked the first match and only checked for null).

**Actual changes:**
- 2 source files modified: `src/game-kernel/actions.js` (legality + validation logic), `src/game-kernel/actions.d.ts` (type declarations)
- 1 test file modified: `test/unit/game-kernel/actions.test.mjs` — added 13 new tests (was 3, now 16)
- No exports changed. No public API signature broken. No caller changes needed.
