# PLACHOISS-06: Rewrite `isActionLegal()` and `validateActionChoice()` for params

**Status:** TODO
**Dependencies:** PLACHOISS-05
**Blocks:** PLACHOISS-07

---

## What

Legality checks use param domains. Validation accepts `ActionChoice = { actionId, args }`.

## Files to Touch

- `src/game-kernel/actions.js` — rewrite `isActionLegal()` (param domain emptiness), `validateActionChoice()` (arg membership, uniqueness, count)
- `src/game-kernel/index.js` — update exports if needed
- `test/unit/game-kernel/actions.test.mjs` — update + add new tests

## Out of Scope

No agent changes. No simulation loop changes. No legalActionCount semantics.

## Acceptance Criteria

- Single-target token param — agent chooses each token ID, each accepted, affects chosen token only.
- Invalid arg rejected with structured error.
- Multi-select `count=2, unique=true` — 2 distinct legal, duplicates illegal.
- No hidden auto-binding. Missing/invalid args cause rejection, never silent substitution.
- Cost feasibility uses chosen args.
- `npm run test:unit` passes.
- `tsc -p tsconfig.json` passes.
