# No Legal Actions Issue

We have a real design bug, not a nit. Your simulation loop currently:

- evaluates termination before listing legal actions, and

- hard-codes legalActions.length === 0 to draw + terminationReason="stalemate". 

That silently bakes a “rule-law” into the engine and blocks checkmate-like losses, forced-pass games, and any design where “no move” isn’t a draw. It also leaks into E2E expectations (“human loop throws… engine treats as stalemate draw”). 

Below is a spec-like change proposal with invariants + tests.

## 1) Fix spec
### 1.1 Goals

1. Remove hard-coded draw-on-no-legal-actions from the simulation engine.

2. Make “no legal actions” first-class and observable to termination evaluation.

3. Support at least these policies when legalActions.length === 0:

terminate (with DSL-defined outcome mapping; checkmate-style loss possible)

pass (auto-advance turn without action; forced-pass games possible)

error (explicitly fail; useful for debugging)

### 1.2 Engine loop reorder

Current step order (documented): termination → list legal actions → choose action… 

simulation-engine

New step order (required):

1. legalActions = listLegalActions(state, activePlayer, phase)

2. ctx = { legalActionCount: legalActions.length, hasLegalActions: legalActions.length > 0, ... }

3. termination = evaluateTermination(state, ctx)

4. If terminated → return

5. If legalActionCount === 0 → handle via noLegalActionsPolicy (below)

6. Else → normal agent action selection + apply effects

This is the minimum to make “no legal actions” visible to termination logic.

### 1.3 Expose simulation “meta” values to termination expressions (DSL extension)

Right now, termination conditions can only reference state refs (var/token/zone/player). There’s no way to refer to legal action count.

Extend Ref with a new variant:

{ "kind": "meta", "id": "legalActionCount" }
{ "kind": "meta", "id": "hasLegalActions" }

Where:

- meta.legalActionCount resolves to integer >= 0

- meta.hasLegalActions resolves to boolean

Semantics:

Meta refs are read-only and exist only during evaluation (they are not part of state and don’t serialize into state snapshots as variables).

Why this matters: it lets DSL authors express checkmate/stalemate/puzzle loss as normal termination conditions, instead of engine magic.

### 1.4 Add explicit no-legal-actions policy (DSL extension)

Even if termination can detect legalActionCount === 0, the engine still needs a rule for what to do when:

- no termination condition matches, but

- there are no legal actions (agent cannot pick anything)

So make it explicit.

Add optional block (suggested location): turn.noLegalActions

"turn": {
  "scheduler": "round_robin",
  "phases": ["main"],
  "noLegalActions": {
    "policy": "terminate" | "pass" | "error",
    "defaultOutcome": { "type": "draw", "players": "all" },   // only used if policy=terminate AND no condition matched
    "reason": "no-legal-actions"
  }
}

Semantics by policy:

#### policy="terminate"

Evaluate termination normally (with meta available).

If termination matched → use it.

Else → terminate using defaultOutcome.

terminationReason = reason (default "no-legal-actions")

#### policy="pass"

Do not terminate purely due to legalActionCount===0.

Record a step with:

actionId = null (or a reserved "__pass__" if you prefer)

legalActionCount = 0

Advance phase/player via advanceTurnPhase.

Continue.

#### policy="error"

Throw a structured error (or terminate with terminationReason="no-legal-actions-error" depending on your error-handling philosophy).

This replaces today’s implicit behavior where the human loop can throw “No legal actions available”.

### 1.5 Versioning + backwards compatibility

We do not need backwards compatibility: we've just started implementing the app, and we haven't run any evolution yet. Replace all logic that doesn't fit this new implementation.

#### 1.6 Analytics / degeneracy adjustment (important)

Right now degeneracy flags treat any terminationReason="stalemate" as a degeneracy reject by default.

Once “no legal actions” can map to win/loss, you must avoid mislabeling those as stalemates.

Change degeneracy rule:

- Define degeneracy flag stalemate as:

(terminationReason in ["stalemate","no-legal-actions"]) AND terminalOutcome is draw-for-all

- Add optional separate flag no-legal-actions if you still want to track it irrespective of outcome (but don’t default-reject it).

## 2) Invariants that must hold

### 2.1 Simulation semantics invariants

No hidden rule-law: The engine must not force draw on legalActionCount===0 unless that outcome comes from:

an explicit turn.noLegalActions policy + defaultOutcome, or

a DSL termination condition using meta.legalActionCount/meta.hasLegalActions.

Meta correctness:

meta.legalActionCount === listLegalActions(...).length

meta.hasLegalActions === (meta.legalActionCount > 0)

Step snapshot correctness:

trajectory.steps[i].legalActionCount equals actual legal action length for that step (already a thing; must remain true). 

simulation-engine

Pass semantics (when policy=pass):

No costs/effects/triggers that are “after_action” run as if an action occurred.

Turn/phase advancement still happens exactly once per pass.

The engine must not prompt an agent for an action when there are none.

Termination reason consistency:

If terminated by a normal termination condition → terminationReason="condition" (unchanged).

If terminated because maxTurns reached → terminationReason="max-turns" (unchanged).

If terminated via no-legal-actions policy/condition → terminationReason equals configured reason ("no-legal-actions").

### 2.2 Determinism invariants

Determinism preserved: for identical seeds + definitions + agents, simulation outputs must remain deterministic.
Concretely: reordering termination/listing must not introduce RNG consumption differences (so listing legal actions must remain RNG-free; termination eval must remain RNG-free).

## 3) Tests that must pass

Below are the specific tests I’d add/update, phrased as requirements. (I’m naming them descriptively; you can map into your current test layout.)

### 3.1 Unit tests — termination meta refs

evaluateTermination supports meta.legalActionCount

Given a termination condition (meta.legalActionCount == 0) ⇒ lose(active)

When ctx.legalActionCount=0, termination matches; when >0, it does not.

meta.hasLegalActions is consistent

hasLegalActions true iff count > 0.

Schema/validation test

schema accepts { kind:"meta", id:"legalActionCount" } refs in expressions.

### 3.2 Simulation engine unit tests — no-legal-actions behavior

Legacy stalemate draw preserved (v1)

Minimal game where active player has zero legal actions at step 0

Expect: terminated, outcome draw(all), terminationReason="stalemate". 

simulation-engine

Checkmate-like loss (terminate + DSL mapping)

Same setup but definition includes termination condition:

if meta.legalActionCount == 0 ⇒ lose(active)

Expect: terminated, active loses, terminationReason="no-legal-actions" (or "condition" if you classify it as a normal condition; pick one and assert it consistently).

Forced-pass (pass policy)

Setup where player 1 has no legal actions on their turn; player 2 does.

turn.noLegalActions.policy="pass"

Expect:

engine records a step with legalActionCount=0 and actionId=null/__pass__

active player advances to next per scheduler

simulation continues (does not terminate solely due to no legal actions)

Error policy

turn.noLegalActions.policy="error"

Expect: simulation throws a typed error (or returns terminated outcome with reason "no-legal-actions-error" — whichever you choose, but test it).

### 3.3 E2E test updates (based on your documented E2E coverage)

Update test/e2e/state-transition.e2e.test.mjs expectations

Today it asserts the human prompt loop throws “No legal actions available” because the engine treats it as stalemate draw. 

e2e-coverage

New expected behavior:

for v1 fixtures: still terminates as stalemate draw (no prompting)

for error policy fixture: that is where you assert the throw

for pass policy fixture: assert auto-pass without prompting

Degeneracy classification test

A “checkmate” (no legal actions ⇒ loss) must not trip degeneracy stalemate rejection (since it’s not a draw). 

metrics-and-fitness

A v1 stalemate draw still trips stalemate degeneracy (unchanged).

Evolution pipeline determinism remains

Your E2E suite already proves determinism for seeded runs.
Add a fixture that reaches no-legal-actions under policies and ensure determinism still holds (same seed ⇒ same evaluated outputs / next-gen ids).

## Doc updates

Analyze existing architectural docs at docs/architecture/ and update them as appropriately with this new feature/correction.