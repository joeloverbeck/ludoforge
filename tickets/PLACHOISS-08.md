# PLACHOISS-08: Update agent contract and baseline agents

**Status:** TODO
**Dependencies:** PLACHOISS-07
**Blocks:** PLACHOISS-09

---

## What

Agents receive param domains per legal action. Return `ActionChoice = { actionId, args }`. Random and greedy agents updated.

## Files to Touch

- `src/simulation-engine/agent-action.js` — compute domains per legal action, pass as `legalMoves`, validate returned choice
- `src/simulation-engine/agents/random.js` — pick random action, random arg per param
- `src/simulation-engine/agents/greedy.js` — score action+args combinations
- `src/simulation-engine/loop.js` — adapt to `{ actionId, args }` return
- `src/simulation-engine/simultaneous-loop.js` — same
- Tests for agent-action, random agent, greedy agent

## Out of Scope

No metrics changes. No mutation operator changes.

## Acceptance Criteria

- Random agent selects valid args from domains.
- Greedy agent selects best-scored combination.
- No-param actions return `{ actionId, args: {} }`.
- Deterministic with seeded RNG.
- `listLegalMoves()` and `applyMove()` consistency.
- `npm run test:unit` and `npm run test:e2e` pass.
