# ACTSELTURSTRPRI-11: Fix test coverage for `start_round`/`end_round` in `trigger-add` operator

**Status: COMPLETED**

## Original Assumption (Corrected)

The original ticket assumed a new `round-trigger-add` mutation operator was needed. This was incorrect: the existing `trigger-add` operator (`src/evolutionary-engine/mutation/operators/trigger-add.js`) already includes `start_round` and `end_round` in its `TRIGGER_EVENTS` array (lines 9-10), generates random effects for them via `buildRandomEffect`, and is registered and enabled in `configs/evolution-operators.json`.

## What (Revised)

Fix the test file `test/unit/evolutionary-engine/trigger-add.test.mjs` where the `validEvents` assertion (line 35) was missing `start_round` and `end_round`, causing false negatives when the RNG selects those events. Add targeted tests that verify the operator can specifically produce round-boundary triggers.

## Outcome

### Changed vs Originally Planned

**Originally planned**: Create a new `round-trigger-add.js` operator, register it in `orchestrator.js` and `evolution-operators.json`.

**Actually changed**: Only the test file `test/unit/evolutionary-engine/trigger-add.test.mjs`. The operator code, config, and orchestrator were already correct.

### Changes Made

1. **Fixed** `validEvents` assertion array — added `"start_round"` and `"end_round"` to match the operator's `TRIGGER_EVENTS`.
2. **Added** 4 new tests:
   - `can produce a start_round trigger (seed 866)` — deterministic proof the operator generates `start_round`
   - `can produce an end_round trigger (seed 1234)` — deterministic proof for `end_round`
   - `round triggers reference valid game definition elements` — effect targets reference existing token types/variables
   - `appends round triggers to definitions that already have triggers` — verifies non-destructive append

### Verification

- `npm run test:unit` — 1179 tests, 0 failures
- `tsc -p tsconfig.json` — passes clean
