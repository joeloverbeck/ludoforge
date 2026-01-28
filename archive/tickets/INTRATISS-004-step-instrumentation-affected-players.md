# INTRATISS-004: Instrument steps with affectedPlayerIds/affectedGlobal

## Status
Completed (2026-01-28)

## Context
The `interaction_rate` metric already expects per-step information about which players were affected. Steps must include `affectedPlayerIds` (unique list) and `affectedGlobal` (boolean) populated during action costs/effects and triggers so analytics can see it via `trajectory.steps` and `trajectorySummaries.keySteps`.

## Work
- Extend effect/trigger application to report which player scopes were written.
  - Per-player variable writes add that player id to `affectedPlayerIds`.
  - Global variable writes set `affectedGlobal = true` (does not count as interaction by itself).
- Thread the write-impact info back to the simulation loop so each step snapshot includes:
  - `affectedPlayerIds: number[]` (unique, deterministic order).
  - `affectedGlobal: boolean` (default `false`).
- Ensure pass steps (`actionId = null`) record `affectedPlayerIds = []` and `affectedGlobal = false`.
- Include `affectedPlayerIds` and `affectedGlobal` in analytics summaries (log adapter + types) so metrics can access them.

## File list it expects to touch
- `src/game-kernel/effects.js`
- `src/game-kernel/triggers.js`
- `src/simulation-engine/loop.js`
- `src/simulation-engine/types.d.ts`
- `src/game-kernel/effects.d.ts`
- `src/evaluation-analytics/log-adapter.js`
- `src/evaluation-analytics/types.ts`
- `schemas/simulation-engine/simulation-result.schema.json`

## Out of scope
- Metric computation changes in evaluation-analytics.
- Feature vector ordering or scoring defaults.
- E2E tests.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/simulation-engine/core-loop.test.mjs` (or the closest loop-focused test file)

### Invariants that must remain true
- Seeded simulations remain deterministic (affected player data is stable for the same seed/definition/config).
- Pass steps never mark affected players or global changes.
- Existing step snapshot fields (`turn`, `phase`, `playerId`, `actionId`, `legalActionCount`) are unchanged.
### Implementation constraints (current codebase reality)
- Only variable effects are executed; other effect kinds are currently no-ops.
- Action/trigger targeting does not resolve opponent or explicit player scopes yet, so affected players are based on the `context.playerId` used during variable writes.

## Outcome
- Implemented impact tracking for variable writes in effects/triggers and threaded it into step snapshots (including pass steps).
- Updated simulation-result schema plus analytics log adapter/types to carry affected-player fields into summaries.
- Added/updated unit tests around core-loop instrumentation and log adapter handling of affected-player fields.
