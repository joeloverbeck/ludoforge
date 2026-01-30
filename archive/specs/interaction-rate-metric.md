# Interaction Rate Metric Overhaul

**Status:** Implemented
**Created:** 2026-01-30

## Problem

`interaction_rate` is a core metric and is used for descriptors, but it was excluded from fitness weights because the original definition under-counted interaction. It only counted steps where `affectedPlayerIds` contains a non-active player, which ignored:

- Global/shared state changes (`affectedGlobal` was ignored).
- Variable effects, which always recorded impact on the active player even if they conceptually target other players.
- Reveal/hide effects, which did not record any impact.

The result was a biased metric that favored per-player zones and missed many legitimate interaction patterns.

## Goals

- Make `interaction_rate` representative across common interaction patterns (shared zones, global state, opponent-affecting effects).
- Keep the metric bounded in `[0, 1]` and stable across runs.
- Make its definition precise enough to justify inclusion in fitness weights.

## Non-Goals

- Redesigning all impact tracking beyond what is required for interaction_rate.
- Changing the semantic meaning of existing effects.

## Implemented Definition

Compute interaction_rate per simulation run as:

```
interaction_rate = interactive_steps / action_steps
```

Where:

- `action_steps` are steps with a non-null `actionId`.
- A step is `interactive` if it satisfies at least one of the following:
  1. **Affects other players directly:** `affectedPlayerIds` includes any player id different from the active player.
  2. **Affects shared/global state:** `affectedGlobal === true`.

## DSL Extension: Player Target Bindings

Variable effect targets now support an optional `player` field on the `Ref` with `kind: "var"`. The `player` value is a **binding name** (e.g., `"victim"`) referencing a resolved player target, or the literal `"self"` / `"opponent"` for simple cases.

Example: "attack opponent, reduce their health":

```json
{
  "id": "attack",
  "targets": [
    { "id": "victim", "kind": "player", "selector": { "player": "opponent" } }
  ],
  "effects": [
    { "kind": "dec", "target": { "kind": "var", "id": "health", "player": "victim" }, "amount": 1 }
  ]
}
```

Flow:
1. `resolveActionTargets` sees `kind: "player"` target → resolves opponent player IDs via `resolvePlayerSelector` → stores `bindings.victim = 2`
2. `applyEffect` sees `effect.target.player === "victim"` → looks up `context.bindings.victim` → gets player ID `2`
3. `applyVariableEffect` uses player ID `2` instead of `context.playerId` for resolve/write/impact

For 3+ player games: The selector `{ player: "opponent" }` returns all non-self player IDs. Combined with `count: 1, random: true`, it picks one opponent.

Precondition expressions (`resolveRefValue`) also respect the `player` field on var refs, allowing conditions to read another player's variable value.

## Changes Made

### Schema
- `schemas/dsl/game-definition.v1.json`: Added optional `player` field to var Ref.

### Game Kernel
- `src/game-kernel/selectors.js`: Added `resolvePlayerSelector()` and `kind: "player"` handling in `resolveActionTargets()`.
- `src/game-kernel/effect-application.js`: Added `resolveTargetPlayerId()` and plumbed `targetPlayerId` through `applyVariableEffect()`.
- `src/game-kernel/ref-resolution.js`: `resolveRefValue()` now resolves `player` field on var refs via binding lookup or literal `"self"`/`"opponent"`.
- `src/game-kernel/token-effects.js`: `applyTokenReveal()` and `applyTokenHide()` now call `recordTokenImpact()`.

### Evaluation Analytics
- `src/evaluation-analytics/metrics/core.js`: `computeInteractionRate()` now checks `affectedGlobal === true` in addition to cross-player `affectedPlayerIds`.
- `src/evaluation-analytics/fitness.js`: Removed hardcoded `interaction_rate: 0` default weight override.

### Config
- `configs/fitness.json`: Changed `interaction_rate` weight from `0` to `1`.

### Documentation
- `docs/architecture/metrics-and-fitness.md`: Updated `interaction_rate` definition.

## Invariants

- `interaction_rate` remains in `[0, 1]`.
- `interaction_rate` is `0` when there are no action steps.
- A step that affects shared/global state is always counted as interactive.
- A step that affects another player's per-player zone is counted as interactive.
- For games where only the active player's private state changes, interaction_rate should remain low (near 0) unless there is direct or shared impact.

## Resolved Questions

1. **"How should effects that target multiple players be attributed?"**
   Already handled: `affectedPlayerIds` is a `Set`; each effect adds its impacted player(s). No change needed.

2. **"Do we need a separate metric for shared vs direct opponent impact?"**
   No. `affectedGlobal` is already recorded per-step. A separate metric can be derived later from existing data if needed. For now, both count as "interactive" in one metric.

Note: `experiments/default.json` has no fitness weights — it only defines MAP-Elites descriptors. Fitness weights are solely in `configs/fitness.json`.

## Tests

### New Unit Tests
- `test/unit/game-kernel/player-selector.test.mjs` — `resolvePlayerSelector` and `resolveActionTargets` with `kind: "player"`.
- `test/unit/game-kernel/variable-effect-player-targeting.test.mjs` — variable effects with `player` field (binding, literal, backward compat).
- `test/unit/game-kernel/token-effects-impact.test.mjs` — reveal/hide impact recording for global and per-player zones.

### Updated Unit Tests
- `test/unit/evaluation-analytics/core-metrics.test.mjs` — `affectedGlobal` counting, dual condition, non-interactive baseline.
- `test/unit/evaluation-analytics/fitness.test.mjs` — `interaction_rate` weight is not zeroed out.

## Acceptance Criteria

- [x] The new definition is implemented and validated by unit tests.
- [x] `interaction_rate` is no longer excluded from fitness weights by default.
- [x] All relevant architecture docs in `docs/architecture/` are reviewed and updated to reflect the new behavior.
