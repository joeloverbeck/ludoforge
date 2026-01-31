# PLACHOISS-07: Update `applyAction()` to use choice args as bindings

**Status:** TODO
**Dependencies:** PLACHOISS-06
**Blocks:** PLACHOISS-08

---

## What

Effect application receives args from action choice instead of auto-resolving via `resolveActionTargets()`.

## Files to Touch

- `src/simulation-engine/step-execution.js` — `applyAction()` accepts args, builds bindings from args
- `src/simulation-engine/execute-action-step.js` — pass args through
- `src/simulation-engine/loop.js` — pass choice args
- `src/simulation-engine/simultaneous-loop.js` — same

## Out of Scope

Agent selection changes (agents still return plain actions temporarily; args default to `{}`).

## Acceptance Criteria

- Action with token param `t` and args `{ t: "token_1" }` applies effects to token_1.
- No-param actions work with empty args.
- No call to `resolveActionTargets()` in action execution path.
- Determinism preserved.
- `npm run test:unit` and `npm run test:integration` pass.
