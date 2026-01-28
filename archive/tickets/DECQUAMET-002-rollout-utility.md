# [DECQUAMET] DECQUAMET-002: Add rollout utility for arbitrary states
Status: Completed (2026-01-27)

## Goal
Provide a deterministic rollout helper that simulates from an arbitrary state using a fixed
policy and max step budget.

## File list (expected to touch)
- src/simulation-engine/rollout.js
- src/simulation-engine/rollout.d.ts
- src/simulation-engine/index.js
- src/simulation-engine/index.d.ts
- src/simulation-engine/loop.js
- src/simulation-engine/types.d.ts
- test/unit/simulation-engine/rollout.test.mjs

## Scope
- Implement a `runRollout` helper that takes `definition`, `state`, `agent` (controller or descriptor),
  `rng/seed`, and `maxSteps` (counted as action steps, not turn count).
- Normalize a single agent descriptor/controller and reuse it for all players.
- Use the existing simulation loop and legality checks to ensure consistent behavior.
- Return a result containing the terminal outcome, termination reason, and the final trajectory
  (or a minimal summary if needed for metrics).
- Clone the provided `state` so the caller's snapshot is not mutated.

## Out of scope
- No changes to the default simulation engine `run`/`runBatch` behavior.
- No new agent types beyond existing `random` and `greedy` descriptors.
- No persistence or logging changes.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/simulation-engine/rollout.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Rollouts are deterministic when seeded with the same seed and inputs.
- Rollouts respect `maxSteps`; when the step cap is hit, the rollout termination reason is
  `max-steps` while the termination outcome reason remains `max-turns` (the only step-cap reason
  supported by the termination API).
- Existing simulation tests remain green and do not change outputs.

## Notes
- Prefer reusing `loop.js` and `rng.js` utilities rather than duplicating logic.
- Keep the helper small and policy-agnostic; it should accept any `AgentController`.

## Outcome
- Added `runRollout` on top of the existing loop, with a rollout-only `max-steps` termination reason
  and `max-turns` as the termination outcome reason.
- Extended simulation-engine types/exports for rollout config and result, and added rollout unit tests.
