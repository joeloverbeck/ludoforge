# Interaction Rate Issues

“Interaction rate” is basically “turn-taking rate” You define interaction rate as “fraction of steps where active player changes”. That measures alternation cadence, not interaction. A pure multiplayer-solitaire engine builder can alternate every step and still have near-zero interdependence.

The core critique is correct:

Your current interaction rate is defined as “fraction of steps where the active player changes,” which measures turn alternation cadence, not strategic interdependence. 


In fact, your own docs already acknowledge this by calling it a turn-taking proxy. 

So: not a “bug” in the docs (they’re already honest about what it is), but it is a metric design weakness if you want anything resembling “players meaningfully affect each other.”

Also: the suggested direction—using the event stream / effect application to attribute “who was affected”—is plausible, because the simulation output includes an internal trajectory.events stream. 


But as-written today, your docs don’t guarantee those events contain enough structure to compute “affected players,” so you’d need a small instrumentation change.

One more important systems point: adding a new metric can unintentionally change fitness if you rely on “default weights = 1 for every feature.” 


So any improvement should be opt-in (or excluded from default scoring) to avoid silent behavioral drift in evolution.

## 1) What needs to change

### A. Redefine “interaction” vs “turn-taking” (breaking change)

Right now your docs define interaction rate as “fraction of steps where the active player changes (turn-taking proxy).” 

metrics-and-fitness


That’s misnamed if you actually want interdependence.

Change:

1. Rename the current metric:

Old id: interaction_rate

New id: turn_taking_rate

Definition: turn_taking_rate = (# of steps where activePlayerId changes) / (stepCount - 1)

If stepCount < 2, return 0.

2. Repurpose interaction_rate to mean actual cross-player coupling:

New id: interaction_rate

Definition (normative):
interaction_rate = (# of action steps where the step affects at least one non-active player) / (# of action steps)

“Action step” = a step with actionId != null (pass steps excluded; pass steps are explicitly recorded as actionId=null). 

simulation-engine

Update the “Core Metric Calculations” section accordingly (it currently calls interaction rate a turn-taking proxy). 

### B. Add step-level “who was affected” instrumentation

You already persist trajectory.steps and mention it must include legalActionCount for metrics. 

To compute real interaction, metrics need per-step impact info.

Change: extend each trajectory.steps[] snapshot with:

- affectedPlayerIds: string[] (unique ids, may be empty)

- affectedGlobal: boolean (optional, default false)

Rules:

Populate these during step execution while applying costs/effects/triggers (applyEffect, applyTriggers). 

simulation-engine

- A step “affects a player” if it writes to:

a per-player variable belonging to that player (variables have scope: per_player). 

a per-player zone belonging to that player (zones have scope: per_player). 

a player-scoped reference resolved through action targets (your DSL supports action targets with selector.player = self|opponent|any, and refs can point at player / zone / token / var).

- For pass steps (actionId=null), set affectedPlayerIds=[] and affectedGlobal=false (no action, and pass policy doesn’t run after-action triggers). 

simulation-engine

Interpretation for the metric:

- interaction_rate counts a step if affectedPlayerIds contains any id != activePlayerId.

- affectedGlobal does not count as interaction by itself (global changes can still be “multiplayer solitaire”).

### C. Update feature-vector ordering and docs (breaking change)

Your docs currently default feature ordering includes interaction_rate. 


After the rename, update ordering to include both, for deterministic serialization:

New default ordering:
agency, strategic_depth, seat_imbalance, variety, pacing_tension, turn_taking_rate, interaction_rate 


(And of course update any code that references the old id.)

### D. Close the E2E gap for “real metrics from real logs”

Your E2E doc lists “extended metrics aggregation” as a gap. 

e2e-coverage


Even though this new interaction_rate is a core metric, it depends on real step instrumentation, so you should add an E2E proof that it’s wired end-to-end.

## 2) Invariants that must pass
### Engine / determinism

Seeded runs must remain deterministic: identical seed + definition + config ⇒ identical trajectory.steps (including the new affectedPlayerIds) and therefore identical metrics.

### Metric correctness

turn_taking_rate ∈ [0, 1].

interaction_rate ∈ [0, 1].

Pass steps (actionId=null) never count toward interaction_rate denominator. 

simulation-engine

Single-player games:

turn_taking_rate = 0

interaction_rate = 0 

game-definition.v1

“Alternating multiplayer solitaire” is representable:

high turn_taking_rate

near-zero interaction_rate

### Data contract (updated)

trajectory.steps must still include legalActionCount for metrics. 

simulation-engine

After this change, affectedPlayerIds is part of the normative step snapshot contract (not optional) so analytics can rely on it.

### 3) Tests that should pass
#### Unit tests (metrics)

Update/replace existing tests that referenced the old interaction_rate meaning.

1. Turn-taking metric

Construct steps with alternating activePlayerId

Assert turn_taking_rate matches expected fraction

2. Interaction metric ignores alternation

Alternate active players every step

Set affectedPlayerIds to only [activePlayerId]

Assert interaction_rate = 0

3. Interaction metric counts cross-player externalities

Provide N action steps, K of which include affectedPlayerIds containing a non-active player

Assert interaction_rate = K / N

4. Pass steps excluded

Include steps with actionId=null

Assert they don’t affect numerator or denominator 

simulation-engine

#### Engine-level tests (instrumentation correctness)

These ensure the metric won’t silently be “always 0 because we forgot to record impacts.”

5. Opponent-scoped write is attributed

Use a fixture where an action targets an opponent player via targets[].selector.player="opponent" and an effect writes to a player/zone/var ref bound to that target.

Assert the resulting step snapshot includes the opponent id in affectedPlayerIds.

6. Trigger-induced write is attributed

Use a fixture where after_action / state_change triggers write to an opponent-scoped entity.

Assert opponent appears in affectedPlayerIds on the triggering step.

#### E2E tests

7. Feature vectors include the renamed + new metric ids

Run a small simulation through the real pipeline stage that builds feature vectors from real simulation logs (you already have a “preference model updates from real feature vectors” E2E test).

Assert feature vector contains:

turn_taking_rate

interaction_rate

and values match the known fixture behavior

8. Deterministic E2E

Same as above, but run twice with same seed and assert the exact same metrics (including the new ones).

## Update Docs

The architectural docs at docs/architecture/ should be updated when appropriate to keep them up-to-date.

## Status (January 28, 2026)

- Docs now describe `turn_taking_rate` and the updated `interaction_rate` plus feature ordering.
- E2E coverage includes deterministic assertions for the new metrics.
