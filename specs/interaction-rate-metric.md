# Interaction Rate Metric Overhaul

**Status:** Draft
**Created:** 2026-01-30

## Problem

`interaction_rate` is a core metric and is used for descriptors, but it is excluded from fitness weights because the current definition under-counts interaction. Today it only counts steps where `affectedPlayerIds` contains a non-active player, which ignores:

- Global/shared state changes (`affectedGlobal` is ignored).
- Variable effects, which always record impact on the active player even if they conceptually target other players.
- Reveal/hide effects, which do not record any impact.

The result is a biased metric that favors per-player zones and misses many legitimate interaction patterns.

## Goals

- Make `interaction_rate` representative across common interaction patterns (shared zones, global state, opponent-affecting effects).
- Keep the metric bounded in `[0, 1]` and stable across runs.
- Make its definition precise enough to justify inclusion in fitness weights.

## Non-Goals

- Redesigning all impact tracking beyond what is required for interaction_rate.
- Changing the semantic meaning of existing effects.

## Proposed Definition

Compute interaction_rate per simulation run as:

```
interaction_rate = interactive_steps / action_steps
```

Where:

- `action_steps` are steps with a non-null `actionId`.
- A step is `interactive` if it satisfies at least one of the following:
  1. **Affects other players directly:** `affectedPlayerIds` includes any player id different from the active player.
  2. **Affects shared/global state:** `affectedGlobal === true`.
  3. **Affects another player's scoped zone or tokens:** the effect targets a `per_player` zone for a player other than the active player.

Notes:
- Condition (1) and (2) are computed from step impact data.
- Condition (3) requires effect-level attribution to know the target player of a per-player zone change.

## Required Changes

### 1) Improve impact attribution for variable effects

Current behavior records variable effects as impacting only the active player. Update the effect application layer so that when a variable is scoped per-player and the effect explicitly targets another player (e.g., a `targetPlayerId` or equivalent context), the impacted player id is recorded accordingly.

### 2) Record impact for reveal/hide

`reveal` and `hide` should record impact. These are observable state changes and should contribute to interaction when they affect non-active players or shared state.

### 3) Preserve and use `affectedGlobal`

`interaction_rate` should treat any step with `affectedGlobal === true` as interactive, regardless of `affectedPlayerIds`.

### 4) Add per-player zone targeting signals

When a token is moved/spawned/destroyed into a `per_player` zone that belongs to another player, that should record the impacted player id (not the active player). This enables condition (3) for interaction detection.

### 5) Update metric definition in docs

Review and update any relevant docs in `docs/architecture/` to reflect the new interaction_rate definition and impact attribution behavior.

## Invariants

- `interaction_rate` remains in `[0, 1]`.
- `interaction_rate` is `0` when there are no action steps.
- A step that affects shared/global state is always counted as interactive.
- A step that affects another player's per-player zone is counted as interactive.
- For games where only the active player's private state changes, interaction_rate should remain low (near 0) unless there is direct or shared impact.

## Tests

### New or Updated Unit Tests

- **Core metrics:** `interaction_rate` counts `affectedGlobal` steps as interactive.
- **Core metrics:** `interaction_rate` counts steps that affect another player's per-player zone as interactive.
- **Effect application:** variable effects record impact for non-active player targets.
- **Token effects:** moving/spawning/destroying tokens into another player's per-player zone records impacted player id.
- **Reveal/hide:** reveal/hide record impact and can mark steps interactive when they affect shared or non-active player state.

### Existing Tests That Must Pass

- `npm run test:unit`

## Acceptance Criteria

- The new definition is implemented and validated by unit tests.
- `interaction_rate` is no longer excluded from fitness weights by default.
- All relevant architecture docs in `docs/architecture/` are reviewed and updated to reflect the new behavior.

## Open Questions

- How should effects that target multiple players be attributed in `affectedPlayerIds`?
- Do we need a separate metric for "shared impact" vs "direct opponent impact"?

