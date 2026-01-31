# PLACHOISS-09: Decision-space accounting (`legalActionCount` as choice product)

**Status:** DONE
**Dependencies:** PLACHOISS-08
**Blocks:** PLACHOISS-10

---

## What

`legalActionCount = sum(product(domainSize(param_i)))` per action, with configurable `MAX_DECISION_SPACE` cap.

## Files to Touch

- `src/simulation-engine/loop.js` — compute choice-product legalActionCount
- `src/simulation-engine/simultaneous-loop.js` — same
- `src/simulation-engine/step-execution.js` — `buildStep()` records `decisionSpaceCapped`, `decisionSpaceRaw`
- `src/simulation-engine/execute-action-step.js` — forwards decision-space fields to `buildStep()`
- `src/simulation-engine/simulation-defaults.js` — resolves `maxDecisionSpace` from config
- `configs/simulation.json` — add `maxDecisionSpace` field
- `schemas/config/simulation.schema.json` — schema for new field
- `schemas/simulation-engine/simulation-result.schema.json` — step schema for new fields
- New: `src/simulation-engine/decision-space.js` — `computeDecisionSpace()` + `choicesForAction()`
- New: `test/unit/simulation-engine/decision-space.test.mjs`

## Out of Scope

No changes to fitness weights, preference model, or extended metrics.

## Acceptance Criteria

- [x] 2 actions (3-target, 2-target) produces count=5.
- [x] 1 action (3x4 params) produces count=12.
- [x] No-param action produces count=1.
- [x] Cap behavior: raw > cap results in legalActionCount==cap, decisionSpaceCapped==true.
- [x] Agency increases when param domains increase.
- [x] Strategic depth tracks increased branching.
- [x] Metrics integrity preserved.
- [x] `npm run test:unit` and `npm run test:e2e` pass.

## Outcome

### What was actually changed vs originally planned

The ticket's file list was accurate with minor additions:

1. **New file `src/simulation-engine/decision-space.js`** — Extracted the computation into a dedicated module (`computeDecisionSpace()` and `choicesForAction()`), keeping the loops thin. The ticket assumed inline computation in the loop files; a separate module is cleaner.

2. **`src/simulation-engine/execute-action-step.js`** — Not listed in the ticket but required: this file sits between the loops and `buildStep()`, so it needed to accept and forward `decisionSpaceRaw`/`decisionSpaceCapped`.

3. **`src/simulation-engine/simulation-defaults.js`** — Not listed but required: resolves `maxDecisionSpace` from the config file so it reaches the loops via `config`.

4. **`schemas/simulation-engine/simulation-result.schema.json`** — Not listed but required: added `decisionSpaceRaw` and `decisionSpaceCapped` to TrajectoryStep.

5. **Schema filename correction** — Ticket said `schemas/config/simulation.json` but actual file is `schemas/config/simulation.schema.json`.

6. **Tests added**: 14 new tests total (12 in `decision-space.test.mjs` + 2 in `step-execution.test.mjs`).

All 1560 unit tests and 120 E2E tests pass.
