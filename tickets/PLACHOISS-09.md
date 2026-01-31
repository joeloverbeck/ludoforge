# PLACHOISS-09: Decision-space accounting (`legalActionCount` as choice product)

**Status:** TODO
**Dependencies:** PLACHOISS-08
**Blocks:** PLACHOISS-10

---

## What

`legalActionCount = sum(product(domainSize(param_i)))` per action, with configurable `MAX_DECISION_SPACE` cap.

## Files to Touch

- `src/simulation-engine/loop.js` — compute choice-product legalActionCount
- `src/simulation-engine/simultaneous-loop.js` — same
- `src/simulation-engine/step-execution.js` — `buildStep()` records `decisionSpaceCapped`, `decisionSpaceRaw`
- `configs/simulation.json` — add `maxDecisionSpace` field
- `schemas/config/simulation.json` — schema for new field
- New: `test/unit/simulation-engine/decision-space.test.mjs`

## Out of Scope

No changes to fitness weights, preference model, or extended metrics.

## Acceptance Criteria

- 2 actions (3-target, 2-target) produces count=5.
- 1 action (3x4 params) produces count=12.
- No-param action produces count=1.
- Cap behavior: raw > cap results in legalActionCount==cap, decisionSpaceCapped==true.
- Agency increases when param domains increase.
- Strategic depth tracks increased branching.
- Metrics integrity preserved.
- `npm run test:unit` and `npm run test:e2e` pass.
