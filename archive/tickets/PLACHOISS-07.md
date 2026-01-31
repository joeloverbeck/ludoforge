# PLACHOISS-07: Update `applyAction()` to use choice args as bindings

**Status:** DONE
**Dependencies:** PLACHOISS-06
**Blocks:** PLACHOISS-08

---

## What

Effect application receives args from action choice instead of auto-resolving via `resolveActionTargets()`.

## Files to Touch

- `src/simulation-engine/step-execution.js` — `applyAction()` accepts an `args` parameter; when args are non-empty, builds bindings directly from args instead of calling `resolveActionTargets()`
- `src/simulation-engine/execute-action-step.js` — accept and pass `args` through to `applyAction()`
- `src/simulation-engine/loop.js` — pass `args: {}` to `executeActionStep()`
- `src/simulation-engine/simultaneous-loop.js` — same
- `src/simulation-engine/agent-action.js` — pass `options.args` to `validateActionChoice()` when args are available (currently agents don't supply args, so this is a no-op until PLACHOISS-08)

## Out of Scope

Agent selection changes (agents still return plain actions temporarily; args default to `{}`).

## Assumptions (reassessed)

- `applyAction()` currently calls `resolveActionTargets()` which auto-picks the first matching candidate for each param/target — confirmed in `step-execution.js:28-31`.
- `executeActionStep()` currently passes 4 positional args to `applyAction()` with no args parameter — confirmed in `execute-action-step.js:45`.
- Both `loop.js` and `simultaneous-loop.js` call `executeActionStep()` without any args field — confirmed.
- `selectAndValidateAction()` calls `validateActionChoice()` without `options.args` — confirmed in `agent-action.js:66`.
- `validateActionChoice()` already supports an `options.args` parameter (implemented in PLACHOISS-06) — confirmed in `actions.js:148`.
- `resolveParamDomains()` already exists and works — confirmed in `selectors.js:94`.

## Acceptance Criteria

- [x] Action with token param `t` and args `{ t: "token_1" }` applies effects to token_1.
- [x] No-param actions work with empty args (fallback to `resolveActionTargets()`).
- [x] When args are provided and non-empty, `resolveActionTargets()` is bypassed — bindings come from args directly.
- [x] When args are empty or absent, `resolveActionTargets()` is used as fallback (backward compat with current agents that don't supply args).
- [x] Determinism preserved.
- [x] `npm run test:unit` and `npm run test:integration` pass.

## Outcome

### What changed vs originally planned

**Ticket corrections before implementation:**
- Original AC said "No call to `resolveActionTargets()` in action execution path" — corrected to conditional: `resolveActionTargets()` is bypassed only when explicit args are provided and non-empty. Empty/absent args fall back to auto-resolve for backward compatibility (agents don't supply args yet).
- Added `agent-action.js` to files list (already had infrastructure from PLACHOISS-06 but was not listed).
- Added reassessed assumptions section documenting verified code state.

**Code changes (4 files, minimal diffs):**
1. `src/simulation-engine/step-execution.js` — `applyAction()` gains a 5th `args` parameter. When non-empty, args are spread into bindings directly; otherwise falls back to `resolveActionTargets()`.
2. `src/simulation-engine/execute-action-step.js` — Accepts `args` in params object, forwards to `applyAction()`.
3. `src/simulation-engine/loop.js` — Passes `args: {}` to `executeActionStep()`.
4. `src/simulation-engine/simultaneous-loop.js` — Same.

**No change to `agent-action.js`** — agents don't supply args yet, so the existing `validateActionChoice()` call without `options.args` is correct. The infrastructure is ready for PLACHOISS-08.

**Tests added (4 new tests in `step-execution.test.mjs`):**
- "uses explicit args as bindings when args are non-empty" — verifies token_2 destroyed via `{ t: "token_2" }` binding
- "falls back to resolveActionTargets when args are empty" — verifies auto-pick first match
- "falls back to resolveActionTargets when args are undefined" — verifies backward compat
- "no-param action works with empty args" — verifies variable `inc` effect still works

**All 1485 unit + 183 integration tests pass.**
