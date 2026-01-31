# PLACHOISS-08: Update agent contract and baseline agents

**Status:** DONE
**Dependencies:** PLACHOISS-07
**Blocks:** PLACHOISS-09

---

## What

Agents receive param domains per legal action. Return `ActionChoice = { actionId, args }`. Random and greedy agents updated.

## Files to Touch

- `src/simulation-engine/agent-action.js` — compute domains per legal action via `resolveParamDomains()`, pass enriched `legalMoves` alongside existing `legalActions`, parse `{ actionId, args }` return, validate args via `validateActionChoice()`
- `src/simulation-engine/agents/random.js` — pick random action from `legalMoves`, random arg per param from domains
- `src/simulation-engine/agents/greedy.js` — enumerate action+args combinations, score and pick best
- `src/simulation-engine/loop.js` — destructure `{ action, args }` from `selectAndValidateAction()`, pass real args to `executeActionStep()`
- `src/simulation-engine/simultaneous-loop.js` — same
- Tests for agent-action, random agent, greedy agent

## Assumptions (reassessed)

- `selectAndValidateAction()` currently passes `legalActions` (plain action objects) to agents and returns the action object — confirmed in `agent-action.js:42-71`.
- Agents' `selectAction()` input uses `legalActions` property (not `legalMoves`) — confirmed in `agents/random.js:3`, `agents/greedy.js:5`.
- `resolveParamDomains()` exists in `game-kernel/selectors.js:94` and is exported from `game-kernel/index.js` — confirmed.
- `buildVariableIndex()` exists in `game-kernel/effects.js` and is exported from `game-kernel/index.js` — confirmed.
- `validateActionChoice()` in `game-kernel/actions.js:148` already supports `options.args` parameter (implemented in PLACHOISS-06) — confirmed.
- Both `loop.js:119-125` and `simultaneous-loop.js:95-143` call `selectAndValidateAction()` and pass `args: {}` to `executeActionStep()` — confirmed.
- No `listLegalMoves()` or `applyMove()` functions exist in the codebase — the actual equivalents are `listLegalActions()` and `executeActionStep()`.

## Corrections from original ticket

- AC "listLegalMoves() and applyMove() consistency" — these functions don't exist. Corrected to: the enriched `legalMoves` passed to agents must be consistent with what `validateActionChoice()` accepts (i.e., domains are computed from the same state).
- "pass as legalMoves" — clarified: `legalMoves` is a NEW property added to the agent input alongside existing `legalActions` (backward compat for custom agents that only read `legalActions`).
- `selectAndValidateAction()` return type changes from `action` to `{ action, args }` — both loops must destructure.

## Out of Scope

No metrics changes. No mutation operator changes.

## Acceptance Criteria

- [x] Random agent selects valid args from domains.
- [x] Greedy agent selects best-scored combination.
- [x] No-param actions return `{ actionId, args: {} }`.
- [x] Deterministic with seeded RNG.
- [x] Legacy agents returning string or action object still work (args default to `{}`).
- [x] `npm run test:unit` and `npm run test:e2e` pass.

## Outcome

### What changed vs originally planned

**Ticket corrections before implementation:**
- Original AC referenced `listLegalMoves()` and `applyMove()` — these functions don't exist. Corrected to match actual codebase names (`listLegalActions()`, `executeActionStep()`).
- Clarified that `legalMoves` is a new property added alongside existing `legalActions` for backward compatibility with custom agents.
- Added backward-compat AC: legacy agents returning string or action object still work with args defaulting to `{}`.

**Code changes (5 files, minimal diffs):**
1. `src/simulation-engine/agent-action.js` — Added `buildLegalMoves()` helper that computes param domains per legal action via `resolveParamDomains()`. Modified `selectAndValidateAction()` to pass `legalMoves` alongside `legalActions`, parse `{ actionId, args }` return format, validate args, and return `{ action, args }`.
2. `src/simulation-engine/agents/random.js` — Added `pickRandomArgs()` helper for domain sampling. Updated `selectAction()` to use `legalMoves` when available, picking random action and random args per param from domains. Returns `{ actionId, args }`.
3. `src/simulation-engine/agents/greedy.js` — Added `enumerateCombinations()` for action+args cartesian product. Updated `selectAction()` to enumerate and score all combos when `legalMoves` provided. Returns `{ actionId, args }`.
4. `src/simulation-engine/loop.js` — Destructure `{ action, args }` from `selectAndValidateAction()`, pass real `args` to `executeActionStep()`.
5. `src/simulation-engine/simultaneous-loop.js` — Same: store `args` in planned array, pass through to `executeActionStep()`.

**Tests added:**
- `test/unit/simulation-engine/agent-action.test.mjs` (new file, 5 tests): buildLegalMoves domain resolution, selectAndValidateAction with `{ actionId, args }` format, legacy string/object return, legalMoves passthrough, invalid arg rejection.
- `test/unit/simulation-engine/agents.test.mjs` (10 new tests): random agent with legalMoves, deterministic arg selection, no-param actions, multi-select params; greedy agent with legalMoves, combo scoring, cross-action best pick.

**All 1548 unit + 183 integration + 120 E2E tests pass.**
