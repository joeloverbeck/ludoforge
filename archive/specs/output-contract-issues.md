# Output Contract Issues

1) outcome.reason exists in E2E claims, but isn’t in the simulation output contract

Your E2E coverage doc explicitly states that max-turn cutoffs produce terminationReason="max-turns" and outcome.reason="max-turns". 

Your simulation methodology doc defines outcome as a “terminal outcome object (per-player win/lose/draw)” and lists outputs, but never mentions outcome.reason. 

That’s a contract mismatch, full stop.

2) terminated=false is referenced by metrics, but is not promised by simulation outputs

Metrics/fitness doc defines early termination rate partly using terminated=false, and degeneracy “non-terminating” similarly uses terminated=false. 

Simulation outputs don’t include any terminated field in the returned object. 

So analytics is implicitly assuming a field the simulation doc doesn’t guarantee.

Below is a clean, canonical contract that resolves both issues and prevents future drift. It’s intentionally minimal: it keeps your existing terminationReason, keeps outcome purely about per-player results, and adds one missing boolean that your metrics already want.

## 1) What to change

### A. Define one canonical SimulationResult schema (docs + code)

Add this as a normative section in simulation-engine.md (and ideally a JSON schema file later). It becomes the single source of truth.

SimulationResult (canonical):

- trajectory.steps: array of step snapshots (must include legalActionCount)

- trajectory.events: array of events

- terminationReason: enum
condition | stalemate | no-legal-actions | max-turns | max-steps | loop-detected

- terminated: boolean
Meaning: true iff the run ended in a “game-terminal” state; false iff stopped by a safety cutoff (max-turns, max-steps, loop-detected).

- terminationDetail?: optional string
For human-readable/configured reasons (e.g. turn.noLegalActions.reason). This is where “reason strings” belong.

- outcome: per-player outcome only (no reason fields)

Recommended: outcome is an array length = player count with values: win | lose | draw.

Hard rule: Remove/forbid outcome.reason. All “why it ended” data lives in terminationReason + optional terminationDetail.

This directly resolves the outcome.reason drift between E2E and simulation doc.

### B. Update e2e-coverage.md to match the canonical schema

Change the statement:

From: “max turns produce terminationReason="max-turns" and outcome.reason="max-turns".” 


To: “max turns produce terminationReason="max-turns" and terminated=false (and terminationDetail is absent).”

### C. Update metrics-and-fitness.md to explicitly consume the canonical fields

In “Trajectory Summaries”, add terminated as a guaranteed summary field (since the metrics already rely on it). 

Also tighten the metric definitions so they don’t rely on phantom fields:

Early termination rate:
terminationReason !== "condition" OR terminated === false (the terminated clause is now meaningful and guaranteed).

Non-terminating degeneracy:
terminationReason in ["max-turns","max-steps","loop-detected"] OR terminated === false.

### D. Clarify no-legal-actions “terminate” semantics

Right now your sim doc says “return default outcome with configured reason” but also claims terminationReason is from a fixed enum. 

simulation-engine


Make it explicit:

terminationReason = "no-legal-actions"

terminationDetail = turn.noLegalActions.reason (if provided)

outcome comes from turn.noLegalActions.defaultOutcome (or stalemate default if unset policy)

This preserves enum stability for analytics while still allowing custom messaging.

## 2) What variants must pass (normative behavior matrix)

Your canonical schema must hold across these termination paths:

### Condition met

terminationReason="condition"

terminated=true

outcome: per-player win/lose/draw

terminationDetail: optional (only if you choose to include which condition, otherwise omit)

### Default stalemate (no legal actions, policy unset)

terminationReason="stalemate"

terminated=true

outcome: all draws

terminationDetail: absent

### No-legal-actions policy = terminate

terminationReason="no-legal-actions"

terminated=true

outcome: as configured by defaultOutcome

terminationDetail: equals configured turn.noLegalActions.reason if present

### No-legal-actions policy = pass

Simulation does not terminate on that step

Records a pass step (actionId=null) and continues

(No special termination fields until the run actually ends)

### Max turns cutoff

terminationReason="max-turns"

terminated=false

outcome: still a valid per-player win/lose/draw (whatever your cutoff evaluation chooses)

terminationDetail: absent

### Max steps cutoff

terminationReason="max-steps"

terminated=false

outcome: valid per-player outcome

terminationDetail: absent

### Loop detected cutoff

terminationReason="loop-detected"

terminated=false

outcome: valid per-player outcome (or all draws if you standardize it—pick one and enforce it)

## 3) What tests must pass (and what must be updated)

Update these E2E expectations

Anywhere asserting outcome.reason must be rewritten to assert:

terminationReason === "max-turns"

terminated === false

and assert that outcome.reason does not exist (to prevent relapse)

This is directly required by the E2E coverage doc statement you currently have. 


Add/ensure schema conformance tests

You want cheap tests that fail loudly when contracts drift:

### SimulationResult shape test (unit)

For each termination variant above, assert:

required fields exist

terminationReason is in the enum

terminated matches the reason category

outcome is per-player only and contains no reason

### Metrics aggregation test (unit)

Feed summaries with each terminationReason and terminated combo and assert:

earlyTerminationRate increments when expected

nonTerminating degeneracy flag triggers for cutoffs

This aligns metrics’ stated logic with guaranteed fields. 

### Backstop “contract drift” test

A single snapshot test that validates a produced SimulationResult against the canonical schema (once you formalize it), so analytics can’t silently start reading new fields.

## Architectural docs stay up-to-date

Ensure architectural docs stay up-to-date (in docs/architecture/ ) regarding these changes.